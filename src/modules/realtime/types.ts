/**
 * Standardized Real-Time Event System - Authoritative Domain Types
 *
 * Implements a unified event vocabulary and strongly-typed payloads for all real-time
 * events across live rooms, economic updates, presence, progression, interactions, and analytics.
 */

// ----------------------------------------------------------------------------
// STANDARDIZED DOMAIN EVENT VOCABULARY
// ----------------------------------------------------------------------------

export type StandardEventType =
  | "LIVE_STARTED"
  | "LIVE_ENDED"
  | "USER_JOINED"
  | "USER_LEFT"
  | "MESSAGE_CREATED"
  | "GIFT_SENT"
  | "INTERACTION_CREATED"
  | "INTERACTION_PURCHASED"
  | "INTERACTION_ACCEPTED"
  | "GOAL_PROGRESS"
  | "GOAL_COMPLETED"
  | "RELATIONSHIP_LEVEL_UP"
  | "LEADERBOARD_UPDATED"
  | "CONTENT_PURCHASED";

// Combined type for full backward-compatibility with legacy room events
export type RealtimeEventType =
  | StandardEventType
  // Legacy / specialized aliases
  | "VIEWER_JOINED"
  | "VIEWER_LEFT"
  | "NEW_MESSAGE"
  | "CHAT_MESSAGE"
  | "GOAL_UPDATED"
  | "GOAL_CONTRIBUTION_RECEIVED"
  | "NEW_INTERACTION_AVAILABLE"
  | "INTERACTION_STARTED"
  | "INTERACTION_COMPLETED"
  | "INTERACTION_REJECTED"
  | "INTERACTION_CANCELLED"
  | "INTERACTION_REFUNDED"
  | "QUEUE_STATE_CHANGED"
  | "PRESENCE_COUNT"
  | "ROOM_STATUS"
  | "TIP_EVENT"
  | "STREAM_HEALTH"
  | "RELATIONSHIP_UPDATE"
  | "XP_AWARDED"
  | "LEVEL_UP"
  | "MODERATION_ACTION"
  | "INTERACTION_TRIGGERED"
  | "1ON1_REQUEST"
  | "SEAT_OCCUPIED"
  | "SEAT_VACATED"
  | "SEAT_CLAIMED"
  | "GUEST_INVITED"
  | "ROOM_SEATS_UPDATED"
  | "STREAM_TERMINATED_SAFETY"
  | "USER_KICKED_FROM_ROOM"
  | "SESSION_TERMINATED_SECURITY"
  | "CONNECTED"
  | "HEARTBEAT";

// ----------------------------------------------------------------------------
// STANDARDIZED DOMAIN EVENT ENVELOPE
// ----------------------------------------------------------------------------

export interface EventActor {
  userId: string;
  username?: string;
  displayName: string;
  avatarUrl?: string | null;
  role?: "FAN" | "CREATOR" | "MODERATOR" | "ADMIN" | string;
  badge?: string | null;
  fanLevel?: number;
}

export interface DomainEventMetadata {
  correlationId?: string;
  causationId?: string;
  idempotencyKey?: string;
  source: string; // e.g. "authoritative_backend" | "economic_engine" | "stream_service"
  version: string; // e.g. "1.0.0"
}

export interface DomainEvent<T = unknown> {
  id: string;
  type: RealtimeEventType;
  channel: string; // e.g. `room:${creatorId}`, `user:${userId}`, `creator:${creatorId}`, `global`
  timestamp: number; // Unix epoch ms
  actor?: EventActor;
  entityId?: string; // ID of stream, gift, goal, interaction, content, etc.
  payload: T;
  metadata: DomainEventMetadata;
}

// Backward-compatible input event interface for publishing
export interface RealtimeEvent<T = unknown> {
  id?: string;
  type: RealtimeEventType;
  payload: T;
  channel?: string;
  timestamp?: number;
  actor?: EventActor;
  entityId?: string;
  metadata?: Partial<DomainEventMetadata>;
}

// ----------------------------------------------------------------------------
// 1. LIVE_STARTED & LIVE_ENDED
// ----------------------------------------------------------------------------

