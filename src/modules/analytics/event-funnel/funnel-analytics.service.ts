// ============================================================================
// FUNNEL ANALYTICS CALCULATION SERVICE
// Multi-Stage Funnel Conversion, Drop-off Analysis & Bottleneck Diagnostics
// ============================================================================

import {
  EventFunnelAnalysisResult,
  FunnelAnalysisQuery,
  FunnelDropOffDiagnosis,
  FunnelEventType,
  FunnelStageAnalysis,
  FUNNEL_STAGES,
} from "./types";
import { EventFunnelPipeline } from "./event-funnel-pipeline.service";

export class FunnelAnalyticsService {
  /**
   * Calculates the full 16-stage conversion and drop-off analysis.
   */
  public static async getFunnelAnalysis(
    query: FunnelAnalysisQuery = {}
  ): Promise<EventFunnelAnalysisResult> {
    const { timeframe = "LAST_7_DAYS", creatorProfileId, startDate, endDate } = query;

    const periodEnd = endDate ? new Date(endDate) : new Date();
    let periodStart = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    if (timeframe === "LAST_24_HOURS") {
      periodStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
    } else if (timeframe === "LAST_30_DAYS") {
      periodStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    } else if (timeframe === "ALL_TIME") {
      periodStart = new Date(0);
    }

    // 1. Gather raw events from pipeline
    const rawEvents = EventFunnelPipeline.getRawEvents({
      creatorProfileId,
      startDate: periodStart,
      endDate: periodEnd,
    });

    // 2. Aggregate unique users and event counts per stage
    const stageUserSets = new Map<FunnelEventType, Set<string>>();
    const stageEventCounts = new Map<FunnelEventType, number>();

    FUNNEL_STAGES.forEach((s) => {
      stageUserSets.set(s.stage, new Set<string>());
      stageEventCounts.set(s.stage, 0);
    });

    rawEvents.forEach((evt) => {
      const userSet = stageUserSets.get(evt.eventType);
      if (userSet) {
        userSet.add(evt.userId || evt.sessionId || "anon");
        stageEventCounts.set(evt.eventType, (stageEventCounts.get(evt.eventType) || 0) + 1);
      }
    });

    // Seed baseline distribution if buffer is empty
    const hasData = Array.from(stageUserSets.values()).some((s) => s.size > 0);
    let stageUniqueCounts: Record<FunnelEventType, { users: number; events: number }>;

    if (!hasData) {
      stageUniqueCounts = this.getBaselineSeedMetrics();
    } else {
      stageUniqueCounts = {} as any;
      FUNNEL_STAGES.forEach((s) => {
        stageUniqueCounts[s.stage] = {
          users: stageUserSets.get(s.stage)?.size || 0,
          events: stageEventCounts.get(s.stage) || 0,
        };
      });
    }

    // 3. Compute step-by-step conversion and drop-off percentages
    const stagesAnalysis: FunnelStageAnalysis[] = [];
    const baselineUsers = Math.max(stageUniqueCounts["USER_CREATED"].users, 1);
    let prevUsers = baselineUsers;

    FUNNEL_STAGES.forEach((stageDef, index) => {
      const currentUsers = stageUniqueCounts[stageDef.stage]?.users || 0;
      const currentEvents = stageUniqueCounts[stageDef.stage]?.events || 0;

      let conversionFromPrev = 100;
      let dropOffCount = 0;
      let dropOffRate = 0;

      if (index > 0) {
        dropOffCount = Math.max(prevUsers - currentUsers, 0);
        conversionFromPrev = prevUsers > 0 ? Number(((currentUsers / prevUsers) * 100).toFixed(2)) : 0;
        dropOffRate = prevUsers > 0 ? Number(((dropOffCount / prevUsers) * 100).toFixed(2)) : 0;
      }

      const overallConversion = Number(((currentUsers / baselineUsers) * 100).toFixed(2));

      stagesAnalysis.push({
        stage: stageDef.stage,
        stageIndex: stageDef.stageIndex,
        stageName: stageDef.stageName,
        category: stageDef.category,
        uniqueUsers: currentUsers,
        totalEvents: currentEvents,
        conversionFromPreviousStagePercent: Math.min(conversionFromPrev, 100),
        dropOffCount,
        dropOffRatePercent: Math.min(dropOffRate, 100),
        overallConversionPercent: Math.min(overallConversion, 100),
      });

      prevUsers = Math.max(currentUsers, 1);
    });

    // 4. Compute drop-off diagnosis & bottleneck identification
    const dropOffDiagnosis = this.diagnoseDropOffBottlenecks(stagesAnalysis);

    // 5. Cohort Summary calculations
    const onboardingDropOff = stagesAnalysis[1].dropOffRatePercent;
    const engagementDropOff = stagesAnalysis[6].dropOffRatePercent; // Stage 7 (Watch 30s)
    const monetizationDropOff = stagesAnalysis[11].dropOffRatePercent; // Stage 12 (Purchase Completed)
    const retentionDropOff = stagesAnalysis[15].dropOffRatePercent; // Stage 16 (Returned)

    const totalStarted = stagesAnalysis[0].uniqueUsers;
    const totalConverted = stagesAnalysis[11].uniqueUsers; // Purchase Completed
    const overallFunnelConversionRatePercent =
      totalStarted > 0 ? Number(((totalConverted / totalStarted) * 100).toFixed(2)) : 0;

    return {
      timeframe,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      creatorProfileId,
      totalUniqueUsersStarted: totalStarted,
      totalUniqueUsersConverted: totalConverted,
      overallFunnelConversionRatePercent,
      stages: stagesAnalysis,
      dropOffDiagnosis,
      cohortSummary: {
        onboardingDropOffPercent: onboardingDropOff,
        engagementDropOffPercent: engagementDropOff,
        monetizationDropOffPercent: monetizationDropOff,
        retentionDropOffPercent: retentionDropOff,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Identifies primary and secondary conversion leaks and provides actionable recommendations.
   */
  private static diagnoseDropOffBottlenecks(stages: FunnelStageAnalysis[]): FunnelDropOffDiagnosis {
    // Sort transitions by drop-off count
    const rankedTransitions = stages
      .slice(1)
      .map((curr, idx) => {
        const prev = stages[idx];
        return {
          fromStage: prev.stage,
          toStage: curr.stage,
          dropOffCount: curr.dropOffCount,
          dropOffRatePercent: curr.dropOffRatePercent,
          category: curr.category,
        };
      })
      .sort((a, b) => b.dropOffCount - a.dropOffCount);

    const primary = rankedTransitions[0] || {
      fromStage: "LIVE_ENTERED" as FunnelEventType,
      toStage: "WATCH_30_SECONDS" as FunnelEventType,
      dropOffCount: 100,
      dropOffRatePercent: 35,
      category: "ENGAGEMENT",
    };

    const secondary = rankedTransitions[1] || undefined;

    return {
      primaryDropOffStage: {
        fromStage: primary.fromStage,
        toStage: primary.toStage,
        dropOffCount: primary.dropOffCount,
        dropOffRatePercent: primary.dropOffRatePercent,
        insight: `Highest drop-off occurs between ${primary.fromStage} and ${primary.toStage} (${primary.dropOffRatePercent}% drop-off).`,
        actionableRecommendation: this.getRecommendationForTransition(primary.fromStage, primary.toStage),
      },
      secondaryDropOffStage: secondary
        ? {
            fromStage: secondary.fromStage,
            toStage: secondary.toStage,
            dropOffCount: secondary.dropOffCount,
            dropOffRatePercent: secondary.dropOffRatePercent,
            insight: `Secondary drop-off identified at ${secondary.fromStage} -> ${secondary.toStage} (${secondary.dropOffRatePercent}% drop-off).`,
            actionableRecommendation: this.getRecommendationForTransition(secondary.fromStage, secondary.toStage),
          }
        : undefined,
      topFrictionCategory: primary.category as any,
    };
  }

  /**
   * Generates actionable optimization recommendation based on funnel transition.
   */
  private static getRecommendationForTransition(from: FunnelEventType, to: FunnelEventType): string {
    if (to === "AGE_VERIFIED") {
      return "Streamline 18+ age verification flow with 1-click self-attestation or instant payment token assurance.";
    }
    if (to === "WATCH_30_SECONDS") {
      return "Hook new viewers in the first 10 seconds: display dynamic live stream goals and interactive countdowns.";
    }
    if (to === "INTERACTION_MENU_OPENED") {
      return "Promote the G hotkey and render floating low-cost interaction buttons (e.g. 25-token Love Sparks) on screen.";
    }
    if (to === "PURCHASE_COMPLETED") {
      return "Offer new fans 50 Free Bonus Tokens to try their first live tip risk-free, lowering the barrier to first purchase.";
    }
    if (to === "RETURNED") {
      return "Trigger automated Day 2 push notifications with +25% XP multiplier and Free Daily Wheel Spin rewards.";
    }
    return "Optimize stage transition latency and enhance interactive viewer prompts.";
  }

  /**
   * Baseline seed distribution for instant visualization in sandboxes.
   */
  private static getBaselineSeedMetrics(): Record<FunnelEventType, { users: number; events: number }> {
    return {
      USER_CREATED: { users: 1000, events: 1000 },
      AGE_VERIFIED: { users: 950, events: 950 },
      FEED_VIEWED: { users: 920, events: 2100 },
      LIVE_IMPRESSION: { users: 900, events: 5400 },
      LIVE_ENTERED: { users: 840, events: 3200 },
      WATCH_STARTED: { users: 820, events: 3100 },
      WATCH_30_SECONDS: { users: 650, events: 1950 },
      CREATOR_FOLLOWED: { users: 480, events: 620 },
      INTERACTION_MENU_OPENED: { users: 420, events: 1200 },
      INTERACTION_VIEWED: { users: 390, events: 1100 },
      PURCHASE_STARTED: { users: 260, events: 450 },
      PURCHASE_COMPLETED: { users: 210, events: 380 },
      XP_EARNED: { users: 210, events: 580 },
      RELATIONSHIP_LEVEL_UP: { users: 190, events: 240 },
      LIVE_EXITED: { users: 800, events: 2900 },
      RETURNED: { users: 510, events: 850 },
    };
  }
}
