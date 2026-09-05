import prisma from "@/lib/db";
import {
  SendTipInput,
  TransferResult,
  ProcessDepositInput,
  ProcessLiveTipInput,
  ProcessPaidQuestionInput,
  ProcessPPVPurchaseInput,
  ProcessRefundInput,
  ProcessChargebackInput,
  TransactionForensicReport,
  WalletStatement,
  WalletReconciliationResult,
} from "./types";
import {
  WalletLedgerService,
  InsufficientFundsError,
  WalletSuspendedError,
  TransactionNotFoundError,
} from "./wallet-ledger.service";

export { InsufficientFundsError, WalletSuspendedError, TransactionNotFoundError };

// Legacy alias for existing codebase compatibility
export class InsufficientCreditsError extends InsufficientFundsError {
  constructor(public required: number, public available: number) {
    super(required, available);
    this.name = "InsufficientCreditsError";
  }
}

/**
 * LedgerService
 * Authoritative interface proxying all financial operations to WalletLedgerService.
 */
export class LedgerService {
  /**
   * Ensure user wallet existence.
   */
  static async getOrCreateWallet(userId: string) {
    return await WalletLedgerService.getOrCreateWallet(userId);
  }

  /**
   * Deposit credits from verified payment gateway webhook.
   */
  static async creditUserWalletFromPurchase(params: {
    userId: string;
    creditsAmount: number;
    paymentReference: string;
    idempotencyKey: string;
    amountFiat?: number;
    currency?: string;
  }) {
    const { userId, creditsAmount, paymentReference, idempotencyKey, amountFiat = 9.99, currency = "EUR" } = params;

    const result = await WalletLedgerService.processDeposit({
      userId,
      amountFiatCents: Math.round(amountFiat * 100),
      currency,
      creditsPurchased: creditsAmount,
      gateway: "CCBILL",
      gatewayTransactionId: paymentReference,
      idempotencyKey,
    });

    return {
      entry: {
        id: result.transactionId,
        transactionType: "CREDIT_PURCHASE",
        amount: creditsAmount,
        destinationWalletId: result.destinationWalletId,
        status: "COMPLETED",
        idempotencyKey,
        referenceId: paymentReference,
        createdAt: result.timestamp,
      },
      updatedWallet: {
        balance: result.fanRemainingBalance,
      },
    };
  }

  /**
   * Process a live tip with item interaction.
   */
  static async processLiveTip(input: SendTipInput): Promise<TransferResult> {
    const { fanUserId, creatorId, credits, menuItemId, customMessage, idempotencyKey } = input;

    try {
      const result = await WalletLedgerService.processLiveTip({
        fanUserId,
        creatorProfileId: creatorId,
        credits,
        menuItemId,
        customMessage,
        idempotencyKey,
      });

      return {
        success: true,
        ledgerEntryId: result.transactionId,
        fanRemainingBalance: result.fanRemainingBalance || 0,
        creatorCreditedAmount: result.creatorNetCredits,
        platformRakeAmount: result.platformFeeCredits,
        timestamp: result.timestamp,
      };
    } catch (err: any) {
      if (err instanceof InsufficientFundsError) {
        throw new InsufficientCreditsError(err.requiredCredits, err.availableCredits);
      }
      throw err;
    }
  }

  /**
   * Process paid question.
   */
  static async processPaidQuestion(input: ProcessPaidQuestionInput) {
    return await WalletLedgerService.processPaidQuestion(input);
  }

  /**
   * Unlock Pay-Per-View Content.
   */
  static async unlockPPVContent(fanUserId: string, ppvContentId: string): Promise<TransferResult> {
    try {
      const result = await WalletLedgerService.processPPVPurchase({
        fanUserId,
        contentId: ppvContentId,
      });

      return {
        success: true,
        ledgerEntryId: result.transactionId,
        fanRemainingBalance: result.fanRemainingBalance || 0,
        creatorCreditedAmount: result.creatorNetCredits,
        platformRakeAmount: result.platformFeeCredits,
        timestamp: result.timestamp,
      };
    } catch (err: any) {
      if (err instanceof InsufficientFundsError) {
        throw new InsufficientCreditsError(err.requiredCredits, err.availableCredits);
      }
      throw err;
    }
  }

  /**
   * Process Refund on existing transaction.
   */
  static async processRefund(input: ProcessRefundInput) {
    return await WalletLedgerService.processRefund(input);
  }

  /**
   * Process Payment Chargeback dispute.
   */
  static async processChargeback(input: ProcessChargebackInput) {
    return await WalletLedgerService.processChargebackDispute(input);
  }

  /**
   * Explain transaction ("The 7 Questions" Forensic Audit).
   */
  static async explainTransaction(transactionId: string): Promise<TransactionForensicReport> {
    return await WalletLedgerService.explainTransaction(transactionId);
  }

  /**
   * Get verified wallet statement.
   */
  static async getWalletStatement(userIdOrWalletId: string, options?: any): Promise<WalletStatement> {
    return await WalletLedgerService.getWalletStatement(userIdOrWalletId, options);
  }

  /**
   * Reconcile wallet ledger consistency.
   */
  static async reconcileWallet(walletId: string): Promise<WalletReconciliationResult> {
    return await WalletLedgerService.reconcileWallet(walletId);
  }
}
