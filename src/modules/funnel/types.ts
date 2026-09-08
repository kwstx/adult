// ============================================================================
// FIRST-SESSION FUNNEL ARCHITECTURE TYPES
// Authoritative definitions for the 13-stage first-time user discovery loop
// ============================================================================

import { RelationshipTierCode, TierBenefit } from "../relationship/types";

export type FunnelMilestoneType =
  | "LANDED"
  | "WATCH_STREAM"
  | "SWIPE_STREAM"
  | "OPEN_INTERACTION_MENU"
  | "FOLLOW_CREATOR"
  | "CLAIM_WELCOME_REWARD"
  | "MAKE_FIRST_PURCHASE"
  | "RELATIONSHIP_LEVEL_UP"
  | "RETURN_D1_READY";

export interface FunnelMilestoneProgress {
  hasLanded: boolean;
  watchDurationSeconds: number;
  watchMilestoneReached: boolean; // >= 25s
  swipedCreatorsCount: number;
  swipeMilestoneReached: boolean; // >= 1 swipe
  hasOpenedInteractionMenu: boolean;
  hasFollowedCreator: boolean;
  isRewardEligible: boolean; // (watch >= 25s OR followed >= 1) && !isRewardClaimed
  isRewardClaimed: boolean;
  hasMadeFirstPurchase: boolean;
  hasLeveledUpRelationship: boolean;
  currentStreakDays: number;
  nextMilestoneHint: string;
}

export interface FirstSessionRewardClaimInput {
  userId: string;
  creatorProfileId?: string;
  idempotencyKey?: string;
}

export interface FirstSessionRewardClaimResult {
  success: boolean;
  userId: string;
  grantedBonusCredits: number;
  grantedPlatformXp: number;
  achievementUnlocked: {
    code: string;
    name: string;
    badgeIcon: string;
    description: string;
  };
  walletBalanceAfter: number;
  bonusBalanceAfter: number;
  claimedAt: string;
  idempotencyKey: string;
  message: string;
}

export interface ReturnHookState {
  userId: string;
  currentStreakDays: number;
  longestStreakDays: number;
  nextDailyBonusMultiplier: number;
  nextDailyRewardType: "BONUS_CREDITS" | "WHEEL_SPIN" | "XP_BOOST";
  nextSessionAvailableAt: string;
  retentionMessage: string;
}

export interface FunnelStatusResponse {
  userId: string;
  milestones: FunnelMilestoneProgress;
  rewardClaimed: boolean;
  bonusCreditsAvailable: number;
  activeCreatorRelationship?: {
    creatorProfileId: string;
    relationshipTier: RelationshipTierCode;
    currentLevel: number;
    totalXp: number;
    coBrandTitle: string;
    unlockedPerks: TierBenefit[];
  } | null;
  returnHook: ReturnHookState;
}

export interface RecordMilestonePayload {
  userId: string;
  creatorProfileId?: string;
  milestoneType: FunnelMilestoneType;
  metadata?: Record<string, any>;
}
