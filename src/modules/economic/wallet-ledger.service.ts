import prisma from "@/lib/db";
import {
  ProcessDepositInput,
  ProcessLiveTipInput,
  ProcessPaidQuestionInput,
  ProcessPPVPurchaseInput,
  ProcessProductPurchaseInput,
  ProcessRefundInput,
  ProcessChargebackInput,
  RequestPayoutInput,
  LedgerOperationResult,
  TransactionForensicReport,
  WalletStatement,
  WalletStatementItem,
  WalletReconciliationResult,
} from "./types";
import { eventBus } from "@/modules/realtime/event-bus";

const DEFAULT_PLATFORM_RAKE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENTAGE || 20);

// ============================================================================
// CUSTOM FINANCIAL EXCEPTIONS
// ============================================================================

export class InsufficientFundsError extends Error {
  constructor(public requiredCredits: number, public availableCredits: number) {
    super(
      `Insufficient funds: Transaction requires ${requiredCredits} credits, but wallet only has ${availableCredits} available.`
    );
    this.name = "InsufficientFundsError";
  }
}

export class WalletSuspendedError extends Error {
  constructor(public walletId: string, public status: string) {
    super(`Wallet ${walletId} is locked or suspended (${status}). Financial operations are blocked.`);
    this.name = "WalletSuspendedError";
  }
}

export class TransactionNotFoundError extends Error {
  constructor(public identifier: string) {
    super(`Ledger transaction not found for: ${identifier}`);
    this.name = "TransactionNotFoundError";
  }
}

export class DuplicateTransactionError extends Error {
  constructor(public idempotencyKey: string) {
    super(`Transaction with idempotency key "${idempotencyKey}" has already been processed.`);
    this.name = "DuplicateTransactionError";
  }
}

// ============================================================================
// AUTHORITATIVE FINANCIAL LEDGER SERVICE
// ============================================================================

export class WalletLedgerService {
  /**
   * Retrieves or auto-initializes a wallet with 0 balance for a given user.
   */
  static async getOrCreateWallet(userId: string, tx?: any) {
    const db = tx || prisma;
    const existing = await db.wallet.findUnique({ where: { userId } });
    if (existing) return existing;

    return await db.wallet.create({
      data: {
        userId,
        balance: 0,
        lockedBalance: 0,
        pendingBalance: 0,
        lifetimeDepositedCredits: BigInt(0),
        lifetimeEarnedCredits: BigInt(0),
        lifetimeSpentCredits: BigInt(0),
        lifetimeWithdrawnCredits: BigInt(0),
        status: "ACTIVE",
        version: 1,
      },
    });
  }

  /**
   * Asserts that a wallet exists, is active, and has sufficient credits.
   */
  private static validateWalletUsability(wallet: any, requiredCredits: number = 0) {
    if (!wallet) {
      throw new Error("Wallet not found.");
    }
    if (wallet.status !== "ACTIVE") {
      throw new WalletSuspendedError(wallet.id, wallet.status);
    }
    if (requiredCredits > 0 && wallet.balance < requiredCredits) {
      throw new InsufficientFundsError(requiredCredits, wallet.balance);
    }
  }

  // ============================================================================
  // 1. CREDIT PURCHASE / FIAT DEPOSIT (e.g. €10 -> +1,000 CREDITS)
  // ============================================================================

