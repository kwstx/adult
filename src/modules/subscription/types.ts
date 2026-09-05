/**
 * Subscriptions System Core Types
 * Authoritative Type Definitions for Creator Products, Customer Subscriptions,
 * Price Grandfathering, Payments, and Entitlement Authorization.
 */

import {
  SubscriptionTier,
  SubscriptionStatus,
  SubscriptionPaymentStatus,
  PaymentGateway,
} from "@prisma/client";

export {
  SubscriptionTier,
  SubscriptionStatus,
  SubscriptionPaymentStatus,
  PaymentGateway,
};

export type SubscriptionStatusType =
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED"
  | "EXPIRED"
  | "PAUSED";

export type SubscriptionTierType = "BASIC" | "VIP" | "DIAMOND" | "CUSTOM";

export type EntitlementType =
  | "SUBSCRIBER_CONTENT"   // Access subscriber-only posts, photos, videos, albums
  | "SUBSCRIBER_CHAT"      // Chat in subscriber-only stream chat rooms & bypass slow-mode
  | "SUBSCRIBER_LIVE"      // Watch subscriber-only livestreams and private group shows
  | "VIP_MEDIA"            // Access VIP-tier vault & 4K/high-res media
  | "DIRECT_MESSAGES"      // Unlocked direct messaging with creator
  | "DISCOUNT_PPV"         // Automatic discount on PPV content / products
  | "CUSTOM_BADGE"         // Custom chat badges & exclusive emotes in streams
  | "VOD_RECORDINGS"       // Access past stream recordings & VOD archives
  | string;

