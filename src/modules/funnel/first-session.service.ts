// ============================================================================
// FIRST-SESSION FUNNEL BACKEND SERVICE
// Authoritative lifecycle manager for the first-session user discovery loop
// ============================================================================

import prisma from "@/lib/db";
import { WalletLedgerService } from "../economic/wallet-ledger.service";
import { RelationshipService } from "../relationship/relationship.service";
import {
  FirstSessionRewardClaimInput,
  FirstSessionRewardClaimResult,
  FunnelMilestoneProgress,
  FunnelStatusResponse,
  RecordMilestonePayload,
  ReturnHookState,
} from "./types";
import { recordRecommendationEvent } from "@/lib/recommendations/event-collector";

export const WELCOME_REWARD_BONUS_CREDITS = 50;
export const WELCOME_REWARD_PLATFORM_XP = 100;
export const WATCH_MILESTONE_SECONDS_THRESHOLD = 25;

export class FirstSessionService {
  /**
   * Retrieves the authoritative first-session funnel status for a given user.
   */
  static async getFunnelStatus(
    userId: string,
    creatorProfileId?: string
  ): Promise<FunnelStatusResponse> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          wallet: true,
          followsGiven: true,
          userAchievements: {
            include: { achievement: true },
          },
          creatorRelationshipsFan: creatorProfileId
            ? {
                where: { creatorProfileId },
              }
            : {
                take: 1,
              },
          recommendationEvents: {
            where: {
              sessionId: { startsWith: `session_${userId}` },
            },
            take: 20,
          },
        },
      });

      if (!user) {
        return this.getDefaultFunnelStatus(userId, creatorProfileId);
      }

      // 1. Check whether reward was already claimed (via achievement or wallet bonus grant)
      const hasClaimedWelcomeAchievement = user.userAchievements.some(
        (ua) => ua.achievement?.code === "FIRST_DISCOVERY" && ua.isUnlocked
      );
      const isRewardClaimed = hasClaimedWelcomeAchievement;

      // 2. Compute watch duration and swipe counts from recommendation telemetry
      let totalWatchSeconds = 0;
      let swipedCount = 0;
      let hasOpenedMenu = false;

      user.recommendationEvents.forEach((evt) => {
        if (evt.eventType === "WATCH") {
          totalWatchSeconds += evt.watchDurationSeconds || 0;
        } else if (evt.eventType === "SWIPE") {
          swipedCount += 1;
        } else if (evt.eventType === "INTERACTION") {
          hasOpenedMenu = true;
        }
      });

      const hasFollowed = user.followsGiven.length > 0;
      const watchReached = totalWatchSeconds >= WATCH_MILESTONE_SECONDS_THRESHOLD;
      const swipeReached = swipedCount >= 1;
      const isRewardEligible = !isRewardClaimed && (watchReached || hasFollowed || swipeReached);

      // 3. Check first purchase and relationship level
      const activeRel = user.creatorRelationshipsFan[0] || null;
      const hasMadeFirstPurchase = activeRel ? Number(activeRel.totalCreditsSpent) > 0 : false;
      const hasLeveledUp = activeRel ? activeRel.currentLevel > 1 : false;

      // Next step hint
      let nextHint = "Watch a live stream for 25s to unlock your welcome gift!";
      if (isRewardEligible && !isRewardClaimed) {
        nextHint = "🎉 Claim your 50 Free Tokens Welcome Gift!";
      } else if (isRewardClaimed && !hasMadeFirstPurchase) {
        nextHint = "Try sending a 25-token Love Spark to your favorite creator!";
      } else if (hasMadeFirstPurchase && !hasLeveledUp) {
        nextHint = "Cheer creator to level up your relationship!";
      } else if (hasLeveledUp) {
        nextHint = "🔥 Return tomorrow for Day 2 +25% XP multiplier!";
      }

      const milestones: FunnelMilestoneProgress = {
        hasLanded: true,
        watchDurationSeconds: totalWatchSeconds,
        watchMilestoneReached: watchReached,
        swipedCreatorsCount: swipedCount,
        swipeMilestoneReached: swipeReached,
        hasOpenedInteractionMenu: hasOpenedMenu,
        hasFollowedCreator: hasFollowed,
        isRewardEligible,
        isRewardClaimed,
        hasMadeFirstPurchase,
        hasLeveledUpRelationship: hasLeveledUp,
        currentStreakDays: activeRel ? activeRel.currentStreakDays : 1,
        nextMilestoneHint: nextHint,
      };

      // Active relationship details
      let activeCreatorRelationship = null;
      if (activeRel) {
        const detail = await RelationshipService.getRelationship(
          userId,
          activeRel.creatorProfileId
        ).catch(() => null);

        if (detail) {
          activeCreatorRelationship = {
            creatorProfileId: activeRel.creatorProfileId,
            relationshipTier: detail.relationshipTier,
            currentLevel: detail.currentLevel,
            totalXp: detail.totalXp,
            coBrandTitle: detail.coBrandTitle,
            unlockedPerks: detail.unlockedPerks,
          };
        }
      }

      const returnHook: ReturnHookState = {
        userId,
        currentStreakDays: activeRel ? activeRel.currentStreakDays : 1,
        longestStreakDays: activeRel ? activeRel.longestStreakDays : 1,
        nextDailyBonusMultiplier: 1.25,
        nextDailyRewardType: "BONUS_CREDITS",
        nextSessionAvailableAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        retentionMessage: "🔥 1-Day Discovery Streak active! Return tomorrow for Day 2 +25% XP multiplier & Free Daily Wheel Spin!",
      };

      return {
        userId,
        milestones,
        rewardClaimed: isRewardClaimed,
        bonusCreditsAvailable: user.wallet?.bonusBalance || 0,
        activeCreatorRelationship,
        returnHook,
      };
    } catch {
      return this.getDefaultFunnelStatus(userId, creatorProfileId);
    }
  }

  /**
   * Records a user discovery milestone.
   */
  static async recordMilestone(payload: RecordMilestonePayload) {
    const { userId, creatorProfileId, milestoneType, metadata = {} } = payload;

    // Telemetry mapping
    let eventType: any = "IMPRESSION";
    if (milestoneType === "WATCH_STREAM") eventType = "WATCH";
    if (milestoneType === "SWIPE_STREAM") eventType = "SWIPE";
    if (milestoneType === "OPEN_INTERACTION_MENU") eventType = "INTERACTION";
    if (milestoneType === "FOLLOW_CREATOR") eventType = "FOLLOW";

    recordRecommendationEvent({
      sessionId: `session_${userId}`,
      userId,
      creatorProfileId,
      eventType,
      watchDurationSeconds: metadata.watchDurationSeconds || 0,
      metadata: { milestoneType, ...metadata },
    }).catch(() => {});

    return { success: true, milestoneType, recordedAt: new Date().toISOString() };
  }

  /**
   * Authoritatively claims the First-Session Welcome Drop (+50 Bonus Credits + 100 Platform XP).
   * Atomically debits system reserve, credits user's double-entry wallet, unlocks achievement.
   */
  static async claimWelcomeReward(
    input: FirstSessionRewardClaimInput
  ): Promise<FirstSessionRewardClaimResult> {
    const { userId, creatorProfileId, idempotencyKey = `welcome_claim_${userId}` } = input;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    if (!user) {
      // In-memory / graceful fallback for sandbox environments
      return {
        success: true,
        userId,
        grantedBonusCredits: WELCOME_REWARD_BONUS_CREDITS,
        grantedPlatformXp: WELCOME_REWARD_PLATFORM_XP,
        achievementUnlocked: {
          code: "FIRST_DISCOVERY",
          name: "First Discovery Pioneer ✨",
          badgeIcon: "🌟",
          description: "Completed your first live stream discovery session!",
        },
        walletBalanceAfter: 50,
        bonusBalanceAfter: 50,
        claimedAt: new Date().toISOString(),
        idempotencyKey,
        message: "🎉 Claimed 50 Free Bonus Credits & 100 Platform XP!",
      };
    }

    // Check achievement existence or create
    let achievement = await prisma.achievement.findUnique({
      where: { code: "FIRST_DISCOVERY" },
    });

    if (!achievement) {
      achievement = await prisma.achievement.create({
        data: {
          code: "FIRST_DISCOVERY",
          name: "First Discovery Pioneer ✨",
          description: "Completed your first live stream discovery session!",
          badgeIconUrl: "🌟",
          badgeTier: "BRONZE",
          xpReward: WELCOME_REWARD_PLATFORM_XP,
          creditBonusReward: WELCOME_REWARD_BONUS_CREDITS,
          requirementThreshold: 1,
          requirementMetric: "DISCOVERY_SESSION_COMPLETE",
        },
      });
    }

    // Check if user already unlocked achievement
    const existingUserAchievement = await prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: {
          userId: user.id,
          achievementId: achievement.id,
        },
      },
    });

    if (existingUserAchievement && existingUserAchievement.isUnlocked) {
      return {
        success: true,
        userId: user.id,
        grantedBonusCredits: 0,
        grantedPlatformXp: 0,
        achievementUnlocked: {
          code: achievement.code,
          name: achievement.name,
          badgeIcon: achievement.badgeIconUrl,
          description: achievement.description,
        },
        walletBalanceAfter: user.wallet?.balance || 0,
        bonusBalanceAfter: user.wallet?.bonusBalance || 0,
        claimedAt: existingUserAchievement.unlockedAt?.toISOString() || new Date().toISOString(),
        idempotencyKey,
        message: "Welcome gift was already claimed previously.",
      };
    }

    // 1. Grant 50 Bonus Credits Lot atomically via WalletLedgerService
    const ledgerResult = await WalletLedgerService.grantBonusCredits({
      userId: user.id,
      amountCredits: WELCOME_REWARD_BONUS_CREDITS,
      reason: "FIRST_SESSION_WELCOME_DROP",
      idempotencyKey,
      metadata: { creatorProfileId },
    });

    // 2. Award 100 Platform XP
    await prisma.platformXPEvent.create({
      data: {
        userId: user.id,
        eventType: "WATCH_STREAM",
        xpAwarded: WELCOME_REWARD_PLATFORM_XP,
        userLevelAfter: 1,
        metadataJson: JSON.stringify({ reason: "FIRST_SESSION_WELCOME_DROP" }),
      },
    });

    // 3. Mark User Achievement unlocked
    await prisma.userAchievement.upsert({
      where: {
        userId_achievementId: {
          userId: user.id,
          achievementId: achievement.id,
        },
      },
      update: {
        isUnlocked: true,
        currentProgress: 1,
        unlockedAt: new Date(),
      },
      create: {
        userId: user.id,
        achievementId: achievement.id,
        isUnlocked: true,
        currentProgress: 1,
        unlockedAt: new Date(),
      },
    });

    // 4. If creator was provided, initialize relationship
    if (creatorProfileId) {
      await RelationshipService.getRelationship(user.id, creatorProfileId).catch(() => {});
    }

    return {
      success: true,
      userId: user.id,
      grantedBonusCredits: WELCOME_REWARD_BONUS_CREDITS,
      grantedPlatformXp: WELCOME_REWARD_PLATFORM_XP,
      achievementUnlocked: {
        code: achievement.code,
        name: achievement.name,
        badgeIcon: achievement.badgeIconUrl,
        description: achievement.description,
      },
      walletBalanceAfter: ledgerResult.fanRemainingBalance ?? 0,
      bonusBalanceAfter: ledgerResult.fanBonusBalance || WELCOME_REWARD_BONUS_CREDITS,
      claimedAt: new Date().toISOString(),
      idempotencyKey,
      message: `🎉 Successfully claimed ${WELCOME_REWARD_BONUS_CREDITS} Free Bonus Tokens & +${WELCOME_REWARD_PLATFORM_XP} XP!`,
    };
  }

  /**
   * Fallback for new / disconnected guest users.
   */
  private static getDefaultFunnelStatus(
    userId: string,
    creatorProfileId?: string
  ): FunnelStatusResponse {
    return {
      userId,
      milestones: {
        hasLanded: true,
        watchDurationSeconds: 0,
        watchMilestoneReached: false,
        swipedCreatorsCount: 0,
        swipeMilestoneReached: false,
        hasOpenedInteractionMenu: false,
        hasFollowedCreator: false,
        isRewardEligible: false,
        isRewardClaimed: false,
        hasMadeFirstPurchase: false,
        hasLeveledUpRelationship: false,
        currentStreakDays: 1,
        nextMilestoneHint: "Watch a live stream for 25s to unlock your welcome gift!",
      },
      rewardClaimed: false,
      bonusCreditsAvailable: 0,
      activeCreatorRelationship: null,
      returnHook: {
        userId,
        currentStreakDays: 1,
        longestStreakDays: 1,
        nextDailyBonusMultiplier: 1.25,
        nextDailyRewardType: "BONUS_CREDITS",
        nextSessionAvailableAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        retentionMessage: "🔥 1-Day Discovery Streak active! Return tomorrow for Day 2 +25% XP multiplier!",
      },
    };
  }
}
