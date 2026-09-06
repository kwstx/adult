// ============================================================================
// AUTHORITATIVE PROGRESSION ENGINE SERVICE
// Evaluates events to determine XP qualification, multipliers, and daily caps
// ============================================================================

import { prisma } from "@/lib/db";
import { ProgressionEvaluationResult, ViewingEventRecord, XpSourceEventType } from "./types";
import { RelationshipTierCode } from "../relationship/types";

interface DailyCapTracker {
  fanId: string;
  creatorProfileId: string;
  dateKey: string; // e.g. "2026-09-06"
  watchXpEarnedToday: number;
}

export class ProgressionEngineService {
  // Configurable XP progression rules
  public static readonly BASE_XP_PER_WATCH_MINUTE = 10;
  public static readonly DAILY_WATCH_XP_CAP = 300; // Max 300 XP (~30-60m) per creator/day from watch time

  // In-memory daily cap cache
  private static dailyCaps: Map<string, DailyCapTracker> = new Map();

  /**
   * 1. EVALUATE VIEWING EVENT FOR XP GENERATION
   * Determines whether the recorded viewing event qualifies to generate XP.
   */
  public static async evaluateViewingProgression(
    viewingEvent: ViewingEventRecord,
    qualifyingMinutes: number,
    streakDays: number = 1,
    isSubscriber: boolean = false,
    relationshipTier: RelationshipTierCode = "NEW_FAN"
  ): Promise<ProgressionEvaluationResult> {
    const { fanId, creatorProfileId, isWindowFocused, qualifiesForXp, disqualificationReason } =
      viewingEvent;

    // Disqualified upstream by viewing event validation
    if (!qualifiesForXp) {
      return {
        qualifies: false,
        reason: disqualificationReason || "Viewing event failed validation checks",
        baseXp: 0,
        qualifyingMinutes: 0,
        multipliers: {
          streakMultiplier: 1.0,
          subscriptionMultiplier: 1.0,
          creatorLoyaltyMultiplier: 1.0,
          specialEventMultiplier: 1.0,
        },
        totalMultiplier: 1.0,
        calculatedXp: 0,
        isDailyCapReached: false,
        dailyCapRemainingXp: 0,
      };
    }

    // Must have at least 1 qualifying minute accumulated
    if (qualifyingMinutes <= 0) {
      return {
        qualifies: false,
        reason: "Watch interval has not yet accumulated a full qualifying unit (60 seconds)",
        baseXp: 0,
        qualifyingMinutes: 0,
        multipliers: {
          streakMultiplier: 1.0,
          subscriptionMultiplier: 1.0,
          creatorLoyaltyMultiplier: 1.0,
          specialEventMultiplier: 1.0,
        },
        totalMultiplier: 1.0,
        calculatedXp: 0,
        isDailyCapReached: false,
        dailyCapRemainingXp: this.DAILY_WATCH_XP_CAP,
      };
    }

    // Calculate Multipliers
    // Streak multiplier: 5% per streak day up to +50% (1.5x)
    const streakMultiplier = 1.0 + Math.min(0.5, Math.max(0, (streakDays - 1) * 0.05));

    // Subscription boost: +25% for active VIP subscribers
    const subscriptionMultiplier = isSubscriber ? 1.25 : 1.0;

    // Tier Loyalty Boost
    let creatorLoyaltyMultiplier = 1.0;
    if (relationshipTier === "REGULAR") creatorLoyaltyMultiplier = 1.05;
    else if (relationshipTier === "VIP") creatorLoyaltyMultiplier = 1.1;
    else if (relationshipTier === "INNER_CIRCLE") creatorLoyaltyMultiplier = 1.15;
    else if (relationshipTier === "ELITE") creatorLoyaltyMultiplier = 1.25;

    // Window focus adjustment
    const focusMultiplier = isWindowFocused ? 1.0 : 0.5;
    const specialEventMultiplier = focusMultiplier;

    // Total Multiplier
    const totalMultiplier = Number(
      (
        streakMultiplier *
        subscriptionMultiplier *
        creatorLoyaltyMultiplier *
        specialEventMultiplier
      ).toFixed(2)
    );

    // Base XP
    const baseXp = qualifyingMinutes * this.BASE_XP_PER_WATCH_MINUTE;

    // Raw calculated XP before caps
    const rawCalculatedXp = Math.round(baseXp * totalMultiplier);

    // Daily Cap Enforcement
    const todayKey = new Date().toISOString().split("T")[0];
    const capKey = `${fanId}:${creatorProfileId}:${todayKey}`;
    let capTracker = this.dailyCaps.get(capKey);
    if (!capTracker) {
      capTracker = {
        fanId,
        creatorProfileId,
        dateKey: todayKey,
        watchXpEarnedToday: 0,
      };
      this.dailyCaps.set(capKey, capTracker);
    }

    const remainingCap = Math.max(0, this.DAILY_WATCH_XP_CAP - capTracker.watchXpEarnedToday);

    if (remainingCap <= 0) {
      return {
        qualifies: false,
        reason: `Daily watch XP cap of ${this.DAILY_WATCH_XP_CAP} XP reached for today`,
        baseXp,
        qualifyingMinutes,
        multipliers: {
          streakMultiplier,
          subscriptionMultiplier,
          creatorLoyaltyMultiplier,
          specialEventMultiplier,
        },
        totalMultiplier,
        calculatedXp: 0,
        isDailyCapReached: true,
        dailyCapRemainingXp: 0,
      };
    }

    // Award capped amount
    const finalXpToAward = Math.min(rawCalculatedXp, remainingCap);
    capTracker.watchXpEarnedToday += finalXpToAward;

    return {
      qualifies: finalXpToAward > 0,
      reason: `Qualified for ${finalXpToAward} XP (${qualifyingMinutes} min @ ${totalMultiplier}x multiplier)`,
      baseXp,
      qualifyingMinutes,
      multipliers: {
        streakMultiplier,
        subscriptionMultiplier,
        creatorLoyaltyMultiplier,
        specialEventMultiplier,
      },
      totalMultiplier,
      calculatedXp: finalXpToAward,
      isDailyCapReached: capTracker.watchXpEarnedToday >= this.DAILY_WATCH_XP_CAP,
      dailyCapRemainingXp: Math.max(0, this.DAILY_WATCH_XP_CAP - capTracker.watchXpEarnedToday),
    };
  }

