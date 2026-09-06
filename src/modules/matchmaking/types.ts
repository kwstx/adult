// ============================================================================
// MATCHMAKING DECISION ENGINE - TYPE DEFINITIONS
// Production-grade types for backend evaluation, 8-gate filtering & ranking
// ============================================================================

export type MatchmakingIntent =
  | "CHAT"
  | "INTERACTIVE"
  | "WATCH"
  | "VIP"
  | "PRIVATE"
  | "DISCOVER";

export interface IntentMetadata {
  intent: MatchmakingIntent;
  label: string;
  tagline: string;
  iconName: string;
  accentColor: string;
  description: string;
}

export interface MatchmakingPreferences {
  languages?: string[]; // e.g. ["en", "es"]
  categories?: string[]; // e.g. ["dance", "gaming", "music", "asmr"]
  maxBudgetCredits?: number;
  preferActiveGoals?: boolean;
  minRelationshipTier?: string;
  allowHighViewerRooms?: boolean; // For chat vs broadcast preference
}

export interface MatchmakingRequest {
  userId?: string;
  intent: MatchmakingIntent;
  preferences?: MatchmakingPreferences;
  excludeCreatorIds?: string[]; // Used when user requests "Next Match"
}

export interface AvailableInteractionSummary {
  id: string;
  title: string;
  description?: string | null;
  actionType: string;
  priceCredits: number;
  durationSeconds?: number;
  intensityLevel?: number | null;
  iconUrl?: string | null;
}

export interface DecisionGateBreakdown {
  passed: boolean;
  scoreContribution: number; // 0 to 100
  notes: string;
}

export interface CandidateEvaluationGates {
  availability: DecisionGateBreakdown;
  category: DecisionGateBreakdown;
  language: DecisionGateBreakdown;
  userPreferences: DecisionGateBreakdown;
  permissions: DecisionGateBreakdown;
  relationship: DecisionGateBreakdown;
  historicalInteraction: DecisionGateBreakdown;
  roomCapacity: DecisionGateBreakdown;
}

export interface ScoringFactors {
  intentFitScore: number; // 0 - 100
  relationshipScore: number; // 0 - 100
  historicalScore: number; // 0 - 100
  capacityResponsivenessScore: number; // 0 - 100
  streamQualityScore: number; // 0 - 100
  languageMatchScore: number; // 0 - 100
  explorationBonus: number; // 0 - 15 (serendipity bonus for DISCOVER)
  totalWeightedScore: number; // 0 - 100
}

export interface MatchCandidate {
  creatorProfileId: string;
  creatorUserId: string;
  username: string;
  stageName: string;
  avatarUrl: string;
  bannerUrl?: string | null;
  bio?: string | null;
  category: string;
  tags: string[];
  languages: string[];
  
  // Live Stream state
  isLive: boolean;
  livestreamId?: string | null;
  streamTitle?: string | null;
  currentViewerCount: number;
  peakViewerCount?: number;
  hlsPlaybackUrl?: string | null;
  whepPlaybackUrl?: string | null;
  streamMode?: string;

  // Interactions & Goals
  availableInteractions: AvailableInteractionSummary[];
  activeGoalTitle?: string | null;
  activeGoalTargetCredits?: number | null;
  activeGoalProgressCredits?: number | null;
  pendingQueueCount: number;
  estimatedQueueWaitSeconds: number;

  // Relationship with requesting fan
  relationshipTier: string; // "STRANGER" | "SUPPORTER" | "SUPERFAN" | "VIP_DEVOTEE" | "SOULMATE" | "ROYAL_PATRON"
  relationshipTierName: string;
  currentLevel: number;
  fanXp: number;
  streakDays: number;
  isFollowing: boolean;
  isSubscribed: boolean;

  // Private session capability
  isPrivateAvailable: boolean;
  privateRatePerMinute?: number;

  // Decision Engine Output
  matchPercentage: number; // 0 - 100%
  scoring: ScoringFactors;
  gates: CandidateEvaluationGates;
  matchReasons: string[]; // High-level highlight badges (e.g. "98% Match", "Active Tip Triggers", "Low Queue Wait")
  rankedPosition: number;
}

export interface MatchDecision {
  matchedCandidate: MatchCandidate;
  intent: MatchmakingIntent;
  decisionTimestamp: string;
  sessionId: string;
  directJoinToken?: string;
  evaluationMetrics: {
    totalCandidatesFound: number;
    candidatesFilteredOut: number;
    candidatesRanked: number;
    executionTimeMs: number;
  };
  alternativeMatches: MatchCandidate[];
}

export interface MatchmakerResponse {
  success: boolean;
  decision?: MatchDecision;
  error?: string;
}
