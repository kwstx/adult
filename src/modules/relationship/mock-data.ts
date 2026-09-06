// ============================================================================
// RELATIONSHIP SYSTEM DEMO DATA & MULTI-CREATOR SHOWCASE SEED
// Powers instant zero-config interactive showcase and demonstration
// ============================================================================

import {
  CreatorFanRelationshipDetail,
  FanMultiCreatorMatrix,
  CreatorRelationshipTreeData,
} from "./types";
import { calculateProgressionFromXp, RELATIONSHIP_TIERS } from "./tier-definitions";

export const DEMO_FAN_ALEX = {
  id: "fan_alex_demo",
  username: "alex_patron",
  displayName: "Alex",
  avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80",
};

export const DEMO_CREATOR_LUNA = {
  id: "creator_luna_profile",
  userId: "usr_luna_star",
  stageName: "Luna Starlight",
  username: "lunastarlight",
  avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80",
  initialXp: 52400, // ELITE Tier (50k+ XP)
  creditsSpent: 5240,
  minutesWatched: 1250,
  streakDays: 42,
};

export const DEMO_CREATOR_ELENA = {
  id: "creator_elena_profile",
  userId: "usr_elena_sol",
  stageName: "Elena Sol",
  username: "elenasol",
  avatarUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&auto=format&fit=crop&q=80",
  initialXp: 8200, // VIP Tier (5k - 15k XP)
  creditsSpent: 820,
  minutesWatched: 420,
  streakDays: 14,
};

export const DEMO_CREATOR_CHLOE = {
  id: "creator_chloe_profile",
  userId: "usr_chloe_siren",
  stageName: "Chloe Siren",
  username: "chloesiren",
  avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80",
  initialXp: 0, // NEW FAN Tier (0 / 500 XP)
  creditsSpent: 0,
  minutesWatched: 15,
  streakDays: 1,
};

/**
 * Generate mock relationship detail for any creator + fan combination
 */
export function generateMockRelationshipDetail(
  creator: typeof DEMO_CREATOR_LUNA,
  customXp?: number
): CreatorFanRelationshipDetail {
  const xp = customXp !== undefined ? customXp : creator.initialXp;
  const prog = calculateProgressionFromXp(xp);
  const coBrand = `${DEMO_FAN_ALEX.displayName.toUpperCase()} × ${creator.stageName.toUpperCase()}`;

  const currentTierIndex = RELATIONSHIP_TIERS.findIndex((t) => t.tier === prog.tier);

  const unlockedPerks = RELATIONSHIP_TIERS.flatMap((t, idx) =>
    idx <= currentTierIndex ? t.perks.map((p) => ({ ...p, isUnlocked: true })) : []
  );

  const lockedPerks = RELATIONSHIP_TIERS.flatMap((t, idx) =>
    idx > currentTierIndex ? t.perks.map((p) => ({ ...p, isUnlocked: false })) : []
  );

  return {
    id: `rel_${DEMO_FAN_ALEX.id}_${creator.id}`,
    fanId: DEMO_FAN_ALEX.id,
    fanUsername: DEMO_FAN_ALEX.username,
    fanDisplayName: DEMO_FAN_ALEX.displayName,
    fanAvatarUrl: DEMO_FAN_ALEX.avatarUrl,
    creatorProfileId: creator.id,
    creatorUserId: creator.userId,
    creatorStageName: creator.stageName,
    creatorUsername: creator.username,
    creatorAvatarUrl: creator.avatarUrl,
    coBrandTitle: coBrand,
    relationshipTier: prog.tier,
    tierName: prog.tierDef.name,
    currentLevel: prog.level,
    totalXp: xp,
    totalCreditsSpent: creator.creditsSpent,
    totalMinutesWatched: creator.minutesWatched,
    currentStreakDays: creator.streakDays,
    longestStreakDays: Math.max(creator.streakDays, 45),
    lastInteractedAt: new Date().toISOString(),
    progress: {
      currentTier: prog.tierDef,
      nextTier: prog.nextTierDef,
      totalXp: xp,
      currentLevel: prog.level,
      xpInCurrentTier: prog.xpInCurrentTier,
      xpRequiredForNextTier: prog.xpRequiredForNextTier,
      progressPercent: prog.progressPercent,
      isMaxTier: prog.isMaxTier,
      xpRemainingToNextTier: prog.xpRemainingToNextTier,
    },
    unlockedPerks,
    lockedPerks,
  };
}

/**
 * Generate full mock multi-creator comparison matrix
 */
