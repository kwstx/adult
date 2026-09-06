/**
 * ============================================================================
 * RECOMMENDATION ENGINE & EVENT COLLECTION SYSTEM TYPES
 * ============================================================================
 */

export type RecommendationEventType =
  | "IMPRESSION"           // Creator card or stream snippet rendered on screen
  | "SWIPE"                // User swiped or navigated between candidate streams
  | "WATCH"                // Active watch milestone reached (3s, 15s, 30s, 60s, 120s+)
  | "EXIT"                 // Stream exit / app backgrounding with final dwell time
  | "FOLLOW"               // User followed creator profile
  | "UNFOLLOW"             // User unfollowed creator profile
  | "LIKE"                 // Reaction / heart emitted
  | "CHAT"                 // Chat message sent in stream room
  | "GIFT"                 // Paid token / tip / virtual gift sent
  | "INTERACTION"          // Menu interaction / toy command / interactive action executed
  | "SUBSCRIPTION"         // Subscribed or renewed monthly membership tier
  | "CONTENT_PURCHASE"     // PPV media / album / exclusive video unlocked
  | "PRIVATE_SESSION"      // 1-on-1 private VIP booking created or attended
  | "SEARCH"               // User searched query keyword or clicked category filter
  | "CREATOR_PROFILE_VIEW"; // User viewed creator profile / bio / storefront

export interface RawEventPayload {
  sessionId?: string;
  userId?: string | null;
  creatorId?: string | null;
  creatorProfileId?: string | null;
  streamId?: string | null;
  livestreamId?: string | null;
  contentId?: string | null;
  eventType: RecommendationEventType | string;
  dwellTimeMs?: number;
  watchDurationSeconds?: number;
  searchQuery?: string;
  category?: string;
  tags?: string[] | string;
  amountCredits?: number;
  positionIndex?: number;
  deviceType?: string;
  metadata?: Record<string, any>;
  timestamp?: number | string | Date;
}

export interface IngestEventsRequest {
  sessionId?: string;
  userId?: string | null;
  events: RawEventPayload[];
}

export interface IngestEventsResponse {
  success: boolean;
  ingestedCount: number;
  streamPublishedCount: number;
  serverTimestamp: string;
}

/**
 * Real-time and historical signals for a user-creator pair
 */
export interface UserEngagementHistory {
  isFollowing: boolean;
  isSubscribed: boolean;
  subscriptionTier?: string | null;
  totalWatchSeconds: number;
  watchCount: number;
  distinctReturnDays: number;
  lastWatchedAt?: Date | null;
  giftsCount: number;
  totalGiftsCredits: number;
  interactionsCount: number;
  contentPurchasesCount: number;
  privateSessionsCount: number;
  bouncesCount: number; // Exits < 3 seconds or fast skips
  unfollowedRecently: boolean;
}

/**
 * User aggregated category and tag interest vector
 */
export interface UserAffinityProfile {
  userId: string;
  categoryWeights: Record<string, number>; // Normalized affinity scores [0.0 - 1.0]
  topCategories: string[];
  totalPositiveEvents: number;
  totalNegativeEvents: number;
  lastActiveAt: Date;
}

/**
 * Creator real-time popularity & momentum signals
 */
export interface CreatorPopularityMetrics {
  creatorProfileId: string;
  isLive: boolean;
  viewerCount: number;
  chatVelocityPerMin: number;
  recentGiftsCount1h: number;
  recentGiftsCredits1h: number;
  heatScore: number; // 0 - 100
  trendingRank?: number;
}

/**
 * Detailed signal scores and transparent breakdown for explainability
 */
export interface RecommendationScoreBreakdown {
  baseScore: number;
  followScore: number;          // Very strong signal (+1000)
  subscriptionScore: number;    // Very strong signal (+1500)
  previouslyWatchedScore: number;// Strong signal (+300)
  watchDurationScore: number;   // Strong signal (up to +500)
  repeatedReturnScore: number;  // Strong signal (up to +540)
  categoryAffinityScore: number;// Moderate signal (up to +350)
  popularityScore: number;      // Moderate signal (up to +350)
  negativePenaltyScore: number; // Negative signal (-350 to -800)
  freshnessExplorationScore: number; // Exploration (+50 to +150)
  totalScore: number;
  confidence: number;
  primaryDrivers: string[];
  humanReadableExplanation: string;
}

/**
 * Enriched candidate ready for discovery client presentation
 */
export interface ScoredCandidateCreator {
  id: string; // CreatorProfile ID
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  kycStatus: string;
  isVerified2257: boolean;
  stream: {
    title: string;
    isLive: boolean;
    viewerCount: number;
    category: string;
    tags: string[];
    posterUrl: string | null;
    streamUrl: string;
    minTipForPrivate: number;
  };
  recommendationScore: number;
  scoreBreakdown: RecommendationScoreBreakdown;
  relationship: {
    isFollowing: boolean;
    isSubscribed: boolean;
    subscriptionTier: string | null;
    watchHistorySeconds: number;
    returnSessionsCount: number;
  };
}

/**
 * Machine Learning Feature Vectors (ready for tabular/embedding training)
 */
export interface MLFeatureVector {
  // Metadata
  sampleId: string;
  timestamp: string;
  userId: string;
  creatorProfileId: string;

  // User Features
  user_lifetime_events_count: number;
  user_avg_watch_duration_sec: number;
  user_bounce_rate: number;
  user_gift_propensity: number;
  user_preferred_category: string;
  user_active_hours_recency: number;

  // Item / Creator Features
  creator_total_followers: number;
  creator_is_live: boolean;
  creator_current_viewers: number;
  creator_chat_velocity: number;
  creator_heat_index: number;
  creator_primary_category: string;

  // Cross Interaction Features (User x Creator)
  pair_is_following: number;       // 1 or 0
  pair_is_subscribed: number;      // 1 or 0
  pair_previous_watch_count: number;
  pair_total_watch_seconds: number;
  pair_distinct_return_sessions: number;
  pair_category_cosine_similarity: number;
  pair_previous_bounce_count: number;
  pair_gifts_sent_count: number;

  // Target Labels (Ground truth for training)
  label_watched_30s: number;       // Binary classification target
  label_dwell_seconds: number;     // Regression target
  label_converted_gift_sub: number;// High-value conversion target
}
