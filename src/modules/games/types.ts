// ============================================================================
// AUTHORITATIVE FREE GAMES DOMAIN TYPES
// Strict Non-Monetary Gaming, Server-Side RNG & Financial Isolation Contracts
// ============================================================================

import { RelationshipTierCode } from "../relationship/types";
import { SocialSeatTier } from "@/types/seat";

/**
 * 1. SUPPORTED FREE GAME TYPES
 * 100% Free-to-play, non-wagering promotional & engagement mechanics.
 */
export type FreeGameType =
  | "DAILY_SPIN_WHEEL"
  | "DAILY_MYSTERY_BOX"
  | "LUCKY_CYBER_DROP";

/**
 * 2. PERMITTED NON-MONETARY REWARD TYPES
 * Strictly limited to progression, social proximity, and predetermined platform access.
 * NEVER allows Credits, Cash, Tokens, or Financial Payouts.
 */
export type FreeGameRewardType =
  | "FAN_XP"
  | "CREATOR_RELATIONSHIP_XP"
  | "TEMPORARY_BADGE"
  | "FRONT_ROW_SEAT"
  | "PRIORITY_INTERACTION"
  | "CONTENT_UNLOCK";

/**
 * Compile-time guard preventing monetary reward properties from ever being defined.
 */
export type ForbiddenFinancialKeys =
  | "credits"
  | "creditsAwarded"
  | "creditAmount"
  | "walletCredit"
  | "cashValue"
  | "payoutAmount"
  | "tokenAmount";

/**
 * 3. GAME REWARD VALUE DEFINITIONS (TYPED NON-FINANCIAL REWARDS)
 */

export interface FanXpRewardPayload {
  rewardType: "FAN_XP";
  xpAmount: number; // e.g. +100 Fan XP
  reason: string;
}

export interface CreatorRelationshipXpRewardPayload {
  rewardType: "CREATOR_RELATIONSHIP_XP";
  xpAmount: number; // e.g. +50 Creator Relationship XP
  creatorProfileId?: string;
  creatorStageName?: string;
  reason: string;
}

export interface TemporaryBadgeRewardPayload {
  rewardType: "TEMPORARY_BADGE";
  badgeCode: string; // e.g. "DAILY_CHAMPION", "LUCKY_STAR", "HOT_STREAK"
  badgeName: string; // e.g. "⚡ Daily Champion"
  badgeIcon: string;
  durationHours: number; // e.g. 24 hours, 72 hours
  glowColor: string;
  description: string;
}

export interface FrontRowSeatRewardPayload {
  rewardType: "FRONT_ROW_SEAT";
  seatTier: SocialSeatTier; // "FRONT_ROW" | "VIP"
  validLivestreamsCount: number; // e.g. 1 pass for next stream
  priorityScore: number;
  durationHours: number;
  description: string;
}

export interface PriorityInteractionRewardPayload {
  rewardType: "PRIORITY_INTERACTION";
  voucherCode: string;
  queuePriorityMultiplier: number; // e.g. 2x queue speed / front-of-queue token
  expiresInDays: number;
  description: string;
}

export interface ContentUnlockRewardPayload {
  rewardType: "CONTENT_UNLOCK";
  contentId: string;
  contentTitle: string;
  contentType: "PHOTO" | "VIDEO" | "AUDIO" | "POST";
  previewUrl?: string;
  description: string;
}

export type FreeGameReward =
  | FanXpRewardPayload
  | CreatorRelationshipXpRewardPayload
  | TemporaryBadgeRewardPayload
  | FrontRowSeatRewardPayload
  | PriorityInteractionRewardPayload
  | ContentUnlockRewardPayload;

/**
 * 4. TRANSPARENT ODDS TIER DEFINITION (Greek/EU Consumer Transparency)
 */
export interface FreeGamePrizeWedge {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  rewardType: FreeGameRewardType;
  colorClass: string;
  accentColor: string;
  icon: string;
  weight: number; // Probability weight in basis points (e.g. 3000 = 30%)
  probabilityPercentage: number; // Transparent displayed odds (e.g. 30.0%)
  rewardTemplate: FreeGameReward;
}

/**
 * 5. SERVER-AUTHORITATIVE OUTCOME
 */
export interface FreeGameOutcome {
  sessionId: string;
  gameType: FreeGameType;
  userId: string;
  winningWedgeIndex: number;
  winningWedge: FreeGamePrizeWedge;
  reward: FreeGameReward;
  // Animation synchronization parameters (client must stop on server target)
  animationSeed: {
    targetAngleDegrees: number;
    totalSpins: number;
    spinDurationMs: number;
    easing: "cubic-bezier(0.15, 0.9, 0.2, 1.0)";
  };
  serverTimestamp: string;
  cryptographicSignature: string;
}

/**
 * 6. REWARD FULFILLMENT RESULT
 */
export interface RewardFulfillmentResult {
  isSuccess: boolean;
  rewardType: FreeGameRewardType;
  summaryText: string;
  awardedDetails: {
    fanXpGained?: number;
    newPlatformLevel?: number;
    creatorRelationshipXpGained?: number;
    newRelationshipTier?: RelationshipTierCode;
    temporaryBadgeIssued?: {
      code: string;
      name: string;
      expiresAt: string;
    };
    seatPassIssued?: {
      tier: SocialSeatTier;
      passId: string;
      expiresAt: string;
    };
    interactionVoucherIssued?: {
      voucherId: string;
      code: string;
    };
    contentUnlocked?: {
      contentId: string;
      title: string;
    };
  };
  error?: string;
}

/**
 * 7. USER DAILY STATUS
 */
export interface DailyGameStatus {
  userId: string;
  canPlay: boolean;
  cooldownRemainingSeconds: number;
  nextAvailableAt: string | null;
  currentStreakDays: number;
  longestStreakDays: number;
  streakBonusMultiplier: number;
  lastPlayedAt: string | null;
  availablePrizes: FreeGamePrizeWedge[];
  complianceDisclaimer: GreekEuComplianceDisclosure;
}

/**
 * 8. GREEK / EU COMPLIANCE DISCLOSURE
 */
export interface GreekEuComplianceDisclosure {
  jurisdiction: "GREECE_EU_COMPLIANT";
  classification: "PROMOTIONAL_FREE_TO_PLAY_ENGAGEMENT";
  isWageringProhibited: true;
  isEconomicValueRedeemable: false;
  entryCostCredits: 0;
  financialIsolationGuaranteed: true;
  regulatoryNotice: string;
}