export function generateMockMultiCreatorMatrix(): FanMultiCreatorMatrix {
  const lunaRel = generateMockRelationshipDetail(DEMO_CREATOR_LUNA);
  const elenaRel = generateMockRelationshipDetail(DEMO_CREATOR_ELENA);
  const chloeRel = generateMockRelationshipDetail(DEMO_CREATOR_CHLOE);

  return {
    fanId: DEMO_FAN_ALEX.id,
    fanUsername: DEMO_FAN_ALEX.username,
    fanDisplayName: DEMO_FAN_ALEX.displayName,
    fanAvatarUrl: DEMO_FAN_ALEX.avatarUrl,
    totalCreatorsSupported: 3,
    highestTierWithAnyCreator: "ELITE",
    relationships: [
      {
        creatorProfileId: DEMO_CREATOR_LUNA.id,
        creatorStageName: DEMO_CREATOR_LUNA.stageName,
        creatorUsername: DEMO_CREATOR_LUNA.username,
        creatorAvatarUrl: DEMO_CREATOR_LUNA.avatarUrl,
        coBrandTitle: lunaRel.coBrandTitle,
        relationshipTier: lunaRel.relationshipTier,
        tierName: lunaRel.tierName,
        totalXp: lunaRel.totalXp,
        currentLevel: lunaRel.currentLevel,
        progressPercent: lunaRel.progress.progressPercent,
        xpInCurrentTier: lunaRel.progress.xpInCurrentTier,
        xpRequiredForNextTier: lunaRel.progress.xpRequiredForNextTier,
        totalCreditsSpent: lunaRel.totalCreditsSpent,
        totalMinutesWatched: lunaRel.totalMinutesWatched,
        streakDays: lunaRel.currentStreakDays,
        badgeGradient: lunaRel.progress.currentTier.gradientClass,
      },
      {
        creatorProfileId: DEMO_CREATOR_ELENA.id,
        creatorStageName: DEMO_CREATOR_ELENA.stageName,
        creatorUsername: DEMO_CREATOR_ELENA.username,
        creatorAvatarUrl: DEMO_CREATOR_ELENA.avatarUrl,
        coBrandTitle: elenaRel.coBrandTitle,
        relationshipTier: elenaRel.relationshipTier,
        tierName: elenaRel.tierName,
        totalXp: elenaRel.totalXp,
        currentLevel: elenaRel.currentLevel,
        progressPercent: elenaRel.progress.progressPercent,
        xpInCurrentTier: elenaRel.progress.xpInCurrentTier,
        xpRequiredForNextTier: elenaRel.progress.xpRequiredForNextTier,
        totalCreditsSpent: elenaRel.totalCreditsSpent,
        totalMinutesWatched: elenaRel.totalMinutesWatched,
        streakDays: elenaRel.currentStreakDays,
        badgeGradient: elenaRel.progress.currentTier.gradientClass,
      },
      {
        creatorProfileId: DEMO_CREATOR_CHLOE.id,
        creatorStageName: DEMO_CREATOR_CHLOE.stageName,
        creatorUsername: DEMO_CREATOR_CHLOE.username,
        creatorAvatarUrl: DEMO_CREATOR_CHLOE.avatarUrl,
        coBrandTitle: chloeRel.coBrandTitle,
        relationshipTier: chloeRel.relationshipTier,
        tierName: chloeRel.tierName,
        totalXp: chloeRel.totalXp,
        currentLevel: chloeRel.currentLevel,
        progressPercent: chloeRel.progress.progressPercent,
        xpInCurrentTier: chloeRel.progress.xpInCurrentTier,
        xpRequiredForNextTier: chloeRel.progress.xpRequiredForNextTier,
        totalCreditsSpent: chloeRel.totalCreditsSpent,
        totalMinutesWatched: chloeRel.totalMinutesWatched,
        streakDays: chloeRel.currentStreakDays,
        badgeGradient: chloeRel.progress.currentTier.gradientClass,
      },
    ],
  };
}

/**
 * Generate mock relationship tree for a creator
 */
export function generateMockRelationshipTree(
  creator: typeof DEMO_CREATOR_LUNA,
  fanXp?: number
): CreatorRelationshipTreeData {
  const currentRel = generateMockRelationshipDetail(creator, fanXp);
  const currentTierIndex = RELATIONSHIP_TIERS.findIndex(
    (t) => t.tier === currentRel.relationshipTier
  );

  const tiers = RELATIONSHIP_TIERS.map((t, idx) => ({
    ...t,
    isActive: idx <= currentTierIndex,
    isPassed: idx < currentTierIndex,
    isCurrent: idx === currentTierIndex,
    fanCount: idx === 5 ? 12 : idx === 4 ? 48 : idx === 3 ? 180 : 450,
  }));

  return {
    creatorProfileId: creator.id,
    creatorStageName: creator.stageName,
    creatorAvatarUrl: creator.avatarUrl,
    fanId: DEMO_FAN_ALEX.id,
    fanUsername: DEMO_FAN_ALEX.username,
    coBrandTitle: currentRel.coBrandTitle,
    tiers,
    currentRelationship: currentRel,
  };
}
