export type TransactionType =
  | "CREDIT_PURCHASE"
  | "LIVE_TIP"
  | "PPV_UNLOCK"
  | "SUBSCRIPTION"
  | "CREATOR_PAYOUT"
  | "PLATFORM_RAKE"
  | "REFUND";

export type TransactionStatus = "PENDING" | "COMPLETED" | "FAILED" | "REVERSED";

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  priceUsd: number;
  bonusCredits: number;
  popular?: boolean;
}

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

export interface TransferResult {
  success: boolean;
  ledgerEntryId: string;
  fanRemainingBalance: number;
  creatorCreditedAmount: number;
  platformRakeAmount: number;
  timestamp: Date;
}
