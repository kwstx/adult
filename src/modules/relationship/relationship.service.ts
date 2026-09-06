// ============================================================================
// AUTHORITATIVE CREATOR-FAN RELATIONSHIP SERVICE
// Production-grade backend service for Creator-Specific Relationship Progression
// ============================================================================

import { prisma } from "@/lib/db";
import {
  AwardEngagementXPParams,
  AwardXPResult,
  CreatorFanRelationshipDetail,
  CreatorRelationshipTreeData,
  FanCreatorRelationshipCard,
  FanMultiCreatorMatrix,
  RelationshipTierCode,
  RelationshipXPType,
  TierBenefit,
} from "./types";
import {
  calculateProgressionFromXp,
  calculateXpToAward,
  getTierDefinition,
  normalizeRelationshipTier,
  RELATIONSHIP_TIERS,
} from "./tier-definitions";
import { eventBus } from "../realtime/event-bus";

export class RelationshipService {
  /**
   * Helper to build co-branded relationship title: e.g. "ALEX × LUNA"
   */
  public static buildCoBrandTitle(fanName: string, creatorName: string): string {
    const cleanFan = (fanName || "Fan").toUpperCase();
    const cleanCreator = (creatorName || "Creator").toUpperCase();
    return `${cleanFan} × ${cleanCreator}`;
  }

  /**
   * 1. GET OR INITIALIZE FAN-CREATOR RELATIONSHIP
   * Returns authoritative relationship details, tier progress, and perks.
   */
  public static async getRelationship(
    fanId: string,
    creatorProfileIdOrUserId: string
  ): Promise<CreatorFanRelationshipDetail> {
    // Resolve creator profile
    const creator = await prisma.creatorProfile.findFirst({
      where: {
        OR: [
          { id: creatorProfileIdOrUserId },
          { userId: creatorProfileIdOrUserId },
          { user: { username: creatorProfileIdOrUserId } },
        ],
      },
      include: {
        user: true,
      },
    });

    if (!creator) {
      throw new Error(`Creator profile not found: ${creatorProfileIdOrUserId}`);
    }

    const fan = await prisma.user.findUnique({
      where: { id: fanId },
    });

    if (!fan) {
      throw new Error(`User/Fan not found: ${fanId}`);
    }

    // Find or create relationship record
    let rel = await prisma.creatorRelationship.findUnique({
      where: {
        fanId_creatorProfileId: {
          fanId: fan.id,
          creatorProfileId: creator.id,
        },
      },
    });

    if (!rel) {
      // Initialize new relationship at NEW_FAN (0 XP)
      rel = await prisma.creatorRelationship.create({
        data: {
          fanId: fan.id,
          creatorProfileId: creator.id,
          relationshipTier: "STRANGER" as any,
          currentLevel: 1,
          totalXp: BigInt(0),
          totalCreditsSpent: BigInt(0),
          totalMinutesWatched: 0,
          currentStreakDays: 1,
          longestStreakDays: 1,
          lastInteractedAt: new Date(),
        },
      });
    }

    const totalXpNum = Number(rel.totalXp);
    const progression = calculateProgressionFromXp(totalXpNum);
    const coBrand = this.buildCoBrandTitle(
      fan.displayName || fan.username,
      creator.stageName || creator.user.displayName || creator.user.username
    );

    // Filter unlocked vs locked perks
    const unlockedPerks: TierBenefit[] = [];
    const lockedPerks: TierBenefit[] = [];

    const currentTierIndex = RELATIONSHIP_TIERS.findIndex(
      (t) => t.tier === progression.tier
    );

    RELATIONSHIP_TIERS.forEach((tierDef, index) => {
      tierDef.perks.forEach((perk) => {
        if (index <= currentTierIndex) {
          unlockedPerks.push({ ...perk, isUnlocked: true });
        } else {
          lockedPerks.push({ ...perk, isUnlocked: false });
        }
      });
    });

    return {
      id: rel.id,
      fanId: fan.id,
      fanUsername: fan.username,
      fanDisplayName: fan.displayName,
      fanAvatarUrl: fan.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
      creatorProfileId: creator.id,
      creatorUserId: creator.userId,
      creatorStageName: creator.stageName || creator.user.displayName,
      creatorUsername: creator.user.username,
      creatorAvatarUrl:
        creator.user.avatarUrl ||
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
      coBrandTitle: coBrand,
      relationshipTier: progression.tier,
      tierName: progression.tierDef.name,
      currentLevel: progression.level,
      totalXp: totalXpNum,
      totalCreditsSpent: Number(rel.totalCreditsSpent),
      totalMinutesWatched: rel.totalMinutesWatched,
      currentStreakDays: rel.currentStreakDays,
      longestStreakDays: rel.longestStreakDays,
      lastInteractedAt: rel.lastInteractedAt.toISOString(),
      customNickname: rel.customNickname,
      progress: {
        currentTier: progression.tierDef,
        nextTier: progression.nextTierDef,
        totalXp: totalXpNum,
        currentLevel: progression.level,
        xpInCurrentTier: progression.xpInCurrentTier,
        xpRequiredForNextTier: progression.xpRequiredForNextTier,
        progressPercent: progression.progressPercent,
        isMaxTier: progression.isMaxTier,
        xpRemainingToNextTier: progression.xpRemainingToNextTier,
      },
      unlockedPerks,
      lockedPerks,
    };
  }