  /**
   * Processes a confirmed fiat deposit webhook from a payment gateway.
   * Atomically:
   * 1. Records/updates `PaymentTransaction` with fiat details (€/$)
   * 2. Mints credit transaction to user's wallet
   * 3. Records immutable `WalletTransaction` (type: DEPOSIT, direction: CREDIT)
   * 4. Updates running balance before/after
   */
  static async processDeposit(input: ProcessDepositInput): Promise<LedgerOperationResult> {
    const {
      userId,
      amountFiatCents,
      currency = "EUR",
      creditsPurchased,
      bonusCredits = 0,
      gateway = "CCBILL",
      gatewayTransactionId,
      gatewayEventId,
      paymentMethod = "CARD",
      idempotencyKey,
      ipAddress,
      countryCode,
      metadata = {},
    } = input;

    const totalCreditsToMint = creditsPurchased + bonusCredits;
    if (totalCreditsToMint <= 0) {
      throw new Error("Total credits to mint must be greater than zero.");
    }

    return await prisma.$transaction(async (tx: any) => {
      // 1. Check idempotency on ledger
      const existingTx = await tx.walletTransaction.findUnique({
        where: { idempotencyKey },
      });
      if (existingTx) {
        const wallet = await tx.wallet.findUnique({ where: { id: existingTx.destinationWalletId } });
        return {
          success: true,
          transactionId: existingTx.id,
          idempotencyKey: existingTx.idempotencyKey,
          transactionType: existingTx.transactionType,
          destinationWalletId: existingTx.destinationWalletId,
          amountCredits: existingTx.amountCredits,
          platformFeeCredits: 0,
          creatorNetCredits: 0,
          destBalanceBefore: existingTx.destBalanceBefore,
          destBalanceAfter: existingTx.destBalanceAfter,
          fanRemainingBalance: wallet?.balance || 0,
          timestamp: existingTx.createdAt,
        };
      }

      // 2. Fetch or create user wallet
      const wallet = await WalletLedgerService.getOrCreateWallet(userId, tx);
      if (wallet.status === "SUSPENDED_CHARGEBACK") {
        throw new WalletSuspendedError(wallet.id, wallet.status);
      }

      const balanceBefore = wallet.balance;
      const balanceAfter = balanceBefore + totalCreditsToMint;

      // 3. Record PaymentTransaction (Fiat Record)
      const paymentTx = await tx.paymentTransaction.upsert({
        where: { idempotencyKey },
        create: {
          userId,
          walletId: wallet.id,
          paymentGateway: gateway,
          gatewayTransactionId: gatewayTransactionId || `gw_sim_${Date.now()}`,
          gatewayEventId,
          idempotencyKey,
          amountFiatCents,
          currency,
          creditsPurchased,
          bonusCredits,
          paymentMethod,
          status: "SUCCEEDED",
          ipAddress,
          countryCode,
          rawGatewayPayload: JSON.stringify(metadata),
        },
        update: {
          status: "SUCCEEDED",
        },
      });

      // 4. Update Wallet Balance atomically
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: totalCreditsToMint },
          lifetimeDepositedCredits: { increment: BigInt(totalCreditsToMint) },
          version: { increment: 1 },
        },
      });

      // 5. Write Immutable Ledger Entry
      const ledgerEntry = await tx.walletTransaction.create({
        data: {
          sourceWalletId: null,
          destinationWalletId: wallet.id,
          transactionType: "DEPOSIT",
          direction: "CREDIT",
          amountCredits: totalCreditsToMint,
          platformFeeCredits: 0,
          creatorNetCredits: 0,
          destBalanceBefore: balanceBefore,
          destBalanceAfter: balanceAfter,
          idempotencyKey,
          referenceType: "PAYMENT_TRANSACTION",
          referenceId: paymentTx.id,
          status: "COMPLETED",
          note: `Credit Purchase: +${totalCreditsToMint} credits (${(amountFiatCents / 100).toFixed(2)} ${currency})`,
          metadataJson: JSON.stringify({
            gateway,
            gatewayTransactionId: paymentTx.gatewayTransactionId,
            currency,
            amountFiatCents,
            bonusCredits,
            ...metadata,
          }),
        },
      });

      return {
        success: true,
        transactionId: ledgerEntry.id,
        idempotencyKey: ledgerEntry.idempotencyKey,
        transactionType: "DEPOSIT",
        destinationWalletId: wallet.id,
        amountCredits: totalCreditsToMint,
        platformFeeCredits: 0,
        creatorNetCredits: 0,
        destBalanceBefore: balanceBefore,
        destBalanceAfter: balanceAfter,
        fanRemainingBalance: updatedWallet.balance,
        timestamp: ledgerEntry.createdAt,
        metadata: {
          paymentTransactionId: paymentTx.id,
          gatewayTransactionId: paymentTx.gatewayTransactionId,
        },
      };
    });
  }

  // ============================================================================
  // 2. GIFT / LIVE TIP (e.g. Fan -300 -> Creator +240, Platform +60)
  // ============================================================================

  /**
   * Processes a live gift or tip from fan to creator.
   * Atomically:
   * 1. Checks fan balance >= credits
   * 2. Calculates platform rake (e.g. 20%) and creator net (80%)
   * 3. Debits fan wallet, credits creator wallet
   * 4. Records `CreatorEarning` for creator payout clearance
   * 5. Writes immutable `WalletTransaction` (type: LIVE_TIP, direction: TRANSFER)
   */
  static async processLiveTip(input: ProcessLiveTipInput): Promise<LedgerOperationResult> {
    const {
      fanUserId,
      creatorProfileId,
      credits,
      livestreamId,
      interactionDefinitionId,
      menuItemId,
      customMessage,
      idempotencyKey = `tip_${fanUserId}_${creatorProfileId}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    } = input;

    if (credits <= 0) {
      throw new Error("Tip credits must be greater than zero.");
    }

    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Check idempotency
      const existingTx = await tx.walletTransaction.findUnique({
        where: { idempotencyKey },
      });
      if (existingTx) {
        const fanWallet = await tx.wallet.findUnique({ where: { userId: fanUserId } });
        return {
          success: true,
          transactionId: existingTx.id,
          idempotencyKey: existingTx.idempotencyKey,
          transactionType: existingTx.transactionType,
          sourceWalletId: existingTx.sourceWalletId,
          destinationWalletId: existingTx.destinationWalletId,
          amountCredits: existingTx.amountCredits,
          platformFeeCredits: existingTx.platformFeeCredits,
          creatorNetCredits: existingTx.creatorNetCredits,
          sourceBalanceBefore: existingTx.sourceBalanceBefore,
          sourceBalanceAfter: existingTx.sourceBalanceAfter,
          destBalanceBefore: existingTx.destBalanceBefore,
          destBalanceAfter: existingTx.destBalanceAfter,
          fanRemainingBalance: fanWallet?.balance || 0,
          timestamp: existingTx.createdAt,
        };
      }

      // 2. Fetch and Validate Fan Wallet
      const fanWallet = await tx.wallet.findUnique({ where: { userId: fanUserId } });
      WalletLedgerService.validateWalletUsability(fanWallet, credits);

      // 3. Fetch Creator Profile and Creator Wallet
      const creatorProfile = await tx.creatorProfile.findUnique({
        where: { id: creatorProfileId },
        include: { user: true },
      });

      if (!creatorProfile) {
        throw new Error(`Creator profile ${creatorProfileId} not found.`);
      }

      const creatorWallet = await WalletLedgerService.getOrCreateWallet(creatorProfile.userId, tx);
      if (creatorWallet.status !== "ACTIVE") {
        throw new WalletSuspendedError(creatorWallet.id, creatorWallet.status);
      }

      // 4. Calculate Rake & Creator Net
      const rakePercent = DEFAULT_PLATFORM_RAKE_PERCENT;
      const platformFee = Math.floor(credits * (rakePercent / 100));
      const creatorNet = credits - platformFee;

      const fanBalanceBefore = fanWallet.balance;
      const fanBalanceAfter = fanBalanceBefore - credits;
      const creatorBalanceBefore = creatorWallet.balance;
      const creatorBalanceAfter = creatorBalanceBefore + creatorNet;

      // 5. Atomic Balance Updates
      const updatedFanWallet = await tx.wallet.update({
        where: { id: fanWallet.id },
        data: {
          balance: { decrement: credits },
          lifetimeSpentCredits: { increment: BigInt(credits) },
          version: { increment: 1 },
        },
      });

      const updatedCreatorWallet = await tx.wallet.update({
        where: { id: creatorWallet.id },
        data: {
          balance: { increment: creatorNet },
          lifetimeEarnedCredits: { increment: BigInt(creatorNet) },
          version: { increment: 1 },
        },
      });

      // Update Creator Profile stats
      await tx.creatorProfile.update({
        where: { id: creatorProfile.id },
        data: {
          totalEarnedCredits: { increment: BigInt(creatorNet) },
        },
      });

      // 6. Write Immutable Ledger Entry
      const ledgerEntry = await tx.walletTransaction.create({
        data: {
          sourceWalletId: fanWallet.id,
          destinationWalletId: creatorWallet.id,
          transactionType: "LIVE_TIP",
          direction: "TRANSFER",
          amountCredits: credits,
          platformFeeCredits: platformFee,
          creatorNetCredits: creatorNet,
          sourceBalanceBefore: fanBalanceBefore,
          sourceBalanceAfter: fanBalanceAfter,
          destBalanceBefore: creatorBalanceBefore,
          destBalanceAfter: creatorBalanceAfter,
          idempotencyKey,
          referenceType: livestreamId ? "LIVESTREAM" : "DIRECT_CREATOR_TIP",
          referenceId: livestreamId || creatorProfile.id,
          status: "COMPLETED",
          note: customMessage ? `Gift: ${customMessage}` : `Live Gift to ${creatorProfile.user.displayName}`,
          metadataJson: JSON.stringify({
            fanUserId,
            creatorProfileId: creatorProfile.id,
            livestreamId,
            interactionDefinitionId: interactionDefinitionId || menuItemId,
            customMessage,
            rakePercentage: rakePercent,
          }),
        },
      });

      // 7. Write Creator Earning Record
      const creatorEarning = await tx.creatorEarning.create({
        data: {
          creatorProfileId: creatorProfile.id,
          walletTransactionId: ledgerEntry.id,
          earningSource: "LIVE_TIP",
          sourceReferenceId: livestreamId || ledgerEntry.id,
          grossCredits: credits,
          platformRakePercentage: rakePercent / 100,
          platformFeeCredits: platformFee,
          netCreatorCredits: creatorNet,
          fiatValueEstimatedCents: Math.round(creatorNet * 0.08 * 100),
          clearanceStatus: "CLEARED",
        },
      });

      return {
        success: true,
        transactionId: ledgerEntry.id,
        idempotencyKey: ledgerEntry.idempotencyKey,
        transactionType: "LIVE_TIP",
        sourceWalletId: fanWallet.id,
        destinationWalletId: creatorWallet.id,
        amountCredits: credits,
        platformFeeCredits: platformFee,
        creatorNetCredits: creatorNet,
        sourceBalanceBefore: fanBalanceBefore,
        sourceBalanceAfter: fanBalanceAfter,
        destBalanceBefore: creatorBalanceBefore,
        destBalanceAfter: creatorBalanceAfter,
        fanRemainingBalance: updatedFanWallet.balance,
        creatorRemainingBalance: updatedCreatorWallet.balance,
        timestamp: ledgerEntry.createdAt,
        metadata: {
          creatorEarningId: creatorEarning.id,
          creatorDisplayName: creatorProfile.user.displayName,
        },
      };
    });

    // 8. Publish Real-time Broadcast Event (outside DB transaction)
    eventBus.publish(`room:${creatorProfileId}`, {
      type: "TIP_EVENT",
      payload: {
        transactionId: result.transactionId,
        fanUserId,
        credits,
        customMessage,
        createdAt: result.timestamp,
      },
    });

    return result;
  }

  // ============================================================================
  // 3. PAID QUESTION / INTERACTION FEE (e.g. Fan -100 -> Creator +80, Platform +20)
  // ============================================================================

  /**
   * Processes a paid question or interactive item request.
   * Atomically debits fan, credits creator, logs interaction purchase & earnings.
   */
  static async processPaidQuestion(input: ProcessPaidQuestionInput): Promise<LedgerOperationResult> {
    const {
      fanUserId,
      creatorProfileId,
      credits,
      questionText,
      interactionDefinitionId,
      livestreamId,
      idempotencyKey = `q_${fanUserId}_${creatorProfileId}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    } = input;

    if (credits <= 0) {
      throw new Error("Paid question credits must be greater than zero.");
    }

    return await prisma.$transaction(async (tx: any) => {
      // 1. Idempotency
      const existingTx = await tx.walletTransaction.findUnique({ where: { idempotencyKey } });
      if (existingTx) {
        const fanWallet = await tx.wallet.findUnique({ where: { userId: fanUserId } });
        return {
          success: true,
          transactionId: existingTx.id,
          idempotencyKey: existingTx.idempotencyKey,
          transactionType: existingTx.transactionType,
          amountCredits: existingTx.amountCredits,
          platformFeeCredits: existingTx.platformFeeCredits,
          creatorNetCredits: existingTx.creatorNetCredits,
          fanRemainingBalance: fanWallet?.balance || 0,
          timestamp: existingTx.createdAt,
        };
      }

      // 2. Validate Fan Wallet
      const fanWallet = await tx.wallet.findUnique({ where: { userId: fanUserId } });
      WalletLedgerService.validateWalletUsability(fanWallet, credits);

      // 3. Validate Creator & Creator Wallet
      const creatorProfile = await tx.creatorProfile.findUnique({
        where: { id: creatorProfileId },
        include: { user: true },
      });
      if (!creatorProfile) {
        throw new Error(`Creator profile ${creatorProfileId} not found.`);
      }

      const creatorWallet = await WalletLedgerService.getOrCreateWallet(creatorProfile.userId, tx);
      WalletLedgerService.validateWalletUsability(creatorWallet, 0);

      // 4. Calculations
      const platformFee = Math.floor(credits * (DEFAULT_PLATFORM_RAKE_PERCENT / 100));
      const creatorNet = credits - platformFee;

      const fanBalanceBefore = fanWallet.balance;
      const fanBalanceAfter = fanBalanceBefore - credits;
      const creatorBalanceBefore = creatorWallet.balance;
      const creatorBalanceAfter = creatorBalanceBefore + creatorNet;

      // 5. Debit / Credit Wallets
      const updatedFanWallet = await tx.wallet.update({
        where: { id: fanWallet.id },
        data: {
          balance: { decrement: credits },
          lifetimeSpentCredits: { increment: BigInt(credits) },
          version: { increment: 1 },
        },
      });

      const updatedCreatorWallet = await tx.wallet.update({
        where: { id: creatorWallet.id },
        data: {
          balance: { increment: creatorNet },
          lifetimeEarnedCredits: { increment: BigInt(creatorNet) },
          version: { increment: 1 },
        },
      });

      // 6. Record Interaction Purchase
      let purchaseRecord: any = null;
      if (interactionDefinitionId) {
        purchaseRecord = await tx.interactionPurchase.create({
          data: {
            livestreamId,
            creatorProfileId: creatorProfile.id,
            fanId: fanUserId,
            interactionDefinitionId,
            priceCreditsPaid: credits,
            customMessage: questionText,
            status: "PAID",
          },
        });
      }

      // 7. Write Ledger Transaction
      const ledgerEntry = await tx.walletTransaction.create({
        data: {
          sourceWalletId: fanWallet.id,
          destinationWalletId: creatorWallet.id,
          transactionType: "INTERACTION_FEE",
          direction: "TRANSFER",
          amountCredits: credits,
          platformFeeCredits: platformFee,
          creatorNetCredits: creatorNet,
          sourceBalanceBefore: fanBalanceBefore,
          sourceBalanceAfter: fanBalanceAfter,
          destBalanceBefore: creatorBalanceBefore,
          destBalanceAfter: creatorBalanceAfter,
          idempotencyKey,
          referenceType: "PAID_QUESTION",
          referenceId: purchaseRecord?.id || interactionDefinitionId || creatorProfile.id,
          status: "COMPLETED",
          note: `Paid question: "${questionText.substring(0, 60)}${questionText.length > 60 ? "..." : ""}"`,
          metadataJson: JSON.stringify({
            questionText,
            livestreamId,
            interactionDefinitionId,
            interactionPurchaseId: purchaseRecord?.id,
          }),
        },
      });

      // 8. Write Creator Earning
      await tx.creatorEarning.create({
        data: {
          creatorProfileId: creatorProfile.id,
          walletTransactionId: ledgerEntry.id,
          earningSource: "INTERACTION",
          sourceReferenceId: purchaseRecord?.id || ledgerEntry.id,
          grossCredits: credits,
          platformRakePercentage: DEFAULT_PLATFORM_RAKE_PERCENT / 100,
          platformFeeCredits: platformFee,
          netCreatorCredits: creatorNet,
          fiatValueEstimatedCents: Math.round(creatorNet * 0.08 * 100),
          clearanceStatus: "CLEARED",
        },
      });

      return {
        success: true,
        transactionId: ledgerEntry.id,
        idempotencyKey: ledgerEntry.idempotencyKey,
        transactionType: "INTERACTION_FEE",
        sourceWalletId: fanWallet.id,
        destinationWalletId: creatorWallet.id,
        amountCredits: credits,
        platformFeeCredits: platformFee,
        creatorNetCredits: creatorNet,
        sourceBalanceBefore: fanBalanceBefore,
        sourceBalanceAfter: fanBalanceAfter,
        destBalanceBefore: creatorBalanceBefore,
        destBalanceAfter: creatorBalanceAfter,
        fanRemainingBalance: updatedFanWallet.balance,
        creatorRemainingBalance: updatedCreatorWallet.balance,
        timestamp: ledgerEntry.createdAt,
        metadata: {
          questionText,
        },
      };
    });
  }

  // ============================================================================
  // 4. PPV CONTENT PURCHASE (e.g. Fan -400 -> Creator +320, Platform +80)
  // ============================================================================

  /**
   * Processes Pay-Per-View video or media purchase.
   * Atomically debits fan, credits creator, creates content unlock record & ledger entry.
   */
  static async processPPVPurchase(input: ProcessPPVPurchaseInput): Promise<LedgerOperationResult> {
    const {
      fanUserId,
      contentId,
      idempotencyKey = `ppv_${fanUserId}_${contentId}_${Date.now()}`,
    } = input;

    return await prisma.$transaction(async (tx: any) => {
      // 1. Check if already purchased
      const existingPurchase = await tx.contentPurchase.findUnique({
        where: {
          contentId_fanId: {
            contentId,
            fanId: fanUserId,
          },
        },
      });

      if (existingPurchase) {
        const fanWallet = await tx.wallet.findUnique({ where: { userId: fanUserId } });
        return {
          success: true,
          transactionId: existingPurchase.walletTransactionId || `existing_${existingPurchase.id}`,
          idempotencyKey,
          transactionType: "PPV_PURCHASE",
          amountCredits: existingPurchase.priceCreditsPaid,
          platformFeeCredits: existingPurchase.platformFeeCredits,
          creatorNetCredits: existingPurchase.creatorNetCredits,
          fanRemainingBalance: fanWallet?.balance || 0,
          timestamp: existingPurchase.createdAt,
          metadata: { alreadyPurchased: true },
        };
      }

      // 2. Fetch Content & Price
      const content = await tx.content.findUnique({
        where: { id: contentId },
        include: { creatorProfile: { include: { user: true } } },
      });

      if (!content) {
        throw new Error(`PPV Content ${contentId} not found.`);
      }

      const credits = content.priceCredits;
      if (credits <= 0) {
        throw new Error("PPV content price must be greater than zero.");
      }

      // 3. Validate Fan Wallet
      const fanWallet = await tx.wallet.findUnique({ where: { userId: fanUserId } });
      WalletLedgerService.validateWalletUsability(fanWallet, credits);

      // 4. Validate Creator Wallet
      const creatorWallet = await WalletLedgerService.getOrCreateWallet(
        content.creatorProfile.userId,
        tx
      );
      WalletLedgerService.validateWalletUsability(creatorWallet, 0);

      // 5. Calculations
      const platformFee = Math.floor(credits * (DEFAULT_PLATFORM_RAKE_PERCENT / 100));
      const creatorNet = credits - platformFee;

      const fanBalanceBefore = fanWallet.balance;
      const fanBalanceAfter = fanBalanceBefore - credits;
      const creatorBalanceBefore = creatorWallet.balance;
      const creatorBalanceAfter = creatorBalanceBefore + creatorNet;

      // 6. Debit / Credit Wallets
      const updatedFanWallet = await tx.wallet.update({
        where: { id: fanWallet.id },
        data: {
          balance: { decrement: credits },
          lifetimeSpentCredits: { increment: BigInt(credits) },
          version: { increment: 1 },
        },
      });

      const updatedCreatorWallet = await tx.wallet.update({
        where: { id: creatorWallet.id },
        data: {
          balance: { increment: creatorNet },
          lifetimeEarnedCredits: { increment: BigInt(creatorNet) },
          version: { increment: 1 },
        },
      });

      // Increment content purchase count
      await tx.content.update({
        where: { id: content.id },
        data: { purchaseCount: { increment: 1 } },
      });

      // 7. Write Ledger Transaction
      const ledgerEntry = await tx.walletTransaction.create({
        data: {
          sourceWalletId: fanWallet.id,
          destinationWalletId: creatorWallet.id,
          transactionType: "PPV_PURCHASE",
          direction: "TRANSFER",
          amountCredits: credits,
          platformFeeCredits: platformFee,
          creatorNetCredits: creatorNet,
          sourceBalanceBefore: fanBalanceBefore,
          sourceBalanceAfter: fanBalanceAfter,
          destBalanceBefore: creatorBalanceBefore,
          destBalanceAfter: creatorBalanceAfter,
          idempotencyKey,
          referenceType: "CONTENT",
          referenceId: content.id,
          status: "COMPLETED",
          note: `PPV Purchase: "${content.title}"`,
          metadataJson: JSON.stringify({
            contentId: content.id,
            contentTitle: content.title,
            contentType: content.contentType,
            creatorProfileId: content.creatorProfileId,
          }),
        },
      });

      // 8. Record Content Purchase
      await tx.contentPurchase.create({
        data: {
          contentId: content.id,
          fanId: fanUserId,
          priceCreditsPaid: credits,
          platformFeeCredits: platformFee,
          creatorNetCredits: creatorNet,
          walletTransactionId: ledgerEntry.id,
        },
      });

      // 9. Write Creator Earning
      await tx.creatorEarning.create({
        data: {
          creatorProfileId: content.creatorProfileId,
          walletTransactionId: ledgerEntry.id,
          earningSource: "PPV_CONTENT",
          sourceReferenceId: content.id,
          grossCredits: credits,
          platformRakePercentage: DEFAULT_PLATFORM_RAKE_PERCENT / 100,
          platformFeeCredits: platformFee,
          netCreatorCredits: creatorNet,
          fiatValueEstimatedCents: Math.round(creatorNet * 0.08 * 100),
          clearanceStatus: "CLEARED",
        },
      });

      return {
        success: true,
        transactionId: ledgerEntry.id,
        idempotencyKey: ledgerEntry.idempotencyKey,
        transactionType: "PPV_PURCHASE",
        sourceWalletId: fanWallet.id,
        destinationWalletId: creatorWallet.id,
        amountCredits: credits,
        platformFeeCredits: platformFee,
        creatorNetCredits: creatorNet,
        sourceBalanceBefore: fanBalanceBefore,
        sourceBalanceAfter: fanBalanceAfter,
        destBalanceBefore: creatorBalanceBefore,
        destBalanceAfter: creatorBalanceAfter,
        fanRemainingBalance: updatedFanWallet.balance,
        creatorRemainingBalance: updatedCreatorWallet.balance,
        timestamp: ledgerEntry.createdAt,
        metadata: {
          contentTitle: content.title,
        },
      };
    });
  }

  // ============================================================================
  // 5. REFUND OPERATION (e.g. Reversing a Paid Question or PPV)
  // ============================================================================

  /**
   * Atomically executes a refund on an existing transaction.
   * Restores fan balance, debits or adjusts creator balance, updates original tx to REVERSED,
   * and creates a linked REFUND ledger entry.
   */
  static async processRefund(input: ProcessRefundInput): Promise<LedgerOperationResult> {
    const {
      originalTransactionId,
      reason,
      requestedByUserId,
      adminUserId,
      idempotencyKey = `refund_${originalTransactionId}_${Date.now()}`,
    } = input;

    return await prisma.$transaction(async (tx: any) => {
      // 1. Fetch Original Transaction
      const originalTx = await tx.walletTransaction.findUnique({
        where: { id: originalTransactionId },
        include: {
          sourceWallet: true,
          destinationWallet: true,
        },
      });

      if (!originalTx) {
        throw new TransactionNotFoundError(originalTransactionId);
      }

      if (originalTx.status === "REVERSED") {
        throw new Error(`Transaction ${originalTransactionId} has already been refunded/reversed.`);
      }

      const fanWallet = originalTx.sourceWallet;
      const creatorWallet = originalTx.destinationWallet;
      const creditsToRefund = originalTx.amountCredits;
      const creatorNetToDeduct = originalTx.creatorNetCredits;

      if (!fanWallet) {
        throw new Error("Cannot refund transaction without a source fan wallet.");
      }

      const fanBalanceBefore = fanWallet.balance;
      const fanBalanceAfter = fanBalanceBefore + creditsToRefund;

      let creatorBalanceBefore: number | null = null;
      let creatorBalanceAfter: number | null = null;

      // 2. Credit Fan Wallet
      const updatedFanWallet = await tx.wallet.update({
        where: { id: fanWallet.id },
        data: {
          balance: { increment: creditsToRefund },
          lifetimeSpentCredits: { decrement: BigInt(creditsToRefund) },
          version: { increment: 1 },
        },
      });

      // 3. Debit Creator Wallet if creator was credited
      let updatedCreatorWallet: any = null;
      if (creatorWallet && creatorNetToDeduct > 0) {
        creatorBalanceBefore = creatorWallet.balance;
        creatorBalanceAfter = creatorBalanceBefore - creatorNetToDeduct;

        updatedCreatorWallet = await tx.wallet.update({
          where: { id: creatorWallet.id },
          data: {
            balance: { decrement: creatorNetToDeduct },
            lifetimeEarnedCredits: { decrement: BigInt(creatorNetToDeduct) },
            version: { increment: 1 },
          },
        });

        // Reversal of creator earning records
        await tx.creatorEarning.updateMany({
          where: { walletTransactionId: originalTx.id },
          data: {
            clearanceStatus: "REVERSED_FRAUD",
          },
        });
      }

      // 4. Mark Original Transaction as REVERSED
      await tx.walletTransaction.update({
        where: { id: originalTx.id },
        data: {
          status: "REVERSED",
        },
      });

      // 5. Create Linked Refund Ledger Entry
      const refundEntry = await tx.walletTransaction.create({
        data: {
          sourceWalletId: creatorWallet ? creatorWallet.id : null,
          destinationWalletId: fanWallet.id,
          transactionType: "REFUND",
          direction: "TRANSFER",
          amountCredits: creditsToRefund,
          platformFeeCredits: originalTx.platformFeeCredits,
          creatorNetCredits: creatorNetToDeduct,
          sourceBalanceBefore: creatorBalanceBefore,
          sourceBalanceAfter: creatorBalanceAfter,
          destBalanceBefore: fanBalanceBefore,
          destBalanceAfter: fanBalanceAfter,
          idempotencyKey,
          referenceType: "WALLET_TRANSACTION_REVERSAL",
          referenceId: originalTx.id,
          status: "COMPLETED",
          note: `Refund: ${reason} (Original Tx: ${originalTx.id})`,
          metadataJson: JSON.stringify({
            originalTransactionId: originalTx.id,
            reason,
            requestedByUserId,
            adminUserId,
          }),
        },
      });

      return {
        success: true,
        transactionId: refundEntry.id,
        idempotencyKey: refundEntry.idempotencyKey,
        transactionType: "REFUND",
        sourceWalletId: creatorWallet?.id || null,
        destinationWalletId: fanWallet.id,
        amountCredits: creditsToRefund,
        platformFeeCredits: originalTx.platformFeeCredits,
        creatorNetCredits: creatorNetToDeduct,
        sourceBalanceBefore: creatorBalanceBefore,
        sourceBalanceAfter: creatorBalanceAfter,
        destBalanceBefore: fanBalanceBefore,
        destBalanceAfter: fanBalanceAfter,
        fanRemainingBalance: updatedFanWallet.balance,
        creatorRemainingBalance: updatedCreatorWallet?.balance,
        timestamp: refundEntry.createdAt,
        metadata: {
          originalTransactionId: originalTx.id,
        },
      };
    });
  }

  // ============================================================================
  // 6. CHARGEBACK / DISPUTE HANDLING (e.g. Fiat Payment Chargeback)
  // ============================================================================

  /**
   * Processes a chargeback notification from payment processor.
   * Marks PaymentTransaction as DISPUTED_CHARGEBACK, claws back credits,
   * flags wallet as SUSPENDED_CHARGEBACK, and writes a CHARGEBACK_REVERSAL ledger entry.
   */
  static async processChargebackDispute(input: ProcessChargebackInput): Promise<LedgerOperationResult> {
    const {
      gatewayTransactionId,
      paymentTransactionId,
      disputeReferenceId,
      disputeFeeCents = 1500, // e.g. $15 dispute fee
      reason,
      rawGatewayPayload,
      idempotencyKey = `cb_${disputeReferenceId}_${Date.now()}`,
    } = input;

    return await prisma.$transaction(async (tx: any) => {
      // 1. Locate Payment Transaction
      let paymentTx: any = null;
      if (paymentTransactionId) {
        paymentTx = await tx.paymentTransaction.findUnique({
          where: { id: paymentTransactionId },
          include: { wallet: true },
        });
      } else if (gatewayTransactionId) {
        paymentTx = await tx.paymentTransaction.findFirst({
          where: { gatewayTransactionId },
          include: { wallet: true },
        });
      }

      if (!paymentTx) {
        throw new TransactionNotFoundError(
          paymentTransactionId || gatewayTransactionId || "unknown_payment"
        );
      }

      const wallet = paymentTx.wallet;
      const creditsToClawback = paymentTx.creditsPurchased + paymentTx.bonusCredits;
      const balanceBefore = wallet.balance;
      const balanceAfter = balanceBefore - creditsToClawback;

      // 2. Flag Payment Transaction as Disputed
      await tx.paymentTransaction.update({
        where: { id: paymentTx.id },
        data: {
          status: "DISPUTED_CHARGEBACK",
          gatewayFeeCents: { increment: disputeFeeCents },
        },
      });

      // 3. Freeze Wallet & Deduct Balance
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: creditsToClawback },
          lifetimeDepositedCredits: { decrement: BigInt(creditsToClawback) },
          status: "SUSPENDED_CHARGEBACK",
          version: { increment: 1 },
        },
      });

      // 4. Create Reversal Ledger Entry
      const reversalTx = await tx.walletTransaction.create({
        data: {
          sourceWalletId: wallet.id,
          destinationWalletId: null,
          transactionType: "CHARGEBACK_REVERSAL",
          direction: "DEBIT",
          amountCredits: creditsToClawback,
          platformFeeCredits: 0,
          creatorNetCredits: 0,
          sourceBalanceBefore: balanceBefore,
          sourceBalanceAfter: balanceAfter,
          idempotencyKey,
          referenceType: "PAYMENT_CHARGEBACK",
          referenceId: paymentTx.id,
          status: "COMPLETED",
          note: `Chargeback Disputed: -${creditsToClawback} credits (${reason})`,
          metadataJson: JSON.stringify({
            disputeReferenceId,
            reason,
            disputeFeeCents,
            rawGatewayPayload,
          }),
        },
      });

      return {
        success: true,
        transactionId: reversalTx.id,
        idempotencyKey: reversalTx.idempotencyKey,
        transactionType: "CHARGEBACK_REVERSAL",
        sourceWalletId: wallet.id,
        destinationWalletId: null,
        amountCredits: creditsToClawback,
        platformFeeCredits: 0,
        creatorNetCredits: 0,
        sourceBalanceBefore: balanceBefore,
        sourceBalanceAfter: balanceAfter,
        fanRemainingBalance: updatedWallet.balance,
        timestamp: reversalTx.createdAt,
        metadata: {
          walletStatus: updatedWallet.status,
          paymentTransactionId: paymentTx.id,
        },
      };
    });
  }

  // ============================================================================
  // 7. FORENSIC AUDIT & THE 7 QUESTIONS INQUIRY
  // ============================================================================

  /**
   * Forensic analysis answering the 7 fundamental financial questions for any transaction ID:
   * 1. Where did the balance come from?
   * 2. Why did it change?
   * 3. What was purchased?
   * 4. When?
   * 5. Which creator received the associated earnings?
   * 6. Was it refunded?
   * 7. Was the payment charged back?
   */
  static async explainTransaction(transactionId: string): Promise<TransactionForensicReport> {
    const tx = await prisma.walletTransaction.findUnique({
      where: { id: transactionId },
      include: {
        sourceWallet: { include: { user: true } },
        destinationWallet: { include: { user: true } },
        creatorEarnings: { include: { creatorProfile: { include: { user: true } } } },
        contentPurchases: { include: { content: true } },
      },
    });

    if (!tx) {
      throw new TransactionNotFoundError(transactionId);
    }

    // 1. Trace Balance Origin
    let fundingDeposit: any = null;
    if (tx.transactionType === "DEPOSIT" && tx.referenceType === "PAYMENT_TRANSACTION" && tx.referenceId) {
      const payTx = await prisma.paymentTransaction.findUnique({
        where: { id: tx.referenceId },
      });
      if (payTx) {
        fundingDeposit = {
          paymentGateway: payTx.paymentGateway,
          gatewayTransactionId: payTx.gatewayTransactionId,
          fiatAmount: payTx.amountFiatCents / 100,
          currency: payTx.currency,
          purchasedAt: payTx.createdAt,
        };
      }
    }

    // Check if source wallet had prior deposits
    if (!fundingDeposit && tx.sourceWalletId) {
      const priorDeposit = await prisma.walletTransaction.findFirst({
        where: {
          destinationWalletId: tx.sourceWalletId,
          transactionType: "DEPOSIT",
          createdAt: { lte: tx.createdAt },
        },
        orderBy: { createdAt: "desc" },
      });
      if (priorDeposit && priorDeposit.referenceId) {
        const payTx = await prisma.paymentTransaction.findUnique({
          where: { id: priorDeposit.referenceId },
        });
        if (payTx) {
          fundingDeposit = {
            paymentGateway: payTx.paymentGateway,
            gatewayTransactionId: payTx.gatewayTransactionId,
            fiatAmount: payTx.amountFiatCents / 100,
            currency: payTx.currency,
            purchasedAt: payTx.createdAt,
          };
        }
      }
    }

    // 3. What was purchased?
    let itemTitle = tx.note || "Platform Transaction";
    let itemDescription: string | null = null;

    if (tx.contentPurchases && tx.contentPurchases.length > 0) {
      itemTitle = tx.contentPurchases[0].content.title;
      itemDescription = `PPV Content (${tx.contentPurchases[0].content.contentType})`;
    } else if (tx.metadataJson) {
      try {
        const meta = JSON.parse(tx.metadataJson);
        if (meta.questionText) itemDescription = `Question: "${meta.questionText}"`;
        if (meta.contentTitle) itemTitle = meta.contentTitle;
        if (meta.customMessage) itemDescription = `Message: "${meta.customMessage}"`;
      } catch (e) {
        // ignore parse error
      }
    }

    // 5. Creator Earnings
    let creatorInfo: any = null;
    const earning = tx.creatorEarnings && tx.creatorEarnings.length > 0 ? tx.creatorEarnings[0] : null;

    if (earning) {
      creatorInfo = {
        creatorProfileId: earning.creatorProfileId,
        creatorUserId: earning.creatorProfile?.userId || null,
        creatorDisplayName:
          earning.creatorProfile?.stageName || earning.creatorProfile?.user?.displayName || "Creator",
        grossCredits: earning.grossCredits,
        platformRakePercentage: Number(earning.platformRakePercentage) * 100,
        platformRakeCredits: earning.platformFeeCredits,
        netCreatorCredits: earning.netCreatorCredits,
        earningClearanceStatus: earning.clearanceStatus,
        fiatValueEstimatedCents: earning.fiatValueEstimatedCents,
        destinationBalanceBefore: tx.destBalanceBefore,
        destinationBalanceAfter: tx.destBalanceAfter,
      };
    } else if (tx.destinationWallet && tx.destinationWallet.user) {
      creatorInfo = {
        creatorProfileId: null,
        creatorUserId: tx.destinationWallet.userId,
        creatorDisplayName: tx.destinationWallet.user.displayName,
        grossCredits: tx.amountCredits,
        platformRakePercentage: 0,
        platformRakeCredits: 0,
        netCreatorCredits: tx.amountCredits,
        earningClearanceStatus: "CLEARED",
        fiatValueEstimatedCents: Math.round(tx.amountCredits * 0.08 * 100),
        destinationBalanceBefore: tx.destBalanceBefore,
        destinationBalanceAfter: tx.destBalanceAfter,
      };
    }

    // 6. Was it refunded?
    const refundRecord = await prisma.walletTransaction.findFirst({
      where: {
        referenceType: "WALLET_TRANSACTION_REVERSAL",
        referenceId: tx.id,
      },
    });

    // 7. Was it charged back?
    let isChargedBack = false;
    let paymentDisputed = false;
    let chargebackReversalTx: any = null;

    if (tx.transactionType === "DEPOSIT" && tx.referenceId) {
      const payTx = await prisma.paymentTransaction.findUnique({
        where: { id: tx.referenceId },
      });
      if (payTx && payTx.status === "DISPUTED_CHARGEBACK") {
        isChargedBack = true;
        paymentDisputed = true;
        chargebackReversalTx = await prisma.walletTransaction.findFirst({
          where: {
            referenceType: "PAYMENT_CHARGEBACK",
            referenceId: payTx.id,
          },
        });
      }
    }

    let parsedMetadata: any = null;
    if (tx.metadataJson) {
      try {
        parsedMetadata = JSON.parse(tx.metadataJson);
      } catch {
        parsedMetadata = null;
      }
    }

    return {
      transactionId: tx.id,
      idempotencyKey: tx.idempotencyKey,
      createdAt: tx.createdAt,
      status: tx.status,
      origin: {
        sourceWalletId: tx.sourceWalletId,
        sourceUserId: tx.sourceWallet?.userId || null,
        sourceUsername: tx.sourceWallet?.user?.username || null,
        sourceBalanceBefore: tx.sourceBalanceBefore,
        sourceBalanceAfter: tx.sourceBalanceAfter,
        fiatDepositFunding: fundingDeposit,
      },
      cause: {
        transactionType: tx.transactionType,
        direction: tx.direction,
        note: tx.note,
        metadata: parsedMetadata,
      },
      itemPurchased: {
        referenceType: tx.referenceType,
        referenceId: tx.referenceId,
        itemTitle,
        itemDescription,
        grossCredits: tx.amountCredits,
      },
      timestamp: {
        iso: tx.createdAt.toISOString(),
        unixMs: tx.createdAt.getTime(),
      },
      creatorEarnings: creatorInfo,
      refundStatus: {
        isRefunded: tx.status === "REVERSED" || !!refundRecord,
        refundTransactionId: refundRecord?.id || null,
        refundedAt: refundRecord?.createdAt || null,
        refundReason: refundRecord?.note || null,
      },
      chargebackStatus: {
        isChargedBack,
        paymentDisputed,
        chargebackReversalTransactionId: chargebackReversalTx?.id || null,
        gatewayDisputeStatus: isChargedBack ? "DISPUTED_CHARGEBACK" : null,
      },
    };
  }

  // ============================================================================
  // 8. WALLET STATEMENT GENERATOR
  // ============================================================================

  /**
   * Generates a chronologically verified wallet statement with running balance.
   */
  static async getWalletStatement(
    userIdOrWalletId: string,
    options: { from?: Date; to?: Date; limit?: number } = {}
  ): Promise<WalletStatement> {
    const { from = new Date(0), to = new Date(), limit = 100 } = options;

    let wallet = await prisma.wallet.findUnique({
      where: { id: userIdOrWalletId },
      include: { user: true },
    });

    if (!wallet) {
      wallet = await prisma.wallet.findUnique({
        where: { userId: userIdOrWalletId },
        include: { user: true },
      });
    }

    if (!wallet) {
      throw new Error(`Wallet not found for ${userIdOrWalletId}`);
    }

    const transactions = await prisma.walletTransaction.findMany({
      where: {
        OR: [{ sourceWalletId: wallet.id }, { destinationWalletId: wallet.id }],
        createdAt: { gte: from, lte: to },
      },
      include: {
        sourceWallet: { include: { user: true } },
        destinationWallet: { include: { user: true } },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    let totalDebits = 0;
    let totalCredits = 0;

    const statementEntries: WalletStatementItem[] = transactions.map((t) => {
      const isCredit = t.destinationWalletId === wallet.id;
      const isDebit = t.sourceWalletId === wallet.id;

      let netChange = 0;
      let balanceBefore = 0;
      let balanceAfter = 0;

      if (isCredit && isDebit) {
        // Self-transfer / Adjustment
        netChange = 0;
        balanceBefore = t.sourceBalanceBefore || wallet.balance;
        balanceAfter = t.sourceBalanceAfter || wallet.balance;
      } else if (isCredit) {
        netChange = t.amountCredits;
        totalCredits += t.amountCredits;
        balanceBefore = t.destBalanceBefore ?? 0;
        balanceAfter = t.destBalanceAfter ?? balanceBefore + netChange;
      } else {
        netChange = -t.amountCredits;
        totalDebits += t.amountCredits;
        balanceBefore = t.sourceBalanceBefore ?? wallet.balance;
        balanceAfter = t.sourceBalanceAfter ?? balanceBefore - t.amountCredits;
      }

      const counterpartyUser = isCredit ? t.sourceWallet?.user : t.destinationWallet?.user;

      return {
        id: t.id,
        timestamp: t.createdAt,
        type: t.transactionType,
        direction: t.direction,
        amount: t.amountCredits,
        netChange,
        balanceBefore,
        balanceAfter,
        counterparty: {
          id: counterpartyUser?.id || null,
          name: counterpartyUser?.displayName || (isCredit ? "Platform Mint / Deposit" : "Platform Fee"),
          role: counterpartyUser?.role || "PLATFORM",
        },
        description: t.note || `${t.transactionType} Transaction`,
        referenceType: t.referenceType,
        referenceId: t.referenceId,
        status: t.status,
      };
    });

    const reconciliation = await WalletLedgerService.reconcileWallet(wallet.id);

    return {
      walletId: wallet.id,
      userId: wallet.userId,
      currency: wallet.currency,
      currentBalance: wallet.balance,
      lockedBalance: wallet.lockedBalance,
      pendingBalance: wallet.pendingBalance,
      lifetimeDeposited: Number(wallet.lifetimeDepositedCredits),
      lifetimeEarned: Number(wallet.lifetimeEarnedCredits),
      lifetimeSpent: Number(wallet.lifetimeSpentCredits),
      lifetimeWithdrawn: Number(wallet.lifetimeWithdrawnCredits),
      statementPeriod: { from, to },
      openingBalance: statementEntries.length > 0 ? statementEntries[0].balanceBefore : wallet.balance,
      closingBalance:
        statementEntries.length > 0
          ? statementEntries[statementEntries.length - 1].balanceAfter
          : wallet.balance,
      totalDebits,
      totalCredits,
      isReconciled: reconciliation.isConsistent,
      entries: statementEntries,
    };
  }

  // ============================================================================
  // 9. LEDGER RECONCILIATION ENGINE
  // ============================================================================

  /**
   * Mathematically sums every ledger debit and credit from historical records
   * and verifies consistency against the cached `wallet.balance`.
   */
  static async reconcileWallet(walletId: string): Promise<WalletReconciliationResult> {
    const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) {
      throw new Error(`Wallet ${walletId} not found.`);
    }

    const [incomingCredits, outgoingDebits] = await Promise.all([
      prisma.walletTransaction.aggregate({
        where: {
          destinationWalletId: wallet.id,
          status: "COMPLETED",
        },
        _sum: {
          amountCredits: true,
          creatorNetCredits: true,
        },
        _count: {
          id: true,
        },
      }),
      prisma.walletTransaction.aggregate({
        where: {
          sourceWalletId: wallet.id,
          status: "COMPLETED",
        },
        _sum: {
          amountCredits: true,
        },
        _count: {
          id: true,
        },
      }),
    ]);

    // Incoming credits:
    // If user is creator receiving net, or fan receiving deposits/refunds
    // To calculate fan balance:
    // Credits In: deposits (dest=wallet) + refunds (dest=wallet) + tip earnings (if creator dest=wallet.creatorNetCredits)
    const totalDeposits = await prisma.walletTransaction.aggregate({
      where: {
        destinationWalletId: wallet.id,
        transactionType: { in: ["DEPOSIT", "REFUND", "ADMIN_ADJUSTMENT"] },
        status: "COMPLETED",
      },
      _sum: { amountCredits: true },
    });

    const totalCreatorNetEarned = await prisma.walletTransaction.aggregate({
      where: {
        destinationWalletId: wallet.id,
        transactionType: { in: ["LIVE_TIP", "PPV_PURCHASE", "INTERACTION_FEE", "PRODUCT_PURCHASE"] },
        status: "COMPLETED",
      },
      _sum: { creatorNetCredits: true },
    });

    const totalSpentOrClawedBack = await prisma.walletTransaction.aggregate({
      where: {
        sourceWalletId: wallet.id,
        transactionType: { in: ["LIVE_TIP", "PPV_PURCHASE", "INTERACTION_FEE", "PRODUCT_PURCHASE", "CHARGEBACK_REVERSAL", "WITHDRAWAL"] },
        status: "COMPLETED",
      },
      _sum: { amountCredits: true },
    });

    const totalCreditsIn =
      (totalDeposits._sum.amountCredits || 0) + (totalCreatorNetEarned._sum.creatorNetCredits || 0);
    const totalDebitsOut = totalSpentOrClawedBack._sum.amountCredits || 0;

    const calculatedBalance = totalCreditsIn - totalDebitsOut;
    const discrepancy = wallet.balance - calculatedBalance;
    const isConsistent = discrepancy === 0;

    const transactionCount = (incomingCredits._count.id || 0) + (outgoingDebits._count.id || 0);

    return {
      walletId: wallet.id,
      userId: wallet.userId,
      cachedBalance: wallet.balance,
      calculatedBalance,
      totalCreditsIn,
      totalDebitsOut,
      isConsistent,
      discrepancy,
      transactionCount,
      reconciledAt: new Date(),
    };
  }
}