export interface LiveStartedPayload {
  livestreamId: string;
  creatorId: string;
  creatorUserId: string;
  creatorDisplayName: string;
  creatorUsername: string;
  creatorAvatarUrl?: string | null;
  title: string;
  category?: string;
  streamMode: "PUBLIC_BROADCAST" | "SUBSCRIBERS_ONLY" | "TICKETED_PPV" | "PRIVATE_1ON1" | "VIP_GROUP" | string;
  streamKey?: string;
  playbackUrl?: string;
  currentGoal?: {
    title: string;
    target: number;
    progress: number;
  } | null;
  startedAt: string;
}

export interface LiveEndedPayload {
  livestreamId: string;
  creatorId: string;
  title: string;
  durationSeconds: number;
  peakViewers: number;
  totalUniqueViewers: number;
  totalCreditsEarned: number;
  totalGiftsReceived: number;
  totalInteractionsCompleted: number;
  endedAt: string;
  reason?: "CREATOR_STOPPED" | "TIMEOUT" | "MODERATION_TERMINATED" | "SYSTEM";
}

// ----------------------------------------------------------------------------
// 2. USER_JOINED & USER_LEFT
// ----------------------------------------------------------------------------

export interface UserJoinedPayload {
  creatorId: string;
  livestreamId?: string;
  user: {
    userId: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    role?: string;
    badge?: string | null;
    fanLevel?: number;
    seatTier?: "STANDARD_VIEWER" | "FRONT_ROW" | "VIP" | "INNER_CIRCLE" | "CREATOR_SELECTED_GUEST" | null;
    isVip?: boolean;
    isSubscriber?: boolean;
  };
  viewerCount: number;
  joinedAt: string;
}

export interface UserLeftPayload {
  creatorId: string;
  livestreamId?: string;
  userId: string;
  displayName?: string;
  viewerCount: number;
  leftAt: string;
}

// Aliases
export type ViewerPresenceEventPayload = {
  creatorId: string;
  viewerCount: number;
  joinedUser?: {
    userId: string;
    displayName: string;
    badge?: string | null;
  };
  leftUserId?: string;
  action: "JOIN" | "LEAVE" | "BATCH_UPDATE";
  timestamp: number;
};

// ----------------------------------------------------------------------------
// 3. MESSAGE_CREATED
// ----------------------------------------------------------------------------

export interface MessageCreatedPayload {
  id: string;
  creatorId: string;
  conversationId?: string;
  senderId: string;
  senderName: string;
  senderUsername?: string;
  senderRole: string; // FAN, CREATOR, MOD, VIP, ADMIN
  senderBadge?: string | null;
  senderAvatarUrl?: string | null;
  senderFanLevel?: number;
  senderSeatTier?: "STANDARD_VIEWER" | "FRONT_ROW" | "VIP" | "INNER_CIRCLE" | "CREATOR_SELECTED_GUEST" | null;
  text: string;
  messageType?: "TEXT" | "TIP_NOTICE" | "SYSTEM_NOTICE" | "PAID_MESSAGE";
  isTipNotice?: boolean;
  tipAmount?: number;
  tipActionName?: string | null;
  createdAt: string | Date;
}

// Alias for chat message
export type ChatMessagePayload = MessageCreatedPayload;

// ----------------------------------------------------------------------------
// 4. GIFT_SENT
// ----------------------------------------------------------------------------

export type GiftTier = "SMALL" | "MEDIUM" | "LEGENDARY";

export interface GiftSentPayload {
  eventId: string;
  creatorId: string;
  streamSessionId?: string;

  // Sender Metadata
  sender: {
    userId: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    badge?: string | null;
    fanLevel: number;
  };

  // Gift Metadata
  gift: {
    id: string;
    name: string;
    icon: string;
    creditAmount: number;
    tier: GiftTier; // SMALL (<100), MEDIUM (100-499), LEGENDARY (>=500)
    animationType: "PARTICLE_BURST" | "CONFETTI_SHOWER" | "GRAND_DIAMOND_EXPLOSION" | "CUSTOM_3D";
    customMessage?: string;
  };

  // Authoritative Financial Distribution
  creatorEarningsDelta: {
    grossCredits: number;
    netCredits: number;
    platformRakeCredits: number;
    totalSessionCredits: number;
  };

