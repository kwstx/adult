/**
 * ============================================================================
 * STATE MACHINES TYPE DEFINITIONS & SCHEMAS
 * ============================================================================
 * 
 * Formal state enums and transition payload interfaces for the 8 core lifecycle domains.
 */

import { SecurityContext } from "@/core/state-machine/base.state-machine";

// ----------------------------------------------------------------------------
// 1. CREATOR ONBOARDING
// ----------------------------------------------------------------------------
export type CreatorOnboardingState =
  | "DRAFT"
  | "INFORMATION_COLLECTED"
  | "IDENTITY_VERIFIED"
  | "PAYOUT_SETUP_COMPLETED"
  | "CONSENT_PROVENANCE_SATISFIED"
  | "PLATFORM_REVIEWED"
  | "MONETIZATION_ENABLED"
  | "REVISION_REQUIRED"
  | "RESTRICTED"
  | "SUSPENDED"
  | "REJECTED";

export interface CreatorOnboardingContext {
  creatorProfileId: string;
  userId: string;
  security?: SecurityContext;
  kycVerificationId?: string;
  payoutMethodId?: string;
  complianceNotes?: string;
}

// ----------------------------------------------------------------------------
// 2. LIVESTREAM LIFECYCLE
// ----------------------------------------------------------------------------
export type LivestreamLifecycleState =
  | "SCHEDULED"
  | "PREPARING"
  | "LIVE"
  | "PAUSED"
  | "ENDED"
  | "TERMINATED_SAFETY";

export interface LivestreamLifecycleContext {
  streamId: string;
  creatorProfileId: string;
  security?: SecurityContext;
  peakViewers?: number;
  totalDurationSeconds?: number;
  moderationReason?: string;
}

// ----------------------------------------------------------------------------
// 3. INTERACTION LIFECYCLE
// ----------------------------------------------------------------------------
export type InteractionLifecycleState =
  | "PAID"
  | "QUEUED"
  | "EXECUTING"
  | "COMPLETED"
  | "REJECTED"
  | "REFUNDED";

export interface InteractionLifecycleContext {
  purchaseId: string;
  interactionId: string;
  fanId: string;
  creatorProfileId: string;
  creditsAmount: number;
  security?: SecurityContext;
  refundReason?: string;
  queuePosition?: number;
}

// ----------------------------------------------------------------------------
// 4. PAYMENT LIFECYCLE
// ----------------------------------------------------------------------------
export type PaymentLifecycleState =
  | "INITIALIZED"
  | "PENDING_WEBHOOK"
  | "SUCCEEDED"
  | "FAILED"
  | "DISPUTED_CHARGEBACK"
  | "REFUNDED";

export interface PaymentLifecycleContext {
  paymentId: string;
  userId: string;
  amountCents: number;
  gateway: string;
  security?: SecurityContext;
  gatewayTransactionId?: string;
  failureCode?: string;
  disputeReason?: string;
  refundAmountCents?: number;
}

// ----------------------------------------------------------------------------
// 5. SUBSCRIPTION LIFECYCLE
// ----------------------------------------------------------------------------
export type SubscriptionLifecycleState =
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED"
  | "EXPIRED"
  | "PAUSED";

export interface SubscriptionLifecycleContext {
  subscriptionId: string;
  fanId: string;
  creatorProfileId: string;
  tierName: string;
  priceCredits: number;
  security?: SecurityContext;
  gracePeriodDaysRemaining?: number;
  cancelReason?: string;
}

// ----------------------------------------------------------------------------
// 6. PRIVATE SESSION LIFECYCLE
// ----------------------------------------------------------------------------
export type PrivateSessionLifecycleState =
  | "PENDING_CREATOR_ACCEPT"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED_BY_FAN"
  | "CANCELLED_BY_CREATOR"
  | "NO_SHOW";

export interface PrivateSessionLifecycleContext {
  bookingId: string;
  fanId: string;
  creatorProfileId: string;
  scheduledStartTime: string;
  durationMinutes: number;
  priceCredits: number;
  security?: SecurityContext;
  cancellationReason?: string;
  rejectionReason?: string;
}

// ----------------------------------------------------------------------------
// 7. MODERATION LIFECYCLE (Content, Account, Creator)
// ----------------------------------------------------------------------------
export type ContentModerationState =
  | "PENDING"
  | "APPROVED"
  | "RESTRICTED"
  | "REMOVED"
  | "APPEALED"
  | "REJECTED";

export type AccountModerationState =
  | "ACTIVE"
  | "RESTRICTED"
  | "SUSPENDED"
  | "BANNED"
  | "UNDER_REVIEW";

export type CreatorModerationState =
  | "APPLICATION"
  | "VERIFICATION_PENDING"
  | "VERIFIED"
  | "MONETIZATION_ENABLED"
  | "RESTRICTED"
  | "SUSPENDED";

export interface ModerationLifecycleContext {
  entityId: string;
  entityType: "CONTENT" | "ACCOUNT" | "CREATOR";
  security?: SecurityContext;
  violationCode?: string;
  moderatorNotes?: string;
  appealNotes?: string;
}

// ----------------------------------------------------------------------------
// 8. PAYOUT LIFECYCLE
// ----------------------------------------------------------------------------
export type PayoutLifecycleState =
  | "REQUESTED"
  | "UNDER_COMPLIANCE_REVIEW"
  | "PROCESSING"
  | "COMPLETED"
  | "REJECTED"
  | "FAILED";

export interface PayoutLifecycleContext {
  payoutId: string;
  creatorProfileId: string;
  amountCredits: number;
  fiatAmountEur: number;
  payoutMethod: string;
  security?: SecurityContext;
  complianceReviewerId?: string;
  payoutReference?: string;
  rejectionReason?: string;
  failureReason?: string;
}
