// ============================================================================
// CREATOR CRM & AUDIENCE INTELLIGENCE TYPES
// Production-grade types for customer relationship management, cohorts, and campaigns
// ============================================================================

import { FanStatusTier } from "@/types/fan-status";

/**
 * The 10 authoritative fan cohorts in the Creator CRM
 */
export type CrmFanCohort =
  | "NEW_FANS"
  | "RETURNING_FANS"
  | "VIPS"
  | "INACTIVE_FANS"
  | "RECENT_PURCHASERS"
  | "HIGH_VALUE_SUPPORTERS"
  | "SUBSCRIBERS"
  | "EXPIRING_SUBSCRIBERS"
  | "PEOPLE_WHO_HAVENT_RETURNED"
  | "RECENT_CONTENT_PURCHASERS";

/**
 * Metadata definition for each cohort
 */
export interface CohortMetadata {
  cohort: CrmFanCohort;
  title: string;
  shortTitle: string;
  description: string;
  iconName: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  recommendedAction: string;
  targetCount?: number;
}

/**
 * Breakdown of transactions with the creator
 */
export interface CreatorTransactionBreakdown {
  liveTipsCredits: number;
  interactiveActionsCredits: number;
  ppvContentCredits: number;
  subscriptionsCredits: number;
  privateSessionsCredits: number;
  paidMessagesCredits: number;
  totalSpentCredits: number;
  fiatEstimatedEur: number;
}

/**
 * Public/Sanitized Fan Summary in CRM Audience Roster
 */
export interface CrmFanSummary {
  id: string; // Relationship ID
  fanId: string; // User ID
  username: string;
  displayName: string;
  avatarUrl: string;
  relationshipTier: FanStatusTier;
  tierName: string;
  fanLevel: number;
  totalXp: number;
  totalCreditsSpent: number;
  fiatEstimatedEur: number;
  currentStreakDays: number;
  longestStreakDays: number;
  totalMinutesWatched: number;
  lastInteractedAt: string;
  daysSinceLastInteraction: number;
  firstInteractedAt: string;
  
  // Subscription state with THIS creator
  isSubscribed: boolean;
  subscriptionTier?: string;
  subscriptionPriceCents?: number;
  subscriptionStatus?: "ACTIVE" | "PAST_DUE" | "CANCELED" | "EXPIRED" | "PAUSED";
  subscriptionRenewalDate?: string;
  daysUntilSubscriptionRenewal?: number;
  autoRenew?: boolean;

  // Recent activity indicators
  lastPurchaseAt?: string;
  daysSinceLastPurchase?: number;
  recentContentPurchasedCount: number;
  
  // Creator-private customizations
  customNickname?: string | null;
  customNotes?: string | null;
  tags: string[];

  // Dynamic Cohorts assigned to this fan
  cohorts: CrmFanCohort[];

  // Communication / suppression flags
  isNotificationsEnabled: boolean;
  isMutedByCreator: boolean;
  isBannedFromRoom: boolean;
}

/**
 * Comprehensive Creator Fan Dossier (Full 360-degree view)
 */
export interface CrmFanDossier extends CrmFanSummary {
  creatorProfileId: string;
  creatorStageName: string;
  
  // Detailed financial & engagement breakdown
  spendBreakdown: CreatorTransactionBreakdown;
  
  // Recent transactions with this creator
  recentTransactions: Array<{
    id: string;
    type: string;
    amountCredits: number;
    title: string;
    createdAt: string;
  }>;

  // Interaction definitions most purchased by this fan
  topInteractionsPurchased: Array<{
    interactionId: string;
    title: string;
    count: number;
    totalCreditsSpent: number;
  }>;

  // PPV content unlocked by this fan from this creator
  unlockedContentItems: Array<{
    contentId: string;
    title: string;
    contentType: "PHOTO" | "VIDEO" | "AUDIO" | "ALBUM";
    priceCreditsPaid: number;
    unlockedAt: string;
  }>;

