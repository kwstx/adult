import prisma from "@/lib/db";
import { eventBus } from "./event-bus";
import { LeaderboardService } from "./leaderboard.service";
import {
  GiftSentPayload,
  GiftTier,
  GoalUpdatedPayload,
  ChatMessagePayload,
} from "./types";

const PLATFORM_RAKE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENTAGE || 20);

export interface ProcessGiftInput {
  fanUserId: string;
  creatorId: string;
  credits: number;
  giftId?: string;
  giftName?: string;
  giftIcon?: string;
  customMessage?: string;
  idempotencyKey?: string;
}

export interface ProcessGiftResult {
  success: boolean;
  eventId: string;
  ledgerEntryId: string;
  fanRemainingBalance: number;
  creatorCreditedAmount: number;
  platformRakeAmount: number;
  giftPayload: GiftSentPayload;
}

export class InsufficientFundsError extends Error {
  constructor(public required: number, public available: number) {
    super(`Insufficient balance: Required ${required} credits, but wallet only has ${available}.`);
    this.name = "InsufficientFundsError";
  }
}

export class GiftProcessorService {
  /**
   * Determine visual animation tier from credit magnitude.
   */
  public static resolveGiftTier(credits: number): {
    tier: GiftTier;
    animationType: "PARTICLE_BURST" | "CONFETTI_SHOWER" | "GRAND_DIAMOND_EXPLOSION" | "CUSTOM_3D";
  } {
    if (credits >= 500) {
      return {
        tier: "LEGENDARY",
        animationType: "GRAND_DIAMOND_EXPLOSION",
      };
    }
    if (credits >= 100) {
      return {
        tier: "MEDIUM",
        animationType: "CONFETTI_SHOWER",
      };
    }
    return {
      tier: "SMALL",
      animationType: "PARTICLE_BURST",
    };
  }