  /**
   * 2. EVALUATE GENERIC ENGAGEMENT (Tips, Subscriptions, Paid Messages)
   */
  public static evaluateGenericEventXP(
    eventType: XpSourceEventType,
    options: {
      creditsSpent?: number;
      streakDays?: number;
      customXp?: number;
    }
  ): { xpToAward: number; multiplier: number; reason: string } {
    if (options.customXp && options.customXp > 0) {
      return {
        xpToAward: options.customXp,
        multiplier: 1.0,
        reason: `Manual/Custom XP Grant: ${options.customXp} XP`,
      };
    }

    const streakDays = options.streakDays || 1;
    const streakMultiplier = 1.0 + Math.min(0.5, Math.max(0, (streakDays - 1) * 0.05));
    const credits = options.creditsSpent || 0;

    switch (eventType) {
      case "LIVE_TIP":
      case "PPV_PURCHASE":
      case "GOAL_CONTRIBUTION":
      case "PAID_MESSAGE": {
        // 1 Credit = 10 XP
        const base = credits * 10;
        const awarded = Math.round(base * streakMultiplier);
        return {
          xpToAward: awarded,
          multiplier: streakMultiplier,
          reason: `${credits} Credits Spent = ${awarded} XP (${streakMultiplier}x streak boost)`,
        };
      }
      case "SUBSCRIPTION_RENEWAL": {
        const base = Math.max(1000, credits * 10);
        return {
          xpToAward: base,
          multiplier: 1.0,
          reason: `Subscription Tier Milestone: ${base} XP`,
        };
      }
      case "CHAT_MESSAGE": {
        return {
          xpToAward: 2,
          multiplier: 1.0,
          reason: "Chat Participation: 2 XP",
        };
      }
      default:
        return {
          xpToAward: 25,
          multiplier: 1.0,
          reason: "Community Engagement: 25 XP",
        };
    }
  }

  /**
   * Reset daily cap tracker (useful for unit tests)
   */
  public static resetDailyCaps(): void {
    this.dailyCaps.clear();
  }
}
