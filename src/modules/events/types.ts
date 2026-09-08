/**
 * Authoritative Behavioral Event Architecture Core Types
 * 
 * "Almost everything important produces an event.
 *  You are effectively building a platform where the event stream describes user behavior."
 * 
 * Defines the core behavioral event taxonomy and typed payloads feeding the 8 downstream engines:
 * 1. Analytics
 * 2. Notifications
 * 3. Recommendations
 * 4. Leaderboards
 * 5. XP & Progression
 * 6. Creator CRM
 * 7. Fraud Detection
 * 8. Creator Analytics
 */

export type BehavioralEventType =
  | "USER_JOINED_LIVE"          // User entered a live broadcast
  | "USER_LEFT_LIVE"            // User left a live broadcast
  | "USER_FOLLOWED_CREATOR"     // User followed a creator profile
  | "USER_UNFOLLOWED_CREATOR"   // User unfollowed a creator profile
  | "USER_BOUGHT_CONTENT"       // User purchased PPV media/content
  | "USER_SENT_GIFT"            // User sent tip, gift drop, or super-chat
  | "GOAL_PROGRESSED"           // Stream collective goal received progress/contribution
  | "GOAL_COMPLETED"            // Stream collective goal reached 100% target
  | "LEVEL_INCREASED"           // Fan leveled up relationship XP or platform tier
  | "SESSION_BOOKED"            // 1-on-1 private video session scheduled
  | "SUBSCRIPTION_STARTED"      // User subscribed to a creator tier
  | "SUBSCRIPTION_RENEWED"      // Subscription billing cycle renewed
  | "INTERACTION_PURCHASED"     // User purchased a live interaction menu item
  | "MESSAGE_SENT"              // User sent chat or direct message
  | "VIEW_DURATION_HEARTBEAT";  // Periodic watch heartbeat for watch-time analytics

export interface EventActor {
  userId: string;
  username?: string;
  displayName: string;
  avatarUrl?: string | null;
  role?: string;
  fanLevel?: number;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
}

export interface BehavioralEventEnvelope<T = any> {
  id: string;
  type: BehavioralEventType;
  channel: string;                 // e.g. `room:creator_123`, `user:fan_456`, `global`
  timestamp: number;               // Unix epoch milliseconds
  actor: EventActor;
  creatorProfileId?: string | null;
  livestreamId?: string | null;
  entityId?: string | null;        // contentId, giftId, bookingId, goalId
  payload: T;
  metadata: {
    source: string;                // "web_client" | "authoritative_backend" | "economic_engine"
    version: string;
    correlationId?: string;
    causationId?: string;
    idempotencyKey?: string;
  };
}

// ----------------------------------------------------------------------------
// SPECIFIC BEHAVIORAL EVENT PAYLOADS
// ----------------------------------------------------------------------------

export interface UserJoinedLivePayload {
  livestreamId: string;
  creatorProfileId: string;
  userId: string;
  joinedAt: string;
  isSubscriber: boolean;
  tierLevel?: number;
  seatIndex?: number | null;
}

export interface UserFollowedCreatorPayload {
  userId: string;
  creatorProfileId: string;
  followedAt: string;
  notifyTier: "ALL" | "LIVE_ONLY" | "NONE";
}

export interface UserBoughtContentPayload {
  orderId: string;
  userId: string;
  creatorProfileId: string;
  contentId: string;
  contentTitle: string;
  contentType: string;
  priceCreditsPaid: number;
  purchasedAt: string;
}

export interface UserSentGiftPayload {
  orderId?: string;
  userId: string;
  creatorProfileId: string;
  livestreamId?: string;
  giftId?: string;
  giftName: string;
  amountCredits: number;
  creatorNetCredits: number;
  platformFeeCredits: number;
  customMessage?: string;
  sentAt: string;
}

export interface GoalProgressedPayload {
  goalId: string;
  creatorProfileId: string;
  livestreamId: string;
  goalTitle: string;
  contributorUserId: string;
  contributionCredits: number;
  currentCredits: number;
  targetCredits: number;
  percentComplete: number;
  isCompleted: boolean;
}

export interface LevelIncreasedPayload {
  userId: string;
  creatorProfileId?: string;
  previousLevel: number;
  newLevel: number;
  totalXp: number;
  xpSource: string;
  unlockedBadge?: string | null;
  unlockedPerks?: string[];
  leveledUpAt: string;
}

export interface SessionBookedPayload {
  orderId?: string;
  bookingId: string;
  fanId: string;
  creatorProfileId: string;
  scheduledStartTime: string;
  durationMinutes: number;
  totalCreditsEscrowed: number;
  bookedAt: string;
}

// ----------------------------------------------------------------------------
// DOWNSTREAM ENGINE DISPATCH REGISTRY & METRICS
// ----------------------------------------------------------------------------

export interface EventStreamMetrics {
  totalPublished: number;
  eventsByType: Record<string, number>;
  eventsDispatchedToAnalytics: number;
  eventsDispatchedToNotifications: number;
  eventsDispatchedToRecommendations: number;
  eventsDispatchedToLeaderboards: number;
  eventsDispatchedToProgression: number;
  eventsDispatchedToCrm: number;
  eventsDispatchedToFraud: number;
  eventsDispatchedToCreatorAnalytics: number;
  recentEvents: BehavioralEventEnvelope[];
}
