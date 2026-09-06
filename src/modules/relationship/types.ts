// ============================================================================
// CREATOR-FAN RELATIONSHIP TREE & PROGRESSION SYSTEM TYPES
// Production-grade types for creator-specific audience relationships & XP
// ============================================================================

export type RelationshipTierCode =
  | "NEW_FAN"
  | "SUPPORTER"
  | "REGULAR"
  | "VIP"
  | "INNER_CIRCLE"
  | "ELITE";

export interface TierBenefit {
  id: string;
  title: string;
  description: string;
  iconName: string;
  isUnlocked: boolean;
}

export interface TierDefinition {
  tier: RelationshipTierCode;
  name: string;
  subtitle: string;
  minXp: number;
  maxXp: number | null; // null for highest tier (ELITE)
  levelRange: [number, number];
  badgeColor: string;
  gradientClass: string;
  glowColor: string;
  icon: string;
  perks: TierBenefit[];
}

export interface RelationshipProgress {
  currentTier: TierDefinition;
  nextTier: TierDefinition | null;
  totalXp: number;
  currentLevel: number;
  xpInCurrentTier: number;
  xpRequiredForNextTier: number;
  progressPercent: number; // 0 to 100
  isMaxTier: boolean;
  xpRemainingToNextTier: number;
}

export type RelationshipXPType =
  | "LIVE_TIP"
  | "CHAT_MESSAGE"
  | "STREAM_WATCH_TIME"
  | "PPV_PURCHASE"
  | "SUBSCRIPTION_RENEWAL"
  | "GOAL_CONTRIBUTION"
  | "GAME_PARTICIPATION"
  | "PAID_MESSAGE"
  | "CUSTOM_BONUS";

export interface AwardEngagementXPParams {
  fanId: string;
  creatorProfileId: string;
  eventType: RelationshipXPType;
  creditsSpent?: number;
  minutesWatched?: number;
  messagesCount?: number;
  customXpAmount?: number;
  metadata?: Record<string, unknown>;
}

export interface AwardXPResult {
  previousXp: number;
  newXp: number;
  xpAwarded: number;
  previousTier: RelationshipTierCode;
  newTier: RelationshipTierCode;
  didLevelUpTier: boolean;
  previousLevel: number;
  newLevel: number;
  relationship: CreatorFanRelationshipDetail;
  unlockedPerks?: TierBenefit[];
}

export interface CreatorFanRelationshipDetail {
  id: string;
  fanId: string;
  fanUsername: string;
  fanDisplayName: string;
  fanAvatarUrl: string;
  creatorProfileId: string;
  creatorUserId: string;
  creatorStageName: string;
  creatorUsername: string;
  creatorAvatarUrl: string;
  coBrandTitle: string; // e.g. "ALEX × LUNA"
  relationshipTier: RelationshipTierCode;
  tierName: string;
  currentLevel: number;
  totalXp: number;
  totalCreditsSpent: number;
  totalMinutesWatched: number;
  currentStreakDays: number;
  longestStreakDays: number;
  lastInteractedAt: string;
  customNickname?: string | null;
  progress: RelationshipProgress;
  unlockedPerks: TierBenefit[];
  lockedPerks: TierBenefit[];
}

export interface CreatorRelationshipTreeData {
  creatorProfileId: string;
  creatorStageName: string;
  creatorAvatarUrl: string;
  fanId?: string;
  fanUsername?: string;
  coBrandTitle?: string;
  tiers: (TierDefinition & {
    isActive: boolean;
    isPassed: boolean;
    isCurrent: boolean;
    fanCount?: number;
  })[];
  currentRelationship?: CreatorFanRelationshipDetail | null;
}

export interface FanCreatorRelationshipCard {
  creatorProfileId: string;
  creatorStageName: string;
  creatorUsername: string;
  creatorAvatarUrl: string;
  coBrandTitle: string;
  relationshipTier: RelationshipTierCode;
  tierName: string;
  totalXp: number;
  currentLevel: number;
  progressPercent: number;
  xpInCurrentTier: number;
  xpRequiredForNextTier: number;
  totalCreditsSpent: number;
  totalMinutesWatched: number;
  streakDays: number;
  badgeGradient: string;
}

export interface FanMultiCreatorMatrix {
  fanId: string;
  fanUsername: string;
  fanDisplayName: string;
  fanAvatarUrl: string;
  totalCreatorsSupported: number;
  highestTierWithAnyCreator: RelationshipTierCode;
  relationships: FanCreatorRelationshipCard[];
}