  /**
   * 2. AWARD ENGAGEMENT XP (AUTHORITATIVE BACKEND TRANSACTION)
   * Records XP, handles streaks, checks tier upgrades, and fires real-time alerts.
   */
  public static async awardEngagementXP(
    params: AwardEngagementXPParams
  ): Promise<AwardXPResult> {
    const {
      fanId,
      creatorProfileId,
      eventType,
      creditsSpent = 0,
      minutesWatched = 0,
      messagesCount = 0,
      customXpAmount,
      metadata = {},
    } = params;

    // Resolve Creator
    const creator = await prisma.creatorProfile.findFirst({
      where: {
        OR: [{ id: creatorProfileId }, { userId: creatorProfileId }],
      },
      include: { user: true },
    });

    if (!creator) {
      throw new Error(`Creator not found: ${creatorProfileId}`);
    }

    const fan = await prisma.user.findUnique({
      where: { id: fanId },
    });

    if (!fan) {
      throw new Error(`Fan not found: ${fanId}`);
    }

    // Execute atomic transaction
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch or create relationship
      let rel = await tx.creatorRelationship.findUnique({
        where: {
          fanId_creatorProfileId: {
            fanId: fan.id,
            creatorProfileId: creator.id,
          },
        },
      });

      if (!rel) {
        rel = await tx.creatorRelationship.create({
          data: {
            fanId: fan.id,
            creatorProfileId: creator.id,
            relationshipTier: "STRANGER" as any,
            currentLevel: 1,
            totalXp: BigInt(0),
            totalCreditsSpent: BigInt(0),
            totalMinutesWatched: 0,
            currentStreakDays: 1,
            longestStreakDays: 1,
            lastInteractedAt: new Date(),
          },
        });
      }

      const previousXp = Number(rel.totalXp);
      const prevProgression = calculateProgressionFromXp(previousXp);
      const previousTier = prevProgression.tier;
      const previousLevel = prevProgression.level;

      // 2. Streak calculation
      const now = new Date();
      const lastInteracted = new Date(rel.lastInteractedAt);
      const diffMs = now.getTime() - lastInteracted.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      let newStreak = rel.currentStreakDays;
      if (diffHours >= 20 && diffHours <= 48) {
        // Consecutive day engagement
        newStreak += 1;
      } else if (diffHours > 48) {
        // Streak broken
        newStreak = 1;
      }

      const newLongestStreak = Math.max(newStreak, rel.longestStreakDays);

      // 3. Compute XP
      const xpToAward = calculateXpToAward(eventType, {
        creditsSpent,
        minutesWatched,
        messagesCount,
        customXpAmount,
        streakDays: newStreak,
      });

      const newTotalXp = previousXp + xpToAward;
      const newProgression = calculateProgressionFromXp(newTotalXp);
      const newTier = newProgression.tier;
      const newLevel = newProgression.level;
      const didLevelUpTier = previousTier !== newTier;

      // Map RelationshipTier enum for db compatibility
      const dbTierEnum =
        newTier === "NEW_FAN"
          ? "STRANGER"
          : newTier === "REGULAR"
          ? "SUPERFAN"
          : newTier === "INNER_CIRCLE"
          ? "SOULMATE"
          : newTier === "ELITE"
          ? "ROYAL_PATRON"
          : newTier === "VIP"
          ? "VIP_DEVOTEE"
          : "SUPPORTER";

      // 4. Update relationship record
      const updatedRel = await tx.creatorRelationship.update({
        where: { id: rel.id },
        data: {
          totalXp: BigInt(newTotalXp),
          currentLevel: newLevel,
          relationshipTier: dbTierEnum as any,
          totalCreditsSpent: {
            increment: BigInt(creditsSpent),
          },
          totalMinutesWatched: {
            increment: minutesWatched,
          },
          currentStreakDays: newStreak,
          longestStreakDays: newLongestStreak,
          lastInteractedAt: now,
        },
      });

      // 5. Audit Log XP Event
      await tx.relationshipXPEvent.create({
        data: {
          creatorRelationshipId: rel.id,
          fanId: fan.id,
          creatorProfileId: creator.id,
          eventType: (eventType as any) || "LIVE_TIP",
          xpAwarded: xpToAward,
          creditsMultiplier: 1.0 + Math.min(0.5, newStreak * 0.05),
          metadataJson: JSON.stringify({
            ...metadata,
            creditsSpent,
            minutesWatched,
            messagesCount,
            previousXp,
            newTotalXp,
            didLevelUpTier,
            previousTier,
            newTier,
          }),
        },
      });

      // 6. Assemble details
      const coBrand = this.buildCoBrandTitle(
        fan.displayName || fan.username,
        creator.stageName || creator.user.displayName || creator.user.username
      );

      const unlockedPerks: TierBenefit[] = [];
      const lockedPerks: TierBenefit[] = [];
      const newTierIndex = RELATIONSHIP_TIERS.findIndex((t) => t.tier === newTier);

      RELATIONSHIP_TIERS.forEach((tierDef, index) => {
        tierDef.perks.forEach((perk) => {
          if (index <= newTierIndex) {
            unlockedPerks.push({ ...perk, isUnlocked: true });
          } else {
            lockedPerks.push({ ...perk, isUnlocked: false });
          }
        });
      });

      const detail: CreatorFanRelationshipDetail = {
        id: updatedRel.id,
        fanId: fan.id,
        fanUsername: fan.username,
        fanDisplayName: fan.displayName,
        fanAvatarUrl: fan.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
        creatorProfileId: creator.id,
        creatorUserId: creator.userId,
        creatorStageName: creator.stageName || creator.user.displayName,
        creatorUsername: creator.user.username,
        creatorAvatarUrl:
          creator.user.avatarUrl ||
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
        coBrandTitle: coBrand,
        relationshipTier: newTier,
        tierName: newProgression.tierDef.name,
        currentLevel: newLevel,
        totalXp: newTotalXp,
        totalCreditsSpent: Number(updatedRel.totalCreditsSpent),
        totalMinutesWatched: updatedRel.totalMinutesWatched,
        currentStreakDays: updatedRel.currentStreakDays,
        longestStreakDays: updatedRel.longestStreakDays,
        lastInteractedAt: updatedRel.lastInteractedAt.toISOString(),
        customNickname: updatedRel.customNickname,
        progress: {
          currentTier: newProgression.tierDef,
          nextTier: newProgression.nextTierDef,
          totalXp: newTotalXp,
          currentLevel: newLevel,
          xpInCurrentTier: newProgression.xpInCurrentTier,
          xpRequiredForNextTier: newProgression.xpRequiredForNextTier,
          progressPercent: newProgression.progressPercent,
          isMaxTier: newProgression.isMaxTier,
          xpRemainingToNextTier: newProgression.xpRemainingToNextTier,
        },
        unlockedPerks,
        lockedPerks,
      };

      // 7. Emit Real-time Event
      try {
        eventBus.publish(`room:${creator.userId}`, {
          type: "RELATIONSHIP_UPDATE",
          payload: {
            fanId: fan.id,
            fanName: fan.displayName,
            fanAvatar: fan.avatarUrl,
            creatorProfileId: creator.id,
            coBrandTitle: coBrand,
            xpAwarded: xpToAward,
            totalXp: newTotalXp,
            previousTier,
            newTier,
            didLevelUpTier,
            newTierName: newProgression.tierDef.name,
            newLevel,
          },
        });
      } catch (err) {
        console.warn("Realtime event publish non-blocking failure:", err);
      }

      return {
        previousXp,
        newXp: newTotalXp,
        xpAwarded: xpToAward,
        previousTier,
        newTier,
        didLevelUpTier,
        previousLevel,
        newLevel,
        relationship: detail,
        unlockedPerks: didLevelUpTier ? newProgression.tierDef.perks : undefined,
      };
    });
  }

  /**
   * 3. GET FULL CREATOR RELATIONSHIP TREE
   * Returns all 6 tiers with visual graph metadata, unlock requirements, and fan position.
   */
  public static async getRelationshipTree(
    creatorProfileIdOrUserId: string,
    fanId?: string
  ): Promise<CreatorRelationshipTreeData> {
    const creator = await prisma.creatorProfile.findFirst({
      where: {
        OR: [
          { id: creatorProfileIdOrUserId },
          { userId: creatorProfileIdOrUserId },
          { user: { username: creatorProfileIdOrUserId } },
        ],
      },
      include: {
        user: true,
        creatorRelationships: true,
      },
    });

    if (!creator) {
      throw new Error(`Creator not found: ${creatorProfileIdOrUserId}`);
    }

    let currentRelationship: CreatorFanRelationshipDetail | null = null;
    let currentFanTier: RelationshipTierCode = "NEW_FAN";

    if (fanId) {
      try {
        currentRelationship = await this.getRelationship(fanId, creator.id);
        currentFanTier = currentRelationship.relationshipTier;
      } catch {
        // Not yet initialized
      }
    }

    const currentTierIndex = RELATIONSHIP_TIERS.findIndex(
      (t) => t.tier === currentFanTier
    );

    // Build tiers with state flags
    const treeTiers = RELATIONSHIP_TIERS.map((tierDef, index) => {
      const isCurrent = index === currentTierIndex;
      const isPassed = index < currentTierIndex;
      const isActive = index <= currentTierIndex;

      // Approximate fan count in this tier for creator analytics
      const countInTier = creator.creatorRelationships.filter((r) => {
        const xp = Number(r.totalXp);
        const { tier } = calculateProgressionFromXp(xp);
        return tier === tierDef.tier;
      }).length;

      return {
        ...tierDef,
        isActive,
        isPassed,
        isCurrent,
        fanCount: countInTier,
      };
    });

    return {
      creatorProfileId: creator.id,
      creatorStageName: creator.stageName || creator.user.displayName,
      creatorAvatarUrl:
        creator.user.avatarUrl ||
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
      fanId: currentRelationship?.fanId,
      fanUsername: currentRelationship?.fanUsername,
      coBrandTitle: currentRelationship?.coBrandTitle,
      tiers: treeTiers,
      currentRelationship,
    };
  }

  /**
   * 4. GET FAN'S MULTI-CREATOR PROGRESSION MATRIX
   * Demonstrates creator-specific nature: Fan can be Elite with Creator A, VIP with Creator B, New Fan with C.
   */
  public static async getFanRelationshipsMatrix(
    fanIdOrUsername: string
  ): Promise<FanMultiCreatorMatrix> {
    const fan = await prisma.user.findFirst({
      where: {
        OR: [{ id: fanIdOrUsername }, { username: fanIdOrUsername }],
      },
      include: {
        creatorRelationshipsFan: {
          include: {
            creatorProfile: {
              include: { user: true },
            },
          },
          orderBy: { totalXp: "desc" },
        },
      },
    });

    if (!fan) {
      throw new Error(`Fan not found: ${fanIdOrUsername}`);
    }

    const relationshipCards: FanCreatorRelationshipCard[] =
      fan.creatorRelationshipsFan.map((rel) => {
        const totalXp = Number(rel.totalXp);
        const prog = calculateProgressionFromXp(totalXp);
        const creator = rel.creatorProfile;
        const stageName = creator.stageName || creator.user.displayName || creator.user.username;
        const coBrand = this.buildCoBrandTitle(fan.displayName || fan.username, stageName);

        return {
          creatorProfileId: creator.id,
          creatorStageName: stageName,
          creatorUsername: creator.user.username,
          creatorAvatarUrl:
            creator.user.avatarUrl ||
            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
          coBrandTitle: coBrand,
          relationshipTier: prog.tier,
          tierName: prog.tierDef.name,
          totalXp,
          currentLevel: prog.level,
          progressPercent: prog.progressPercent,
          xpInCurrentTier: prog.xpInCurrentTier,
          xpRequiredForNextTier: prog.xpRequiredForNextTier,
          totalCreditsSpent: Number(rel.totalCreditsSpent),
          totalMinutesWatched: rel.totalMinutesWatched,
          streakDays: rel.currentStreakDays,
          badgeGradient: prog.tierDef.gradientClass,
        };
      });

    // Find highest tier
    let highestTier: RelationshipTierCode = "NEW_FAN";
    if (relationshipCards.length > 0) {
      highestTier = relationshipCards[0].relationshipTier;
    }

    return {
      fanId: fan.id,
      fanUsername: fan.username,
      fanDisplayName: fan.displayName,
      fanAvatarUrl:
        fan.avatarUrl ||
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
      totalCreatorsSupported: relationshipCards.length,
      highestTierWithAnyCreator: highestTier,
      relationships: relationshipCards,
    };
  }

  /**
   * 5. GET CREATOR'S TOP FANS CATEGORIZED BY TIER
   */
  public static async getCreatorTopFans(creatorProfileId: string, limit = 50) {
    const relationships = await prisma.creatorRelationship.findMany({
      where: { creatorProfileId },
      include: {
        fan: true,
      },
      orderBy: { totalXp: "desc" },
      take: limit,
    });

    return relationships.map((rel, index) => {
      const totalXp = Number(rel.totalXp);
      const prog = calculateProgressionFromXp(totalXp);
      return {
        rank: index + 1,
        fanId: rel.fanId,
        username: rel.fan.username,
        displayName: rel.fan.displayName,
        avatarUrl: rel.fan.avatarUrl,
        tier: prog.tier,
        tierName: prog.tierDef.name,
        level: prog.level,
        totalXp,
        totalCreditsSpent: Number(rel.totalCreditsSpent),
        streakDays: rel.currentStreakDays,
        badgeGradient: prog.tierDef.gradientClass,
      };
    });
  }

  /**
   * 6. ENGAGEMENT SIMULATOR (Convenient Helper for Live Demos & Testing)
   */
  public static async simulateEngagement(
    fanId: string,
    creatorProfileId: string,
    action: "TIP_50" | "TIP_500" | "WATCH_30M" | "CHAT_10" | "SUB_VIP" | "CUSTOM",
    customXp = 0
  ): Promise<AwardXPResult> {
    switch (action) {
      case "TIP_50":
        return this.awardEngagementXP({
          fanId,
          creatorProfileId,
          eventType: "LIVE_TIP",
          creditsSpent: 50,
          metadata: { note: "Simulated Tip 50 Credits" },
        });
      case "TIP_500":
        return this.awardEngagementXP({
          fanId,
          creatorProfileId,
          eventType: "LIVE_TIP",
          creditsSpent: 500,
          metadata: { note: "Simulated Major Tip 500 Credits" },
        });
      case "WATCH_30M":
        return this.awardEngagementXP({
          fanId,
          creatorProfileId,
          eventType: "STREAM_WATCH_TIME",
          minutesWatched: 30,
          metadata: { note: "Simulated 30 Minutes Watch Time" },
        });
      case "CHAT_10":
        return this.awardEngagementXP({
          fanId,
          creatorProfileId,
          eventType: "CHAT_MESSAGE",
          messagesCount: 10,
          metadata: { note: "Simulated 10 Chat Messages" },
        });
      case "SUB_VIP":
        return this.awardEngagementXP({
          fanId,
          creatorProfileId,
          eventType: "SUBSCRIPTION_RENEWAL",
          creditsSpent: 500,
          metadata: { note: "Simulated VIP Subscription Unlock" },
        });
      case "CUSTOM":
      default:
        return this.awardEngagementXP({
          fanId,
          creatorProfileId,
          eventType: "CUSTOM_BONUS",
          customXpAmount: customXp || 100,
          metadata: { note: "Custom XP Grant" },
        });
    }
  }
}