export interface SubscriptionProductRecord {
  id: string;
  creatorProfileId: string;
  name: string;
  tier: SubscriptionTier;
  tierLevel: number;
  description?: string | null;
  priceFiatCents: number;
  currency: string;
  creditPriceMonthly?: number | null;
  billingInterval: string;
  entitlements: string;
  badgeIconUrl?: string | null;
  badgeColorHex?: string | null;
  isActive: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionRecord {
  id: string;
  fanId: string;
  creatorProfileId: string;
  productId?: string | null;
  tier: SubscriptionTier;
  tierName: string;
  tierLevel: number;
  status: SubscriptionStatus;
  billingPriceCents: number;
  billingCurrency: string;
  creditPriceMonthly: number;
  isPriceGrandfathered: boolean;
  grandfatheredOriginalPriceCents?: number | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  renewalDate: Date;
  autoRenew: boolean;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date | null;
  cancelReason?: string | null;
  isPaused: boolean;
  pausedAt?: Date | null;
  pauseResumeAt?: Date | null;
  pauseReason?: string | null;
  failedPaymentAttempts: number;
  gracePeriodEndsAt?: Date | null;
  lastPaymentError?: string | null;
  lastPaymentAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionPaymentRecord {
  id: string;
  subscriptionId: string;
  fanId: string;
  creatorProfileId: string;
  productId?: string | null;
  billingCycleIndex: number;
  periodStart: Date;
  periodEnd: Date;
  amountCents: number;
  currency: string;
  creditsDeducted?: number | null;
  platformFeeCents: number;
  creatorNetCents: number;
  paymentGateway: PaymentGateway;
  gatewayTransactionId?: string | null;
  gatewayInvoiceId?: string | null;
  idempotencyKey: string;
  paymentMethod?: string | null;
  status: SubscriptionPaymentStatus;
  failureReason?: string | null;
  retryCount: number;
  nextRetryAt?: Date | null;
  paidAt?: Date | null;
  refundedAt?: Date | null;
  disputedAt?: Date | null;
  rawGatewayPayload?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// OPERATION INPUT INTERFACES
// ============================================================================

export interface CreateSubscriptionProductInput {
  creatorProfileId: string;
  name: string; // e.g. "Fan", "VIP", "Diamond Patron"
  tier?: SubscriptionTier;
  tierLevel?: number; // 1 = Fan, 2 = VIP, 3 = Diamond
  description?: string;
  priceFiatCents: number; // e.g. 999 for €9.99, 2499 for €24.99
  currency?: string; // default "EUR"
  creditPriceMonthly?: number;
  billingInterval?: "MONTHLY" | "YEARLY" | "QUARTERLY";
  entitlements?: EntitlementType[] | string[];
  badgeIconUrl?: string;
  badgeColorHex?: string;
}

export interface PriceChangePolicy {
  /**
   * If true (default), all existing active subscribers retain their locked price.
   * New subscribers will pay the new updated price.
   */
  grandfatherExisting?: boolean;
  /**
   * Optional date for price migration if grandfathering is not permanent.
   */
  effectiveDate?: Date;
  /**
   * Optional reason or notice sent to subscribers.
   */
  changeNotice?: string;
}

export interface UpdateSubscriptionProductInput {
  productId: string;
  creatorProfileId: string;
  name?: string;
  description?: string;
  priceFiatCents?: number;
  currency?: string;
  creditPriceMonthly?: number;
  entitlements?: EntitlementType[] | string[];
  badgeIconUrl?: string;
  badgeColorHex?: string;
  isActive?: boolean;
  isArchived?: boolean;
  pricePolicy?: PriceChangePolicy;
}

export interface SubscribeInput {
  fanId: string;
  creatorProfileId: string;
  productId: string;
  paymentGateway?: PaymentGateway;
  paymentMethod?: string;
  gatewayTransactionId?: string;
  idempotencyKey?: string;
  creditPriceOverride?: number;
}

export interface RenewSubscriptionInput {
  subscriptionId: string;
  paymentGateway?: PaymentGateway;
  gatewayTransactionId?: string;
  idempotencyKey?: string;
}

export interface CancelSubscriptionInput {
  subscriptionId: string;
  fanId?: string;
  creatorProfileId?: string;
  reason?: string;
  cancelImmediately?: boolean; // false = cancel at period end (default)
}

export interface PauseSubscriptionInput {
  subscriptionId: string;
  fanId?: string;
  resumeDate?: Date;
  reason?: string;
}

export interface ResumeSubscriptionInput {
  subscriptionId: string;
  fanId?: string;
}

export interface UpgradeSubscriptionInput {
  subscriptionId: string;
  fanId: string;
  newProductId: string;
  paymentGateway?: PaymentGateway;
  paymentMethod?: string;
  idempotencyKey?: string;
}

// ============================================================================
// ENTITLEMENT QUERY & RESULT INTERFACES
// ============================================================================

export interface EntitlementCheckInput {
  fanId?: string | null;
  creatorProfileId: string;
  entitlement: EntitlementType;
  context?: {
    contentId?: string;
    livestreamId?: string;
    minTierLevel?: number;
    requiredTier?: SubscriptionTier;
  };
}

export interface EntitlementCheckResult {
  hasEntitlement: boolean;
  reason: string;
  statusCode: number;
  subscription?: {
    id: string;
    status: SubscriptionStatus;
    tier: SubscriptionTier;
    tierName: string;
    tierLevel: number;
    billingPriceCents: number;
    billingCurrency: string;
    isPriceGrandfathered: boolean;
    renewalDate: Date;
    currentPeriodEnd: Date;
    isPaused: boolean;
  } | null;
  isBypassed?: boolean; // True for creator, moderator, or admin
}

export interface FanEntitlementsSummary {
  fanId: string;
  creatorProfileId: string;
  isSubscribed: boolean;
  status: SubscriptionStatus | null;
  tier: SubscriptionTier | null;
  tierName: string | null;
  tierLevel: number;
  billingPriceCents: number;
  billingCurrency: string;
  isPriceGrandfathered: boolean;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  renewalDate: Date | null;
  autoRenew: boolean;
  isPaused: boolean;
  entitlements: EntitlementType[];
  badge: {
    name: string;
    iconUrl?: string | null;
    colorHex: string;
  } | null;
}
