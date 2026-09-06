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
  | "INTERACTION_PURCHASED"
  | "INTERACTION_ACCEPTED"
  | "LEADERBOARD_UPDATED"
  | "PRESENCE_COUNT"
  | "ROOM_STATUS"
  | "TIP_EVENT"
  | "STREAM_HEALTH"
  | "RELATIONSHIP_UPDATE"
  | "MODERATION_ACTION"
  | "INTERACTION_TRIGGERED"
  | "NEW_INTERACTION_AVAILABLE"
  | "1ON1_REQUEST"
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
  creatorId: string;
  title: string;
  target: number;
  progress: number;
  percentage: number;
  remaining: number;
  isCompleted: boolean;
  milestoneTriggered?: string;
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