  // Authoritative Downstream State Updates
  updatedGoal: {
    title: string;
    target: number;
    progress: number;
    percentage: number;
    isCompleted: boolean;
  };

  updatedLeaderboard: LeaderboardEntry[];

  sentAt: string;
}

// ----------------------------------------------------------------------------
// 5. INTERACTION_CREATED, INTERACTION_PURCHASED, INTERACTION_ACCEPTED
// ----------------------------------------------------------------------------

export interface InteractionCreatedPayload {
  interaction: {
    id: string;
    creatorProfileId: string;
    type: "QUESTION" | "ACTIVITY" | "CHALLENGE" | "PRIORITY_INTERACTION" | "CUSTOM_EXPERIENCE" | string;
    name: string;
    description: string;
    price: number;
    duration: number;
    quantity: number | null;
    remainingQuantity: number | null;
    whoCanPurchase: "ALL" | "FOLLOWERS" | "SUBSCRIBERS_ONLY" | "MIN_FAN_LEVEL_5" | string;
    requiresAcceptance: boolean;
    entersQueue: boolean;
    isActive: boolean;
    icon: string;
    createdAt: string;
  };
  creatorId: string;
  message?: string;
  publishedAt: string;
}

export type NewInteractionAvailablePayload = InteractionCreatedPayload;

export interface InteractionPurchasedPayload {
  queueId: string;
  interactionId: string;
  creatorId: string;
  senderId: string;
  senderName: string;
  senderUsername?: string;
  senderAvatarUrl?: string | null;
  senderBadge?: string | null;
  actionItem: {
    id: string;
    title: string;
    creditCost: number;
    actionType: string; // DANCE, WHEEL_SPIN, ALERT_SOUND, CHAT_HIGHLIGHT, CUSTOM
  };
  customMessage?: string;
  status: "QUEUED" | "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "REJECTED";
  purchasedAt: string;
}

export interface InteractionAcceptedPayload {
  queueId: string;
  interactionId?: string;
  creatorId: string;
  buyerId?: string;
  senderName: string;
  actionTitle: string;
  actionType: string;
  creatorNote?: string;
  acceptedAt: string;
}

// ----------------------------------------------------------------------------
// 6. GOAL_PROGRESS & GOAL_COMPLETED
// ----------------------------------------------------------------------------

export interface GoalProgressPayload {
  goalId?: string;
  creatorId: string;
  title: string;
  target: number;
  progress: number;
  percentage: number;
  remaining: number;
  deltaCredits?: number;
  isCompleted: boolean;
  contributorCount?: number;
  contributor?: {
    userId: string;
    displayName: string;
    avatarUrl?: string | null;
    fanLevel?: number;
    amount: number;
  };
  recentContribution?: {
    fanId: string;
    fanName: string;
    amount: number;
    message?: string | null;
  };
  milestoneTriggered?: string;
  updatedAt?: string;
}

// Backward-compatible alias
export type GoalUpdatedPayload = GoalProgressPayload;

export interface GoalContributionReceivedPayload {
  goalId: string;
  creatorId: string;
  contributor: {
    fanId: string;
    displayName: string;
    username: string;
    avatarUrl?: string | null;
    fanLevel?: number;
  };
  amount: number;
  message?: string | null;
  newProgress: number;
  target: number;
  percentage: number;
  isCompleted: boolean;
  timestamp: string;
}

export interface GoalCompletedPayload {
  goalId?: string;
  creatorId: string;
  title: string;
  target: number;
  finalProgress: number;
  contributorCount: number;
  completedAt: string;
  unlock: {
    type: "SPECIAL_EXPERIENCE" | "PPV_UNLOCKED" | "VIP_MODE" | "BONUS_INTERACTION" | "CUSTOM_REWARD";
    title: string;
    description: string;
    mediaUrl?: string | null;
    actionLabel?: string;
    actionPayload?: Record<string, unknown>;
  };
  topContributors?: Array<{
    userId?: string;
    fanId: string;
    displayName: string;
    username: string;
    avatarUrl?: string | null;
    amountContributed: number;
    rank: number;
  }>;
  celebrationTheme?: "MIDNIGHT_NEON" | "GOLDEN_CHAMPION" | "CYBER_FIRE";
}

