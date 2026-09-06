// ============================================================================
// THE CREATOR CONTROL ROOM - TYPE DEFINITIONS
// Comprehensive schemas for Telemetry, CRM, Queue, Marketplace & Moderation
// ============================================================================

export type StreamMode = "PUBLIC_BROADCAST" | "SUBSCRIBERS_ONLY" | "TICKETED_PPV" | "PRIVATE_1ON1" | "VIP_GROUP";

export type StreamHealth = "EXCELLENT" | "GOOD" | "DEGRADED" | "OFFLINE";

export type InteractionEligibility = "ALL" | "FOLLOWERS" | "SUBSCRIBERS_ONLY" | "MIN_FAN_LEVEL_5";

export type QueueItemStatus =
  | "PENDING"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED"
  | "REFUNDED"
  | "QUEUED"
  | "EXECUTING"
  | "SKIPPED";

export type RelationshipTier =
  | "STRANGER"
  | "SUPPORTER"
  | "SUPERFAN"
  | "VIP_DEVOTEE"
  | "SOULMATE"
  | "ROYAL_PATRON";

export type PurchaseItemType =
  | "PPV_UNLOCK"
  | "SUBSCRIPTION"
  | "INTERACTION"
  | "PRIVATE_SESSION"
  | "TIP"
  | "PRODUCT";

// ----------------------------------------------------------------------------
// 1. TOP REGION: TELEMETRY & LIVE STATUS
// ----------------------------------------------------------------------------

export interface ControlRoomTelemetry {
  isLive: boolean;
  durationSeconds: number;
  viewerCount: number;
  peakViewers: number;
  uniqueViewers: number;
  grossTokens: number;
  netUsd: number;
  tokensPerMin: number;
  completedInteractionsCount: number;
  fps: number;
  bitrateKbps: number;
  streamHealth: StreamHealth;
}

// ----------------------------------------------------------------------------
// 2. LEFT REGION: AUDIENCE, CHAT & CRM
// ----------------------------------------------------------------------------

export interface ControlRoomChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  fanLevel: number;
  relationshipTier: RelationshipTier;
  isVip: boolean;
  isSubscriber: boolean;
  isModerator: boolean;
  text: string;
  tipCredits?: number;
  isPinned?: boolean;
  timestamp: string;
}

export interface AudienceMember {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  fanLevel: number;
  relationshipTier: RelationshipTier;
  isVip: boolean;
  isSubscriber: boolean;
  isModerator: boolean;
  isMuted: boolean;
  isBanned: boolean;
  tokensSpentSession: number;
  tokensSpentLifetime: number;
  watchMinutesSession: number;
  streakDays: number;
  lastActive: string;
  customNotes?: string;
  relationshipProgressPercent: number; // 0 to 100 towards next tier
}

export interface TopSupporter {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string;
  fanLevel: number;
  relationshipTier: RelationshipTier;
  totalTokensContributed: number;
  streakDays: number;
}

// ----------------------------------------------------------------------------
// 3. CENTER REGION: LIVE MEDIA, INTERACTION QUEUE & GOALS
// ----------------------------------------------------------------------------

export interface LiveQueueItem {
  id: string;
  fanId: string;
  fanName: string;
  fanAvatar: string;
  fanLevel?: number;
  relationshipTier?: string;
  isVip?: boolean;
  isSubscriber?: boolean;
  credits: number;
  actionTitle: string;
  actionType: string;
  customMessage?: string;
  durationSeconds: number;
  timeRemainingSeconds: number;
  position: number;
  status: QueueItemStatus;
  purchaseTime: string;
  creatorDecision?: {
    decision: string;
    decidedAt?: string;
    creatorNote?: string;
    rejectionReason?: string;
  };
  startTime?: string;
  completionTime?: string;
  potentialRefundState?: {
    isRefunded: boolean;
    refundStatus: "NONE" | "REQUESTED" | "PROCESSED" | "FAILED";
    refundedAmountCredits?: number;
    refundTransactionId?: string;
    refundedAt?: string;
    refundReason?: string;
  };
  intensity?: number;
  timestamp: string;
}

export interface StreamGoal {
  id: string;
  title: string;
  targetTokens: number;
  currentTokens: number;
  percentage: number;
  remainingTokens: number;
  rewardDescription: string;
  isCompleted: boolean;
  contributors: {
    userId: string;
    displayName: string;
    avatarUrl: string;
    tokens: number;
  }[];
}

export interface PurchaseLedgerItem {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerAvatar: string;
  itemType: PurchaseItemType;
  itemTitle: string;
  tokensPaid: number;
  netUsd: number;
  timestamp: string;
}

// ----------------------------------------------------------------------------
// 4. RIGHT REGION: DYNAMIC INTERACTION MARKETPLACE
// ----------------------------------------------------------------------------

export interface MarketplaceItem {
  id: string;
  title: string;
  description: string;
  category: "Visual" | "Sound" | "Toy" | "Request" | "VIP";
  priceTokens: number;
  basePriceTokens: number;
  durationSeconds: number;
  maxQuantityPerStream: number | null; // null = unlimited
  remainingQuantity: number | null;
  eligibility: InteractionEligibility;
  isEnabled: boolean;
  icon: string;
  intensity?: number;
  toyCommandPattern?: string;
}

export type SurgeMultiplier = 1.0 | 1.25 | 1.5 | 2.0;

// ----------------------------------------------------------------------------
// 5. BOTTOM REGION: BROADCAST & MODERATION
// ----------------------------------------------------------------------------

export interface ModerationRuleConfig {
  isSubscribersOnlyChat: boolean;
  slowModeSeconds: number; // 0, 5, 10, 30, 60
  minTipToHighlight: number;
  isPanicBlackoutActive: boolean;
  blockedWords: string[];
}

export interface IngestCredentials {
  rtmpIngestUrl: string;
  whipIngestUrl: string;
  streamKey: string;
  playbackHlsUrl: string;
  playbackWhepUrl: string;
}
