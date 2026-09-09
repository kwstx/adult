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

export const DAILY_WHEEL_WEDGES: readonly FreeGamePrizeWedge[] = [
  {
    id: "wedge_fan_xp_100",
    label: "+100 Fan XP",
    shortLabel: "100 XP",
    description: "Boost your global platform level and reputation tier.",
    rewardType: "FAN_XP",
    colorClass: "from-blue-600 to-cyan-500",
    accentColor: "#06b6d4",
    icon: "⚡",
    weight: 2500, // 25.0%
    probabilityPercentage: 25.0,
    rewardTemplate: {
      rewardType: "FAN_XP",
      xpAmount: 100,
      reason: "Daily Free Game Reward: +100 Fan XP",
    },
  },
  {
    id: "wedge_creator_xp_50",
    label: "+50 Creator XP",
    shortLabel: "50 Creator XP",
    description: "Deepen your relationship bond with your favorite creator.",
    rewardType: "CREATOR_RELATIONSHIP_XP",
    colorClass: "from-rose-600 to-pink-500",
    accentColor: "#f43f5e",
    icon: "💖",
    weight: 2500, // 25.0%
    probabilityPercentage: 25.0,
    rewardTemplate: {
      rewardType: "CREATOR_RELATIONSHIP_XP",
      xpAmount: 50,
      reason: "Daily Free Game Reward: +50 Creator Relationship XP",
    },
  },
  {
    id: "wedge_temp_badge",
    label: "⚡ Daily Champion",
    shortLabel: "Champ Badge",
    description: "Exclusive 24-hour illuminated chat badge and glow.",
    rewardType: "TEMPORARY_BADGE",
    colorClass: "from-amber-500 to-yellow-400",
    accentColor: "#f59e0b",
    icon: "👑",
    weight: 1500, // 15.0%
    probabilityPercentage: 15.0,
    rewardTemplate: {
      rewardType: "TEMPORARY_BADGE",
      badgeCode: "DAILY_CHAMPION",
      badgeName: "⚡ Daily Champion",
      badgeIcon: "👑",
      durationHours: 24,
      glowColor: "#f59e0b",
      description: "24-Hour VIP Chat Badge for active daily game winners.",
    },
  },
  {
    id: "wedge_front_row",
    label: "🔥 Front-Row Seat",
    shortLabel: "Front Row",
    description: "Guaranteed front-row bleacher seat entitlement for upcoming livestreams.",
    rewardType: "FRONT_ROW_SEAT",
    colorClass: "from-orange-500 to-amber-600",
    accentColor: "#f97316",
    icon: "🔥",
    weight: 1200, // 12.0%
    probabilityPercentage: 12.0,
    rewardTemplate: {
      rewardType: "FRONT_ROW_SEAT",
      seatTier: "FRONT_ROW",
      validLivestreamsCount: 1,
      priorityScore: 40,
      durationHours: 48,
      description: "Front-Row Livestream Seat Pass valid for 48 hours.",
    },
  },
  {
    id: "wedge_priority_interaction",
    label: "🚀 Priority Queue Pass",
    shortLabel: "Priority Pass",
    description: "Jump the queue on your next creator interaction request.",
    rewardType: "PRIORITY_INTERACTION",
    colorClass: "from-purple-600 to-indigo-500",
    accentColor: "#8b5cf6",
    icon: "🚀",
    weight: 1000, // 10.0%
    probabilityPercentage: 10.0,
    rewardTemplate: {
      rewardType: "PRIORITY_INTERACTION",
      voucherCode: "PRIORITY_PASS_FREE",
      queuePriorityMultiplier: 2.0,
      expiresInDays: 7,
      description: "2x Queue Speed Multiplier for live interaction requests.",
    },
  },
  {
    id: "wedge_fan_xp_250",
    label: "+250 Mega Fan XP",
    shortLabel: "250 XP",
    description: "Substantial progression surge for platform level milestones.",
    rewardType: "FAN_XP",
    colorClass: "from-emerald-600 to-teal-500",
    accentColor: "#10b981",
    icon: "⭐",
    weight: 800, // 8.0%
    probabilityPercentage: 8.0,
    rewardTemplate: {
      rewardType: "FAN_XP",
      xpAmount: 250,
      reason: "Daily Free Game Reward: +250 Mega Fan XP",
    },
  },
  {
    id: "wedge_creator_xp_150",
    label: "+150 Super Creator XP",
    shortLabel: "150 Creator XP",
    description: "Rapidly advance your fan relationship tier with the host.",
    rewardType: "CREATOR_RELATIONSHIP_XP",
    colorClass: "from-violet-600 to-fuchsia-500",
    accentColor: "#d946ef",
    icon: "💎",
    weight: 400, // 4.0%
    probabilityPercentage: 4.0,
    rewardTemplate: {
      rewardType: "CREATOR_RELATIONSHIP_XP",
      xpAmount: 150,
      reason: "Daily Free Game Reward: +150 Super Creator Relationship XP",
    },
  },
  {
    id: "wedge_content_unlock",
    label: "🎁 Secret Media Unlock",
    shortLabel: "Media Unlock",
    description: "Unlock a promotional exclusive photo/clip directly from creator vault.",
    rewardType: "CONTENT_UNLOCK",
    colorClass: "from-pink-500 to-rose-600",
    accentColor: "#ec4899",
    icon: "🎁",
    weight: 100, // 1.0% (Rare Grand Prize)
    probabilityPercentage: 1.0,
    rewardTemplate: {
      rewardType: "CONTENT_UNLOCK",
      contentId: "promo_exclusive_vault_01",
      contentTitle: "Backstage Exclusive VIP Snapshot",
      contentType: "PHOTO",
      description: "Exclusive promotional backstage photo unlocked via Free Daily Wheel.",
    },
  },
];
