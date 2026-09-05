export type MediaConnectionState =
  | "IDLE"          // Item far down the queue; metadata only or not loaded yet
  | "PREWARMING"    // Next item (Creator B): poster preloaded, media probe / warm connection preparing
  | "ACTIVE"        // Current item (Creator A): full video playback + audio + active SSE/WebSocket
  | "SUSPENDED"     // Previous item (Creator Z): paused, media connection torn down, cached in memory
  | "DESTROYED";    // Evicted from the sliding window

export type StreamingCostTier =
  | "CONSERVATIVE"  // Only load metadata and poster image; zero media bandwidth until active swipe
  | "BALANCED"      // Preload poster + preload metadata & 1st video fragment when next in queue
  | "AGGRESSIVE";   // Pre-warm full WebRTC / Low-Latency HLS stream buffer for 0ms transition

export interface StreamingProfile {
  streamTitle: string;
  streamUrl: string;
  posterUrl: string | null;
  protocol?: "HLS" | "WEBRTC" | "MP4_SIMULATED";
  isLive: boolean;
  isPrivateShow: boolean;
  minTipForPrivate: number;
  tags: string[];
  primaryCategory: string;
}

export interface CreatorSummary {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  kycStatus: string;
  isVerified2257: boolean;
}

export interface StreamPresentation {
  currentGoal: {
    title: string;
    target: number;
    progress: number;
    percentage: number;
  };
  interactionItems: Array<{
    id: string;
    title: string;
    description: string | null;
    creditCost: number;
    actionType: string;
  }>;
  ppvCount: number;
}

export interface FeedCandidate {
  id: string; // CreatorProfile ID
  userId: string;
  creator: CreatorSummary;
  stream: StreamingProfile;
  viewerCount: number;
  popularitySignals: {
    trendingScore: number;
    hypeScore: number;
    chatVelocity: number;
    recentTipsCount: number;
    heatIndex: number;
    rankBadge?: string;
  };
  userRelationship: {
    isFollowing: boolean;
    hasSubscription: boolean;
    subscriptionTier: string | null;
  };
  presentation: StreamPresentation;
  recommendationScore: number;
}

export interface SlidingWindowSlots {
  previous: FeedCandidate | null; // Creator Z
  current: FeedCandidate | null;  // Creator A
  next: FeedCandidate | null;      // Creator B
}

export interface GestureState {
  touchStartY: number | null;
  touchCurrentY: number | null;
  dragOffsetY: number;
  isDragging: boolean;
  isTransitioning: boolean;
}
