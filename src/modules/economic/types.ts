/**
 * Financial Ledger & Wallet Engine Core Types
 * Authoritative Type Definitions for Immutable Double-Entry Ledger System
 */

export type WalletStatusType = "ACTIVE" | "FROZEN_SECURITY" | "SUSPENDED_CHARGEBACK";

export type LedgerTransactionType =
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "LIVE_TIP"
  | "PPV_PURCHASE"
  | "SUBSCRIPTION_PAYMENT"
  | "PRODUCT_PURCHASE"
  | "INTERACTION_FEE"
  | "PRIVATE_BOOKING"
  | "GOAL_CONTRIBUTION"
  | "GAME_ENTRY_FEE"
  | "GAME_JACKPOT_WIN"
  | "PLATFORM_FEE_RAKE"
  | "REFUND"
  | "CHARGEBACK_REVERSAL"
  | "ADMIN_ADJUSTMENT";

export type LedgerTransactionDirection = "DEBIT" | "CREDIT" | "TRANSFER";

export type LedgerTransactionStatus = "PENDING" | "COMPLETED" | "FAILED" | "REVERSED";

export type PaymentGatewayType =
  | "CCBILL"
  | "SEGPAY"
  | "EPOCH"
  | "STRIPE"
  | "NOWPAYMENTS"
  | "COINBASE_COMMERCE"
  | "MANUAL_BANK";

export type PaymentTxStatus =
  | "INITIALIZED"
  | "PENDING_WEBHOOK"
  | "SUCCEEDED"
  | "FAILED"
  | "DISPUTED_CHARGEBACK"
  | "REFUNDED";

export type EarningSourceType =
  | "LIVE_TIP"
  | "SUBSCRIPTION"
  | "PPV_CONTENT"
  | "PRIVATE_SESSION"
  | "PRODUCT_SALE"
  | "INTERACTION"
  | "GOAL_REWARD"
  | "GAME_REWARD"
  | "PLATFORM_BONUS";

export type EarningClearanceStatus = "PENDING_HOLD" | "CLEARED" | "PAID_OUT" | "REVERSED_FRAUD";

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  priceFiat: number;
  currency: string;
  bonusCredits: number;
  popular?: boolean;
}

// ============================================================================
// OPERATION INPUT INTERFACES
// ============================================================================

export interface ProcessDepositInput {
  userId: string;
  amountFiatCents: number;
  currency?: string;
  creditsPurchased: number;
  bonusCredits?: number;
  gateway?: PaymentGatewayType;
  gatewayTransactionId?: string;
  gatewayEventId?: string;
  paymentMethod?: string;
  idempotencyKey: string;
  ipAddress?: string;
  countryCode?: string;
  metadata?: Record<string, any>;
}

export interface ProcessLiveTipInput {
  fanUserId: string;
  creatorProfileId: string;
  credits: number;
  livestreamId?: string;
  interactionDefinitionId?: string;
  menuItemId?: string;
  customMessage?: string;
  idempotencyKey?: string;
}

export interface ProcessPaidQuestionInput {
  fanUserId: string;
  creatorProfileId: string;
  credits: number;
  questionText: string;
  interactionDefinitionId?: string;
  livestreamId?: string;
  idempotencyKey?: string;
}

export interface ProcessPPVPurchaseInput {
  fanUserId: string;
  contentId: string;
  idempotencyKey?: string;
}

export interface ProcessProductPurchaseInput {
  fanUserId: string;
  productId: string;
  quantity?: number;
  idempotencyKey?: string;
}

export interface ProcessRefundInput {
  originalTransactionId: string;
  reason: string;
  requestedByUserId: string;
  adminUserId?: string;
  idempotencyKey?: string;
}

export interface ProcessChargebackInput {
  gatewayTransactionId?: string;
  paymentTransactionId?: string;
  disputeReferenceId: string;
  disputeFeeCents?: number;
  reason: string;
  rawGatewayPayload?: string;
  idempotencyKey?: string;
}

export interface RequestPayoutInput {
  creatorProfileId: string;
  creditsToWithdraw: number;
  payoutMethod: "SEPA_BANK" | "ACH_DIRECT" | "MASS_PAY" | "PAXUM" | "COSMO_PAY" | "CRYPTO_USDT" | "WIRE";
  beneficiaryInfoEncrypted: string;
  currency?: string;
  idempotencyKey?: string;
}

// Backward compatibility with legacy caller interface
export interface SendTipInput {
  fanUserId: string;
  creatorId: string;
  credits: number;
  menuItemId?: string;
  customMessage?: string;
  idempotencyKey?: string;
}