  // Direct message history preview
  messagingSummary: {
    totalMessagesExchanged: number;
    paidMessagesCount: number;
    lastMessageAt?: string;
    lastMessagePreview?: string;
  };

  // Progression milestones
  progression: {
    currentTier: FanStatusTier;
    currentLevel: number;
    totalXp: number;
    xpInCurrentTier: number;
    xpRequiredForNextTier: number;
    progressPercent: number;
    unlockedPerks: string[];
  };
}

/**
 * Filter and query parameters for CRM audience searches
 */
export interface CrmQueryFilters {
  cohort?: CrmFanCohort | "ALL";
  search?: string;
  relationshipTier?: FanStatusTier | "ALL";
  isSubscribed?: boolean;
  minSpendCredits?: number;
  maxSpendCredits?: number;
  minStreakDays?: number;
  sortBy?: "totalCreditsSpent" | "totalXp" | "lastInteractedAt" | "currentStreakDays" | "totalMinutesWatched" | "fanLevel";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

/**
 * Aggregate cohort counts and performance metrics
 */
export interface CrmCohortMetrics {
  totalTrackedFans: number;
  newFansCount: number;
  returningFansCount: number;
  vipsCount: number;
  inactiveFansCount: number;
  recentPurchasersCount: number;
  highValueSupportersCount: number;
  subscribersCount: number;
  expiringSubscribersCount: number;
  peopleWhoHaventReturnedCount: number;
  recentContentPurchasersCount: number;
  
  // Revenue & Health KPIs
  totalAudienceLtvCredits: number;
  totalAudienceLtvFiatEur: number;
  activeSubscriberMonthlyRunRateEur: number;
  audienceRetentionRatePercent: number;
  expiringRevenueAtRiskEur: number;
  uncontactedInactivePotentialEur: number;
}

/**
 * Campaign communication channels
 */
export type CampaignChannel = "DIRECT_MESSAGE" | "SYSTEM_NOTIFICATION" | "CUSTOM_OFFER";

/**
 * Campaign status lifecycle
 */
export type CampaignStatus = "DRAFT" | "SCHEDULED" | "DISPATCHING" | "DISPATCHED" | "COMPLETED" | "CANCELLED";

/**
 * Template perk/action attached to a campaign
 */
export interface CampaignPerkAttachment {
  type: "DISCOUNT_CODE" | "FREE_CONTENT_UNLOCK" | "EXCLUSIVE_MEDIA_TEASER" | "PRIVATE_SESSION_CREDIT" | "PRIORITY_CHAT_PASS" | "CUSTOM_MESSAGE";
  title: string;
  valueDescription: string;
  discountPercentage?: number;
  creditValueBonus?: number;
  contentId?: string;
}

/**
 * Creator Campaign Entity
 */
export interface CreatorCampaign {
  id: string;
  creatorProfileId: string;
  title: string;
  targetCohort: CrmFanCohort;
  targetCohortTitle: string;
  channel: CampaignChannel;
  messageBody: string;
  perkAttached?: CampaignPerkAttachment | null;
  status: CampaignStatus;
  
  // Delivery & Engagement Telemetry
  targetAudienceCount: number;
  deliveredCount: number;
  readCount: number;
  convertedCount: number;
  creditsGenerated: number;
  revenueGeneratedEur: number;

  scheduledAt?: string | null;
  dispatchedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Input for creating a new creator campaign
 */
export interface CreateCampaignInput {
  title: string;
  targetCohort: CrmFanCohort;
  channel: CampaignChannel;
  messageBody: string;
  perkAttached?: CampaignPerkAttachment;
  scheduledAt?: string;
  dispatchImmediately?: boolean;
}

/**
 * Input for updating fan private metadata in CRM
 */
export interface UpdateFanCrmMetadataInput {
  customNotes?: string;
  customNickname?: string;
  tags?: string[];
}
