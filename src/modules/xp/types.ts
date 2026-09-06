// ============================================================================
// AUTHORITATIVE XP & PROGRESSION ARCHITECTURE TYPES
// Core data models for Backend-Driven XP Generation, Ledgering & Level-Ups
// ============================================================================

import { RelationshipTierCode, TierBenefit } from "../relationship/types";

export type XpSourceEventType =
  | "STREAM_WATCH_TIME"
  | "LIVE_TIP"
  | "CHAT_MESSAGE"
  | "PPV_PURCHASE"
  | "SUBSCRIPTION_RENEWAL"
  | "GOAL_CONTRIBUTION"
  | "GAME_PARTICIPATION"
  | "PAID_MESSAGE"
  | "CUSTOM_BONUS";

export type PlaybackState = "PLAYING" | "PAUSED" | "BUFFERING" | "MUTED";

/**
 * 1. Viewing Telemetry Heartbeat sent by client
 * NOTE: The client only reports playback facts, never XP amounts.
 */
export interface ViewingHeartbeatPayload {
  fanId: string;
  creatorProfileId: string;
  livestreamId: string;
  viewingSessionId: string;
  intervalSeconds: number; // e.g. 30 seconds
  isWindowFocused: boolean;
  mediaPlaybackState: PlaybackState;
  clientTimestamp: number;
  sessionAccumulatedSeconds?: number;
  idempotencyKey?: string;
}

/**
 * 2. Backend Recorded Viewing Event
 */
export interface ViewingEventRecord {
  id: string;
  fanId: string;
  creatorProfileId: string;
  livestreamId: string;
  viewingSessionId: string;
  intervalSeconds: number;
  totalSessionSeconds: number;
  isWindowFocused: boolean;
  playbackState: PlaybackState;
  qualifiesForXp: boolean;
  disqualificationReason?: string;
  recordedAt: Date;
}

/**
 * 3. Progression Evaluation Result
 */
export interface ProgressionEvaluationResult {
  qualifies: boolean;
  reason: string;
  baseXp: number;
  qualifyingMinutes: number;
  multipliers: {
    streakMultiplier: number;
    subscriptionMultiplier: number;
    creatorLoyaltyMultiplier: number;
    specialEventMultiplier: number;
  };
  totalMultiplier: number;
  calculatedXp: number;
  isDailyCapReached: boolean;
  dailyCapRemainingXp: number;
}

/**
 * 4. Immutable XP Ledger Entry
 */
export interface XpLedgerEntry {
  id: string;
  fanId: string;
  creatorProfileId: string;
  sourceEventType: XpSourceEventType;
  sourceEventId: string; // e.g. viewingEventId, transactionId
  xpDelta: number;
  balanceBefore: number;
  balanceAfter: number;
  idempotencyKey: string;
  calculationDetails: {
    baseXp: number;
    multiplier: number;
    streakDays: number;
    qualifyingMinutes?: number;
    creditsSpent?: number;
    note?: string;
  };
  createdAt: Date;
}

/**
 * 5. Level & Tier Threshold State Check
 */
export interface LevelThresholdCheck {
  previousXp: number;
  newXp: number;
  xpDelta: number;
  previousLevel: number;
  newLevel: number;
  didLevelUp: boolean;
  levelsGained: number;
  previousTier: RelationshipTierCode;
  newTier: RelationshipTierCode;
  didTierUp: boolean;
  unlockedPerks: TierBenefit[];
  progressPercent: number;
  xpInCurrentTier: number;
  xpRequiredForNextTier: number;
  xpRemainingToNextTier: number;
}

/**
 * 6. Authoritative Real-Time Broadcast Payloads
 */
export interface XpAwardedEventPayload {
  eventId: string;
  fanId: string;
  fanDisplayName: string;
  creatorProfileId: string;
  creatorStageName: string;
  sourceEventType: XpSourceEventType;
  xpAwarded: number;
  previousXp: number;
  newTotalXp: number;
  currentLevel: number;
  currentTier: RelationshipTierCode;
  tierName: string;
  progressPercent: number;
  streakDays: number;
  streakMultiplier: number;
  awardedAt: string;
}

export type CelebrationAnimationTheme =
  | "CYBER_NEON"
  | "EMERALD_ELEVATION"
  | "PURPLE_VIP_BURST"
  | "PINK_AURA_WAVE"
  | "SOVEREIGN_GOLD_EXPLOSION";

export interface LevelUpEventPayload {
  eventId: string;
  fanId: string;
  fanUsername: string;
  fanDisplayName: string;
  fanAvatarUrl: string;
  creatorProfileId: string;
  creatorStageName: string;
  creatorAvatarUrl: string;
  coBrandTitle: string; // e.g. "ALEX × LUNA"
  previousLevel: number;
  newLevel: number;
  levelsGained: number;
  previousTier: RelationshipTierCode;
  newTier: RelationshipTierCode;
  newTierName: string;
  didTierUp: boolean;
  totalXp: number;
  xpAwarded: number;
  sourceEventType: XpSourceEventType;
  unlockedPerks: TierBenefit[];
  celebrationTheme: CelebrationAnimationTheme;
  animationType: "LEVEL_UP_RADIAL_EXPLOSION" | "TIER_TRANSFORMATION" | "GOLDEN_CORONATION";
  badgeColor: string;
  gradientClass: string;
  soundCue: "LEVEL_UP_CHIME" | "TIER_UPGRADE_FANFARE" | "ROYAL_TRUMPET";
  ledgerProofId: string;
  timestamp: string;
}

/**
 * 7. End-to-End Orchestrator Process Result
 */
export interface ProcessViewingHeartbeatResult {
  success: boolean;
  message: string;
  viewingEvent: ViewingEventRecord;
  progression: ProgressionEvaluationResult;
  ledgerEntry?: XpLedgerEntry;
  thresholdCheck?: LevelThresholdCheck;
  levelUpPayload?: LevelUpEventPayload;
  xpAwardedPayload?: XpAwardedEventPayload;
}
