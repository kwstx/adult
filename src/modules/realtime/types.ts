/**
 * Real-Time Event Types & Authoritative Payloads
 * Powers high-fanout live streaming rooms (2,000+ concurrent viewers) with zero polling.
 */

export type RealtimeEventType =
  | "GIFT_SENT"
  | "NEW_MESSAGE"
  | "CHAT_MESSAGE"
  | "VIEWER_JOINED"
  | "VIEWER_LEFT"
  | "GOAL_UPDATED"
  | "GOAL_COMPLETED"
  | "GOAL_CONTRIBUTION_RECEIVED"
  | "INTERACTION_PURCHASED"
  | "INTERACTION_ACCEPTED"
  | "INTERACTION_STARTED"
  | "INTERACTION_COMPLETED"
  | "INTERACTION_REJECTED"
  | "INTERACTION_CANCELLED"
  | "INTERACTION_REFUNDED"
  | "QUEUE_STATE_CHANGED"
  | "LEADERBOARD_UPDATED"
  | "PRESENCE_COUNT"
  | "ROOM_STATUS"
  | "TIP_EVENT"
  | "STREAM_HEALTH"
  | "RELATIONSHIP_UPDATE"
  | "XP_AWARDED"
  | "LEVEL_UP"
  | "MODERATION_ACTION"
  | "INTERACTION_TRIGGERED"
  | "NEW_INTERACTION_AVAILABLE"
  | "1ON1_REQUEST"
  | "SEAT_OCCUPIED"
  | "SEAT_VACATED"
  | "SEAT_CLAIMED"
  | "GUEST_INVITED"
  | "ROOM_SEATS_UPDATED"
  | "CONNECTED"
  | "HEARTBEAT";

export interface RealtimeEvent<T = unknown> {
  type: RealtimeEventType;
  payload: T;
  channel?: string;
  timestamp?: number;
}

// ----------------------------------------------------------------------------
// 1. GIFT_SENT EVENT
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

  // Authoritative Downstream State Updates
  updatedGoal: {
    title: string;
    target: number;
    progress: number;
    percentage: number;
    isCompleted: boolean;
  };

  updatedLeaderboard: LeaderboardEntry[];

  creatorEarningsDelta: {
    grossCredits: number;
    netCredits: number;
    platformRakeCredits: number;
    totalSessionCredits: number;
  };

  sentAt: string;
}

// ----------------------------------------------------------------------------
// 2. NEW_MESSAGE EVENT
// ----------------------------------------------------------------------------
export interface ChatMessagePayload {
  id: string;
  creatorId: string;
  senderId: string;
  senderName: string;
  senderRole: string; // FAN, CREATOR, MOD, VIP
  senderBadge?: string | null;
  senderSeatTier?: "STANDARD_VIEWER" | "FRONT_ROW" | "VIP" | "INNER_CIRCLE" | "CREATOR_SELECTED_GUEST" | null;
  senderDistanceToCreator?: number;
  text: string;
  isTipNotice?: boolean;
  tipAmount?: number;
  tipActionName?: string | null;
  createdAt: string | Date;
}

// ----------------------------------------------------------------------------
// 3. VIEWER_JOINED & VIEWER_LEFT EVENTS
// ----------------------------------------------------------------------------
export interface ViewerPresenceEventPayload {
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
}

// ----------------------------------------------------------------------------
// 4. GOAL_UPDATED EVENT
// ----------------------------------------------------------------------------
export interface GoalUpdatedPayload {
  goalId?: string;
  creatorId: string;
  title: string;
  target: number;
  progress: number;
  percentage: number;
  remaining: number;
  isCompleted: boolean;
  contributorCount?: number;
  recentContribution?: {
    fanId: string;
    fanName: string;
    amount: number;
    message?: string | null;
  };
  milestoneTriggered?: string;
}

export interface GoalContributionReceivedPayload {
  goalId: string;
  creatorId: string;
  contributor: {
    fanId: string;
    displayName: string;
    username: string;
    avatarUrl?: string | null;
    fanLevel: number;
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
  goalId: string;
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
  topContributors: Array<{
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
// 5. INTERACTION_PURCHASED & INTERACTION_ACCEPTED EVENTS
// ----------------------------------------------------------------------------
export interface InteractionPurchasedPayload {
  queueId: string;
  creatorId: string;
  senderId: string;
  senderName: string;
  actionItem: {
    id: string;
    title: string;
    creditCost: number;
    actionType: string; // DANCE, WHEEL_SPIN, ALERT_SOUND, CHAT_HIGHLIGHT, CUSTOM
  };
  customMessage?: string;
  status: "QUEUED" | "ACCEPTED" | "COMPLETED" | "REJECTED";
  purchasedAt: string;
}

export interface InteractionAcceptedPayload {
  queueId: string;
  creatorId: string;
  actionTitle: string;
  actionType: string;
  senderName: string;
  creatorNote?: string;
  acceptedAt: string;
}

// ----------------------------------------------------------------------------
// 6. LEADERBOARD_UPDATED EVENT
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
  topContributors: LeaderboardEntry[];
  totalRoomContributors: number;
  updatedAt: string;
}

// Backward-compatible alias for existing tip alerts
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

// ----------------------------------------------------------------------------
// 7. NEW_INTERACTION_AVAILABLE EVENT
// ----------------------------------------------------------------------------
export interface NewInteractionAvailablePayload {
  interaction: {
    id: string;
    creatorProfileId: string;
    type: "QUESTION" | "ACTIVITY" | "CHALLENGE" | "PRIORITY_INTERACTION" | "CUSTOM_EXPERIENCE";
    name: string;
    description: string;
    price: number;
    duration: number;
    quantity: number | null;
    remainingQuantity: number | null;
    whoCanPurchase: "ALL" | "FOLLOWERS" | "SUBSCRIBERS_ONLY" | "MIN_FAN_LEVEL_5";
    requiresAcceptance: boolean;
    entersQueue: boolean;
    isActive: boolean;
    icon: string;
    createdAt: string;
  };
  message: string;
  creatorId: string;
  publishedAt: string;
}

// ----------------------------------------------------------------------------
// 8. VIRTUAL ROOM SEATS & SOCIAL POSITIONS EVENTS
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