// ----------------------------------------------------------------------------
// 7. RELATIONSHIP_LEVEL_UP
// ----------------------------------------------------------------------------

export interface RelationshipLevelUpPayload {
  creatorId: string;
  creatorDisplayName?: string;
  fanUserId: string;
  fanDisplayName: string;
  fanUsername?: string;
  fanAvatarUrl?: string | null;
  previousLevel: number;
  newLevel: number;
  levelTitle: string; // e.g. "Bronze Supporter", "Silver VIP", "Gold Patron", "Diamond Inner Circle"
  perkUnlocked?: string;
  totalXp: number;
  xpGained: number;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// 8. LEADERBOARD_UPDATED
// ----------------------------------------------------------------------------

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  totalCredits: number;
  badge?: string | null;
  isTopTipper: boolean;
}

export interface LeaderboardUpdatedPayload {
  creatorId: string;
  livestreamId?: string;
  timeframe?: "stream" | "daily" | "weekly" | "monthly" | "all_time";
  topContributors: LeaderboardEntry[];
  totalRoomContributors: number;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// 9. CONTENT_PURCHASED
// ----------------------------------------------------------------------------

export interface ContentPurchasedPayload {
  contentId: string;
  creatorId: string;
  creatorDisplayName?: string;
  buyerUserId: string;
  buyerDisplayName: string;
  title: string;
  contentType: "PHOTO" | "VIDEO" | "AUDIO" | "ALBUM" | "POST" | "BUNDLE" | string;
  priceCredits: number;
  purchasedAt: string;
  entitlementId?: string;
}

// ----------------------------------------------------------------------------
// 10. REACTIVE SUBSYSTEM PAYLOADS (Creator Revenue, Fan Wallet, Analytics)
// ----------------------------------------------------------------------------

export interface CreatorRevenueUpdatePayload {
  creatorId: string;
  eventType: StandardEventType;
  grossCredits: number;
  netCredits: number;
  platformRakeCredits: number;
  totalSessionCredits: number;
  sourceEventId: string;
  timestamp: string;
}

export interface FanWalletUpdatePayload {
  userId: string;
  eventType: StandardEventType;
  balanceDelta: number; // negative for debits, positive for refunds/deposits
  newAvailableBalance: number;
  referenceId: string;
  timestamp: string;
}

export interface AnalyticsEventRecordPayload {
  eventId: string;
  eventType: StandardEventType | string;
  creatorId?: string | null;
  userId?: string | null;
  livestreamId?: string | null;
  amountCredits?: number | null;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

// ----------------------------------------------------------------------------
// 11. VIRTUAL ROOM SEATS & SOCIAL POSITIONS
// ----------------------------------------------------------------------------

export interface SeatOccupiedPayload {
  creatorId: string;
  seatIndex: number;
  seatTier: "STANDARD_VIEWER" | "FRONT_ROW" | "VIP" | "INNER_CIRCLE" | "CREATOR_SELECTED_GUEST";
  occupant: {
    userId: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    fanLevel: number;
    badge?: string | null;
    entitlementReason: string;
    isCreatorGuest?: boolean;
    occupiedAt: string;
  };
  totalSeatedCount: number;
  timestamp: string;
}

export interface SeatVacatedPayload {
  creatorId: string;
  seatIndex: number;
  vacatedUserId: string;
  totalSeatedCount: number;
  timestamp: string;
}

export interface GuestInvitedPayload {
  creatorId: string;
  creatorDisplayName: string;
  guestUserId: string;
  guestDisplayName: string;
  seatIndex: number;
  invitationNote?: string;
  timestamp: string;
}

export interface RoomSeatsUpdatedPayload {
  creatorId: string;
  totalAudienceCount: number;
  totalSeatedCount: number;
  updatedAt: string;
}

// Tip notice backward-compatibility
export interface TipEventPayload {
  tipId: string;
  senderName: string;
  senderId: string;
  credits: number;
  actionTitle?: string;
  customMessage?: string;
  newGoalProgress: number;
  goalTarget: number;
  createdAt: Date | string;
}