  /**
   * Process a live gift transaction and broadcast the single authoritative event.
   */
  public static async processLiveGift(input: ProcessGiftInput): Promise<ProcessGiftResult> {
    const {
      fanUserId,
      creatorId,
      credits,
      giftId = "gift_custom",
      giftName = "Diamond Spark",
      giftIcon = "💎",
      customMessage,
      idempotencyKey,
    } = input;

    if (credits <= 0) {
      throw new Error("Gift credit amount must be greater than zero.");
    }

    const key = idempotencyKey || `gift_${fanUserId}_${creatorId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // ------------------------------------------------------------------------
    // 1. ATOMIC BACKEND TRANSACTION
    // ------------------------------------------------------------------------
    const txResult = await prisma.$transaction(async (tx: any) => {
      // A. Check Idempotency
      const existingEntry = await tx.ledgerEntry.findUnique({
        where: { idempotencyKey: key },
      });
      if (existingEntry) {
        const fanWallet = await tx.wallet.findUnique({ where: { userId: fanUserId } });
        return {
          isDuplicate: true,
          ledgerEntry: existingEntry,
          fanBalance: fanWallet?.balance || 0,
        };
      }

      // B. Fetch Fan and Verify Balance
      const fan = await tx.user.findUnique({
        where: { id: fanUserId },
        include: { wallet: true },
      });

      if (!fan) throw new Error("Fan user account not found.");
      if (!fan.wallet || fan.wallet.balance < credits) {
        throw new InsufficientFundsError(credits, fan.wallet?.balance || 0);
      }

      // C. Fetch Creator Profile and Wallet
      const creator = await tx.creatorProfile.findUnique({
        where: { id: creatorId },
        include: { user: { include: { wallet: true } } },
      });

      if (!creator) throw new Error("Creator live stream room not found.");

      let creatorWallet = creator.user?.wallet;
      if (!creatorWallet) {
        creatorWallet = await tx.wallet.create({
          data: { userId: creator.userId, balance: 0 },
        });
      }

      // D. Calculate Financial Distribution
      const rakeRate = PLATFORM_RAKE_PERCENT / 100;
      const platformRake = Math.floor(credits * rakeRate);
      const creatorNet = credits - platformRake;

      // E. Atomic Debit and Credit
      const updatedFanWallet = await tx.wallet.update({
        where: { id: fan.wallet.id },
        data: { balance: { decrement: credits } },
      });

      await tx.wallet.update({
        where: { id: creatorWallet.id },
        data: { balance: { increment: creatorNet } },
      });

      // F. Update Goal Progress
      const newGoalProgress = creator.currentGoalProgress + credits;
      const updatedCreator = await tx.creatorProfile.update({
        where: { id: creatorId },
        data: { currentGoalProgress: newGoalProgress },
      });

      // G. Update Active Live Session Metrics if active
      const activeSession = await tx.liveSession.findFirst({
        where: { creatorId, status: "ACTIVE" },
        orderBy: { startedAt: "desc" },
      });

      let updatedSessionEarnings = credits;
      if (activeSession) {
        const session = await tx.liveSession.update({
          where: { id: activeSession.id },
          data: { totalCreditsEarned: { increment: credits } },
        });
        updatedSessionEarnings = session.totalCreditsEarned;
      }

      // H. Create Immutable Double-Entry Ledger Record
      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          transactionType: "LIVE_TIP",
          amount: credits,
          sourceWalletId: fan.wallet.id,
          destinationWalletId: creatorWallet.id,
          platformRakeCredits: platformRake,
          netCreatorCredits: creatorNet,
          status: "COMPLETED",
          idempotencyKey: key,
          referenceId: giftId,
          note: `Live Gift: ${giftName} (${credits} credits) from ${fan.displayName}`,
        },
      });

      // I. Write Chat Message Tip Notice
      const chatMsg = await tx.chatMessage.create({
        data: {
          creatorId,
          senderId: fan.id,
          senderName: fan.displayName,
          senderRole: fan.role || "FAN",
          senderBadge: credits >= 500 ? "TOP_TIPPER" : credits >= 100 ? "VIP" : null,
          text: customMessage || `sent ${giftName} (${credits} tokens)! ${giftIcon}`,
          isTipNotice: true,
          tipAmount: credits,
          tipActionName: giftName,
        },
      });

      return {
        isDuplicate: false,
        fan,
        creator: updatedCreator,
        ledgerEntry,
        chatMsg,
        fanBalance: updatedFanWallet.balance,
        creatorNet,
        platformRake,
        newGoalProgress,
        goalTarget: creator.currentGoalTarget,
        goalTitle: creator.currentGoalTitle,
        totalSessionCredits: updatedSessionEarnings,
      };
    });

    if (txResult.isDuplicate) {
      return {
        success: true,
        eventId: txResult.ledgerEntry.id,
        ledgerEntryId: txResult.ledgerEntry.id,
        fanRemainingBalance: txResult.fanBalance,
        creatorCreditedAmount: txResult.ledgerEntry.netCreatorCredits,
        platformRakeAmount: txResult.ledgerEntry.platformRakeCredits,
        giftPayload: null as any,
      };
    }

    // ------------------------------------------------------------------------
    // 2. LEADERBOARD RE-CALCULATION
    // ------------------------------------------------------------------------
    const topContributors = await LeaderboardService.recordContribution({
      creatorId,
      userId: txResult.fan.id,
      username: txResult.fan.username,
      displayName: txResult.fan.displayName,
      avatarUrl: txResult.fan.avatarUrl,
      badge: credits >= 500 ? "TOP_TIPPER" : "VIP",
      credits,
    });

    // ------------------------------------------------------------------------
    // 3. BUILD AUTHORITATIVE GIFT_SENT EVENT PAYLOAD
    // ------------------------------------------------------------------------
    const { tier, animationType } = this.resolveGiftTier(credits);
    const goalTarget = txResult.goalTarget || 1;
    const goalProgress = txResult.newGoalProgress ?? 0;
    const percentage = Math.min(100, Math.round((goalProgress / goalTarget) * 100));
    const isCompleted = goalProgress >= goalTarget;

    const eventPayload: GiftSentPayload = {
      eventId: `evt_${txResult.ledgerEntry.id}`,
      creatorId,
      sender: {
        userId: txResult.fan.id,
        username: txResult.fan.username,
        displayName: txResult.fan.displayName,
        avatarUrl: txResult.fan.avatarUrl,
        badge: credits >= 500 ? "👑 Top Tipper" : credits >= 100 ? "💎 VIP" : "⭐ Supporter",
        fanLevel: Math.max(1, Math.floor(Math.sqrt(credits / 25)) + 1),
      },
      gift: {
        id: giftId,
        name: giftName,
        icon: giftIcon,
        creditAmount: credits,
        tier,
        animationType,
        customMessage,
      },
      updatedGoal: {
        title: txResult.goalTitle ?? "Stream Goal",
        target: goalTarget,
        progress: goalProgress,
        percentage,
        isCompleted,
      },
      updatedLeaderboard: topContributors,
      creatorEarningsDelta: {
        grossCredits: credits,
        netCredits: txResult.creatorNet ?? (credits - Math.floor(credits * (PLATFORM_RAKE_PERCENT / 100))),
        platformRakeCredits: txResult.platformRake ?? Math.floor(credits * (PLATFORM_RAKE_PERCENT / 100)),
        totalSessionCredits: txResult.totalSessionCredits ?? credits,
      },
      sentAt: new Date().toISOString(),
    };

    // ------------------------------------------------------------------------
    // 4. BROADCAST AUTHORITATIVE EVENT TO ALL 2,000+ VIEWERS
    // ------------------------------------------------------------------------
    eventBus.publish(`room:${creatorId}`, {
      type: "GIFT_SENT",
      payload: eventPayload,
    });

    // Also publish synchronized sub-events for specialized lightweight listeners
    const goalPayload: GoalUpdatedPayload = {
      creatorId,
      title: txResult.goalTitle ?? "Stream Goal",
      target: goalTarget,
      progress: goalProgress,
      percentage,
      remaining: Math.max(0, goalTarget - goalProgress),
      isCompleted,
      milestoneTriggered: isCompleted ? "GOAL_REACHED" : undefined,
    };
    eventBus.publish(`room:${creatorId}`, {
      type: "GOAL_UPDATED",
      payload: goalPayload,
    });

    const chatPayload: ChatMessagePayload = {
      id: txResult.chatMsg.id,
      creatorId,
      senderId: txResult.fan.id,
      senderName: txResult.fan.displayName,
      senderRole: txResult.fan.role || "FAN",
      senderBadge: credits >= 500 ? "TOP_TIPPER" : credits >= 100 ? "VIP" : null,
      text: txResult.chatMsg.text,
      isTipNotice: true,
      tipAmount: credits,
      tipActionName: giftName,
      createdAt: txResult.chatMsg.createdAt,
    };
    eventBus.publish(`room:${creatorId}`, {
      type: "NEW_MESSAGE",
      payload: chatPayload,
    });

    return {
      success: true,
      eventId: eventPayload.eventId,
      ledgerEntryId: txResult.ledgerEntry.id,
      fanRemainingBalance: txResult.fanBalance,
      creatorCreditedAmount: txResult.creatorNet ?? (credits - Math.floor(credits * (PLATFORM_RAKE_PERCENT / 100))),
      platformRakeAmount: txResult.platformRake ?? Math.floor(credits * (PLATFORM_RAKE_PERCENT / 100)),
      giftPayload: eventPayload,
    };
  }
}