export interface PurchasePPVInput {
  fanUserId: string;
  ppvContentId: string;
  idempotencyKey?: string;
}

export interface SubscribeInput {
  fanUserId: string;
  creatorId: string;
  tier: "BASIC" | "VIP" | "DIAMOND";
  idempotencyKey?: string;
}

// ============================================================================
// RESULT INTERFACES
// ============================================================================

export interface LedgerOperationResult {
  success: boolean;
  transactionId: string;
  idempotencyKey: string;
  transactionType: LedgerTransactionType;
  sourceWalletId?: string | null;
  destinationWalletId?: string | null;
  amountCredits: number;
  platformFeeCredits: number;
  creatorNetCredits: number;
  sourceBalanceBefore?: number | null;
  sourceBalanceAfter?: number | null;
  destBalanceBefore?: number | null;
  destBalanceAfter?: number | null;
  fanRemainingBalance?: number;
  creatorRemainingBalance?: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Backward compatibility with older callers
export interface TransferResult {
  success: boolean;
  ledgerEntryId: string;
  fanRemainingBalance: number;
  creatorCreditedAmount: number;
  platformRakeAmount: number;
  timestamp: Date;
}

// ============================================================================
// FORENSIC AUDIT & 7 QUESTIONS QUERY INTERFACES
// ============================================================================

export interface TransactionForensicReport {
  transactionId: string;
  idempotencyKey: string;
  createdAt: Date;
  status: LedgerTransactionStatus;
  
  // 1. Where did the balance come from / origin
  origin: {
    sourceWalletId: string | null;
    sourceUserId: string | null;
    sourceUsername: string | null;
    sourceBalanceBefore: number | null;
    sourceBalanceAfter: number | null;
    fiatDepositFunding?: {
      paymentGateway: string;
      gatewayTransactionId: string | null;
      fiatAmount: number;
      currency: string;
      purchasedAt: Date;
    } | null;
  };

  // 2. Why did it change?
  cause: {
    transactionType: LedgerTransactionType;
    direction: LedgerTransactionDirection;
    note: string | null;
    metadata: Record<string, any> | null;
  };

  // 3. What was purchased?
  itemPurchased: {
    referenceType: string | null;
    referenceId: string | null;
    itemTitle?: string | null;
    itemDescription?: string | null;
    grossCredits: number;
  };

  // 4. When?
  timestamp: {
    iso: string;
    unixMs: number;
  };

  // 5. Which creator received the associated earnings?
  creatorEarnings: {
    creatorProfileId: string | null;
    creatorUserId: string | null;
    creatorDisplayName: string | null;
    grossCredits: number;
    platformRakePercentage: number;
    platformRakeCredits: number;
    netCreatorCredits: number;
    earningClearanceStatus: EarningClearanceStatus | null;
    fiatValueEstimatedCents: number;
    destinationBalanceBefore: number | null;
    destinationBalanceAfter: number | null;
  } | null;

  // 6. Was it refunded?
  refundStatus: {
    isRefunded: boolean;
    refundTransactionId?: string | null;
    refundedAt?: Date | null;
    refundReason?: string | null;
  };

  // 7. Was the payment charged back?
  chargebackStatus: {
    isChargedBack: boolean;
    paymentDisputed: boolean;
    chargebackReversalTransactionId?: string | null;
    gatewayDisputeStatus?: string | null;
  };
}

export interface WalletStatementItem {
  id: string;
  timestamp: Date;
  type: LedgerTransactionType;
  direction: LedgerTransactionDirection;
  amount: number;
  netChange: number; // positive for credit, negative for debit
  balanceBefore: number;
  balanceAfter: number;
  counterparty: {
    id: string | null;
    name: string | null;
    role: "FAN" | "CREATOR" | "PLATFORM";
  };
  description: string;
  referenceType: string | null;
  referenceId: string | null;
  status: LedgerTransactionStatus;
}

export interface WalletStatement {
  walletId: string;
  userId: string;
  currency: string;
  currentBalance: number;
  lockedBalance: number;
  pendingBalance: number;
  lifetimeDeposited: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  lifetimeWithdrawn: number;
  statementPeriod: {
    from: Date;
    to: Date;
  };
  openingBalance: number;
  closingBalance: number;
  totalDebits: number;
  totalCredits: number;
  isReconciled: boolean;
  entries: WalletStatementItem[];
}

export interface WalletReconciliationResult {
  walletId: string;
  userId: string;
  cachedBalance: number;
  calculatedBalance: number;
  totalCreditsIn: number;
  totalDebitsOut: number;
  isConsistent: boolean;
  discrepancy: number;
  transactionCount: number;
  reconciledAt: Date;
}
