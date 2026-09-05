import prisma from "@/lib/db";
import { SendTipInput, TransferResult } from "./types";
import { eventBus } from "@/modules/realtime/event-bus";

const PLATFORM_RAKE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENTAGE || 20);

export class InsufficientCreditsError extends Error {
  constructor(public required: number, public available: number) {
    super(`Insufficient balance: Required ${required} credits, but wallet only has ${available}.`);
    this.name = "InsufficientCreditsError";
  }
}

export class LedgerService {
  /**
   * Ensure a user has an active wallet. If not, auto-create one.
   */
  static async getOrCreateWallet(userId: string) {
    const existing = await prisma.wallet.findUnique({ where: { userId } });
    if (existing) return existing;

    return await prisma.wallet.create({
      data: {
        userId,
        balance: 0,
        lockedBalance: 0,
      },
    });
  }

  /**
   * Direct Credit Purchase / Mint (from high-risk payment gateway webhook).
   * Backend-authoritative: only webhook or verified backend handler can mint credits.
   */
  static async creditUserWalletFromPurchase(params: {
    userId: string;
    creditsAmount: number;
    paymentReference: string;
    idempotencyKey: string;
  }) {
    const { userId, creditsAmount, paymentReference, idempotencyKey } = params;

    return await prisma.$transaction(async (tx: any) => {
      // Check idempotency
      const existing = await tx.ledgerEntry.findUnique({
        where: { idempotencyKey },
      });
      if (existing) return existing;

      // Ensure wallet
      let wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) {
        wallet = await tx.wallet.create({
          data: { userId, balance: 0 },
        });
      }

      // Increment balance
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: creditsAmount } },
      });

      // Write immutable ledger entry
      const entry = await tx.ledgerEntry.create({
        data: {
          transactionType: "CREDIT_PURCHASE",
          amount: creditsAmount,
          destinationWalletId: wallet.id,
          status: "COMPLETED",
          idempotencyKey,
          referenceId: paymentReference,
          note: `Purchased package of ${creditsAmount} credits (Ref: ${paymentReference})`,
        },
      });

      return { entry, updatedWallet };
    });
  }

  /**
   * Process a live tip with item interaction.
   * Atomically debits fan wallet, credits creator wallet (minus rake),
   * creates ledger records, updates stream goal progress, and emits real-time event.
   */
  static async processLiveTip(input: SendTipInput): Promise<TransferResult> {
    const { fanUserId, creatorId, credits, menuItemId, customMessage, idempotencyKey } = input;

    if (credits <= 0) {
      throw new Error("Tip amount must be greater than zero credits.");
    }

    const key = idempotencyKey || `tip_${fanUserId}_${creatorId}_${Date.now()}_${Math.random()}`;

    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Check idempotency
      const existingEntry = await tx.ledgerEntry.findUnique({
        where: { idempotencyKey: key },
      });
      if (existingEntry) {
        const fanWallet = await tx.wallet.findUnique({ where: { userId: fanUserId } });
        return {
          success: true,
          ledgerEntryId: existingEntry.id,
          fanRemainingBalance: fanWallet?.balance || 0,
          creatorCreditedAmount: existingEntry.netCreatorCredits,
          platformRakeAmount: existingEntry.platformRakeCredits,
          timestamp: existingEntry.createdAt,
        };
      }

      // 2. Fetch Fan and Fan's Wallet with balance check
      const fanWallet = await tx.wallet.findUnique({ where: { userId: fanUserId } });
      if (!fanWallet || fanWallet.balance < credits) {
        throw new InsufficientCreditsError(credits, fanWallet?.balance || 0);
      }

      // 3. Fetch Creator Profile and Creator Wallet
      const creatorProfile = await tx.creatorProfile.findUnique({
        where: { id: creatorId },
        include: { user: true },
      });

      if (!creatorProfile) {
        throw new Error("Creator profile not found.");
      }

      let creatorWallet = await tx.wallet.findUnique({
        where: { userId: creatorProfile.userId },
      });

      if (!creatorWallet) {
        creatorWallet = await tx.wallet.create({
          data: { userId: creatorProfile.userId, balance: 0 },
        });
      }

      // 4. Calculate Platform Rake & Creator Net
      const rakePercent = PLATFORM_RAKE_PERCENT / 100;
      const platformRake = Math.floor(credits * rakePercent);
      const creatorNet = credits - platformRake;

      // 5. Debit Fan Wallet
      const updatedFanWallet = await tx.wallet.update({
        where: { id: fanWallet.id },
        data: { balance: { decrement: credits } },
      });

      // 6. Credit Creator Wallet
      await tx.wallet.update({
        where: { id: creatorWallet.id },
        data: { balance: { increment: creatorNet } },
      });

      // 7. Check menu item info
      let actionTitle: string | undefined;
      if (menuItemId) {
        const item = await tx.interactionMenuItem.findUnique({
          where: { id: menuItemId },
        });
        if (item) actionTitle = item.title;
      }

      // 8. Update Creator Live Stream Goal Progress
      const newGoalProgress = creatorProfile.currentGoalProgress + credits;
      await tx.creatorProfile.update({
        where: { id: creatorId },
        data: { currentGoalProgress: newGoalProgress },
      });

      // 9. Create Immutable Ledger Entry
      const entry = await tx.ledgerEntry.create({
        data: {
          transactionType: "LIVE_TIP",
          amount: credits,
          sourceWalletId: fanWallet.id,
          destinationWalletId: creatorWallet.id,
          platformRakeCredits: platformRake,
          netCreatorCredits: creatorNet,
          status: "COMPLETED",
          idempotencyKey: key,
          referenceId: menuItemId || "custom_tip",
          note: actionTitle ? `Tip for interaction: ${actionTitle}` : customMessage || "Live Stream Tip",
        },
      });

      // 10. Record Chat Message Tip Announcement
      const fanUser = await tx.user.findUnique({ where: { id: fanUserId } });
      const chatMsg = await tx.chatMessage.create({
        data: {
          creatorId,
          senderId: fanUserId,
          senderName: fanUser?.displayName || "Anonymous Fan",
          senderRole: fanUser?.role || "FAN",
          senderBadge: credits >= 500 ? "TOP_TIPPER" : "VIP",
          text: customMessage || `sent ${credits} tokens! ${actionTitle ? `[${actionTitle}]` : "🎉"}`,
          isTipNotice: true,
          tipAmount: credits,
          tipActionName: actionTitle,
        },
      });

      return {
        entry,
        chatMsg,
        fanRemainingBalance: updatedFanWallet.balance,
        creatorCreditedAmount: creatorNet,
        platformRakeAmount: platformRake,
        newGoalProgress,
        goalTarget: creatorProfile.currentGoalTarget,
        senderName: fanUser?.displayName || "Fan",
        actionTitle,
      };
    });

    // 11. Dispatch Real-Time Events (Outside DB transaction to avoid holding locks)
    eventBus.publish(`room:${creatorId}`, {
      type: "TIP_EVENT",
      payload: {
        tipId: result.entry.id,
        senderName: result.senderName,
        senderId: fanUserId,
        credits,
        actionTitle: result.actionTitle,
        customMessage,
        newGoalProgress: result.newGoalProgress,
        goalTarget: result.goalTarget,
        createdAt: result.entry.createdAt,
      },
    });

    eventBus.publish(`room:${creatorId}`, {
      type: "CHAT_MESSAGE",
      payload: result.chatMsg,
    });

    return {
      success: true,
      ledgerEntryId: result.entry.id,
      fanRemainingBalance: result.fanRemainingBalance,
      creatorCreditedAmount: result.creatorCreditedAmount,
      platformRakeAmount: result.platformRakeAmount,
      timestamp: result.entry.createdAt,
    };
  }

  /**
   * Unlock Pay-Per-View Content with atomic credit deduction.
   */
  static async unlockPPVContent(fanUserId: string, ppvContentId: string): Promise<TransferResult> {
    return await prisma.$transaction(async (tx: any) => {
      // Check if already purchased
      const existingPurchase = await tx.ppVPurchase.findUnique({
        where: {
          fanId_ppvContentId: {
            fanId: fanUserId,
            ppvContentId,
          },
        },
      });

      if (existingPurchase) {
        const fanWallet = await tx.wallet.findUnique({ where: { userId: fanUserId } });
        return {
          success: true,
          ledgerEntryId: existingPurchase.transactionId,
          fanRemainingBalance: fanWallet?.balance || 0,
          creatorCreditedAmount: 0,
          platformRakeAmount: 0,
          timestamp: existingPurchase.createdAt,
        };
      }

      // Fetch Content & Creator
      const content = await tx.pPVContent.findUnique({
        where: { id: ppvContentId },
        include: { creator: true },
      });

      if (!content) throw new Error("PPV Content not found.");

      const credits = content.creditPrice;

      // Balance check
      const fanWallet = await tx.wallet.findUnique({ where: { userId: fanUserId } });
      if (!fanWallet || fanWallet.balance < credits) {
        throw new InsufficientCreditsError(credits, fanWallet?.balance || 0);
      }

      let creatorWallet = await tx.wallet.findUnique({
        where: { userId: content.creator.userId },
      });

      if (!creatorWallet) {
        creatorWallet = await tx.wallet.create({
          data: { userId: content.creator.userId, balance: 0 },
        });
      }

      const platformRake = Math.floor(credits * (PLATFORM_RAKE_PERCENT / 100));
      const creatorNet = credits - platformRake;

      // Debit & Credit
      const updatedFanWallet = await tx.wallet.update({
        where: { id: fanWallet.id },
        data: { balance: { decrement: credits } },
      });

      await tx.wallet.update({
        where: { id: creatorWallet.id },
        data: { balance: { increment: creatorNet } },
      });

      const key = `ppv_${fanUserId}_${ppvContentId}_${Date.now()}`;

      const entry = await tx.ledgerEntry.create({
        data: {
          transactionType: "PPV_UNLOCK",
          amount: credits,
          sourceWalletId: fanWallet.id,
          destinationWalletId: creatorWallet.id,
          platformRakeCredits: platformRake,
          netCreatorCredits: creatorNet,
          status: "COMPLETED",
          idempotencyKey: key,
          referenceId: ppvContentId,
          note: `Unlocked PPV: ${content.title}`,
        },
      });

      await tx.ppVPurchase.create({
        data: {
          fanId: fanUserId,
          ppvContentId,
          creditsPaid: credits,
          transactionId: entry.id,
        },
      });

      return {
        success: true,
        ledgerEntryId: entry.id,
        fanRemainingBalance: updatedFanWallet.balance,
        creatorCreditedAmount: creatorNet,
        platformRakeAmount: platformRake,
        timestamp: entry.createdAt,
      };
    });
  }

  /**
   * Request Creator Payout. Locks creator balance until administrative batch wire or crypto settlement.
   */
  static async requestCreatorPayout(creatorUserId: string, amountCredits: number) {
    return await prisma.$transaction(async (tx: any) => {
      const wallet = await tx.wallet.findUnique({ where: { userId: creatorUserId } });
      if (!wallet || wallet.balance < amountCredits) {
        throw new InsufficientCreditsError(amountCredits, wallet?.balance || 0);
      }

      // Deduct from balance, add to lockedBalance
      const updated = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: amountCredits },
          lockedBalance: { increment: amountCredits },
        },
      });

      const entry = await tx.ledgerEntry.create({
        data: {
          transactionType: "CREATOR_PAYOUT",
          amount: amountCredits,
          sourceWalletId: wallet.id,
          status: "PENDING",
          idempotencyKey: `payout_${creatorUserId}_${Date.now()}`,
          note: `Creator Payout requested: ${amountCredits} credits (equivalent to $${(amountCredits * 0.08).toFixed(2)})`,
        },
      });

      return { entry, updated };
    });
  }
}
