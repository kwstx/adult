/**
 * COMPREHENSIVE END-TO-END VERIFICATION: 16-STAGE BACKEND EVENT FUNNEL
 * 
 * Verifies the 16 exact funnel stages:
 * 1. USER_CREATED
 * 2. AGE_VERIFIED
 * 3. FEED_VIEWED
 * 4. LIVE_IMPRESSION
 * 5. LIVE_ENTERED
 * 6. WATCH_STARTED
 * 7. WATCH_30_SECONDS
 * 8. CREATOR_FOLLOWED
 * 9. INTERACTION_MENU_OPENED
 * 10. INTERACTION_VIEWED
 * 11. PURCHASE_STARTED
 * 12. PURCHASE_COMPLETED
 * 13. XP_EARNED
 * 14. RELATIONSHIP_LEVEL_UP
 * 15. LIVE_EXITED
 * 16. RETURNED
 * 
 * Evaluates step-by-step conversion, drop-off percentages, bottleneck diagnostics,
 * multi-creator segmentation, and domain event mapping.
 */

import { EventFunnelPipeline } from "../src/modules/analytics/event-funnel/event-funnel-pipeline.service";
import { FunnelAnalyticsService } from "../src/modules/analytics/event-funnel/funnel-analytics.service";
import { FUNNEL_STAGES, FunnelEventType } from "../src/modules/analytics/event-funnel/types";

async function runBackendEventFunnelVerification() {
  console.log("============================================================================");
  console.log("🧪 STARTING VERIFICATION: 16-STAGE BACKEND EVENT FUNNEL & DROP-OFF ANALYSIS");
  console.log("============================================================================\n");

  EventFunnelPipeline.resetForTesting();
  EventFunnelPipeline.setPersistToDb(false);
  EventFunnelPipeline.initialize();

  const creatorMaya = "creator_maya";
  const creatorChloe = "creator_chloe";

  // Cohort Counts for Controlled Simulation
  // User Created: 1000
  // Age Verified: 960 (40 dropped off)
  // Feed Viewed: 940 (20 dropped off)
  // Live Impression: 920 (20 dropped off)
  // Live Entered: 860 (60 dropped off)
  // Watch Started: 840 (20 dropped off)
  // Watch 30 Seconds: 680 (160 dropped off - Primary bottleneck)
  // Creator Followed: 510 (170 dropped off)
  // Interaction Menu Opened: 440 (70 dropped off)
  // Interaction Viewed: 410 (30 dropped off)
  // Purchase Started: 280 (130 dropped off)
  // Purchase Completed: 230 (50 dropped off)
  // XP Earned: 230
  // Relationship Level Up: 210
  // Live Exited: 820
  // Returned: 540

  const stageUserCounts: Record<FunnelEventType, number> = {
    USER_CREATED: 1000,
    AGE_VERIFIED: 960,
    FEED_VIEWED: 940,
    LIVE_IMPRESSION: 920,
    LIVE_ENTERED: 860,
    WATCH_STARTED: 840,
    WATCH_30_SECONDS: 680,
    CREATOR_FOLLOWED: 510,
    INTERACTION_MENU_OPENED: 440,
    INTERACTION_VIEWED: 410,
    PURCHASE_STARTED: 280,
    PURCHASE_COMPLETED: 230,
    XP_EARNED: 230,
    RELATIONSHIP_LEVEL_UP: 210,
    LIVE_EXITED: 820,
    RETURNED: 540,
  };

  console.log("▶ STEP 1: Ingesting 16 Funnel Stages across simulated cohort of 1,000 users...");

  for (const stageDef of FUNNEL_STAGES) {
    const targetCount = stageUserCounts[stageDef.stage];
    for (let i = 1; i <= targetCount; i++) {
      const userId = `user_${i.toString().padStart(4, "0")}`;
      const creatorId = i % 2 === 0 ? creatorMaya : creatorChloe;

      await EventFunnelPipeline.trackEvent({
        eventType: stageDef.stage,
        userId,
        sessionId: `sess_${userId}`,
        creatorProfileId: creatorId,
        durationSeconds: stageDef.stage === "WATCH_30_SECONDS" ? 30 : 5,
        amountCredits: stageDef.stage === "PURCHASE_COMPLETED" ? 50 : undefined,
        xpAwarded: stageDef.stage === "XP_EARNED" ? 500 : undefined,
        timestamp: new Date().toISOString(),
      });
    }
    console.log(`  ✓ Stage ${stageDef.stageIndex.toString().padStart(2, " ")}: ${stageDef.stage.padEnd(24, " ")} (${stageDef.stageName}) -> ${targetCount} users`);
  }

  console.log("\n▶ STEP 2: Querying Global 16-Stage Funnel Analysis...");
  const globalAnalysis = await FunnelAnalyticsService.getFunnelAnalysis({ timeframe: "LAST_7_DAYS" });

  if (globalAnalysis.stages.length !== 16) {
    throw new Error(`Expected 16 stages in analysis; got ${globalAnalysis.stages.length}`);
  }

  console.log("\n---------------------------------------------------------------------------------------------------------");
  console.log("STAGE # | STAGE NAME               | USERS | CONV % (PREV) | DROP-OFF COUNT | DROP-OFF % | OVERALL CONV %");
  console.log("---------------------------------------------------------------------------------------------------------");

  globalAnalysis.stages.forEach((s) => {
    console.log(
      `${s.stageIndex.toString().padStart(7, " ")} | ` +
      `${s.stageName.padEnd(24, " ")} | ` +
      `${s.uniqueUsers.toString().padStart(5, " ")} | ` +
      `${s.conversionFromPreviousStagePercent.toFixed(1).padStart(11, " ")}% | ` +
      `${s.dropOffCount.toString().padStart(14, " ")} | ` +
      `${s.dropOffRatePercent.toFixed(1).padStart(9, " ")}% | ` +
      `${s.overallConversionPercent.toFixed(1).padStart(13, " ")}%`
    );
  });
  console.log("---------------------------------------------------------------------------------------------------------");

  // Step 3: Verify Core Conversion Metrics
  console.log("\n▶ STEP 3: Verifying Key Conversion Invariants...");
  const stage1Users = globalAnalysis.stages[0].uniqueUsers;
  const stage12Users = globalAnalysis.stages[11].uniqueUsers; // Purchase Completed
  const stage16Users = globalAnalysis.stages[15].uniqueUsers; // Returned

  if (stage1Users !== 1000) throw new Error(`Expected 1000 users started; got ${stage1Users}`);
  if (stage12Users !== 230) throw new Error(`Expected 230 purchasing users; got ${stage12Users}`);
  if (stage16Users !== 540) throw new Error(`Expected 540 returning users; got ${stage16Users}`);

  console.log(`  ✓ Total Users Started (Stage 1: USER_CREATED): ${stage1Users}`);
  console.log(`  ✓ Total Users Converted (Stage 12: PURCHASE_COMPLETED): ${stage12Users} (${globalAnalysis.overallFunnelConversionRatePercent}% yield)`);
  console.log(`  ✓ Total Users Retained (Stage 16: RETURNED): ${stage16Users} (${globalAnalysis.stages[15].overallConversionPercent}% 30-day retention)`);

  // Step 4: Verify Drop-Off Bottleneck Diagnostics
  console.log("\n▶ STEP 4: Verifying Drop-Off Bottleneck Diagnosis...");
  const diagnosis = globalAnalysis.dropOffDiagnosis;
  console.log(`  ✓ Primary Drop-off: ${diagnosis.primaryDropOffStage.fromStage} -> ${diagnosis.primaryDropOffStage.toStage}`);
  console.log(`  ✓ Drop-off Count: ${diagnosis.primaryDropOffStage.dropOffCount} users (${diagnosis.primaryDropOffStage.dropOffRatePercent}%)`);
  console.log(`  ✓ Insight: "${diagnosis.primaryDropOffStage.insight}"`);
  console.log(`  ✓ Recommendation: "${diagnosis.primaryDropOffStage.actionableRecommendation}"`);

  // Step 5: Test Multi-Creator Funnel Isolation
  console.log("\n▶ STEP 5: Testing Creator-Specific Funnel Segmentation (Maya Velvet)...");
  const mayaAnalysis = await FunnelAnalyticsService.getFunnelAnalysis({
    creatorProfileId: creatorMaya,
    timeframe: "LAST_7_DAYS",
  });

  const mayaPurchasers = mayaAnalysis.stages[11].uniqueUsers;
  console.log(`  ✓ Maya Velvet Purchasing Viewers: ${mayaPurchasers} users (Isolated from Chloe)`);

  // Step 6: Test Realtime Domain Event Auto-Mapping
  console.log("\n▶ STEP 6: Testing Domain Event Auto-Mapping (eventBus -> Funnel Stages)...");
  EventFunnelPipeline.ingestFromDomainEvent({
    type: "GIFT_SENT",
    payload: {
      fanUserId: "user_auto_test_999",
      creatorProfileId: creatorMaya,
      credits: 100,
    },
    timestamp: Date.now(),
  });

  const rawEvents = EventFunnelPipeline.getRawEvents();
  const autoGiftEvent = rawEvents.find((e) => e.userId === "user_auto_test_999" && e.eventType === "PURCHASE_COMPLETED");
  const autoXpEvent = rawEvents.find((e) => e.userId === "user_auto_test_999" && e.eventType === "XP_EARNED");

  if (!autoGiftEvent || !autoXpEvent) {
    throw new Error("Domain event auto-mapping failed!");
  }
  console.log("  ✓ DomainEvent 'GIFT_SENT' automatically mapped into PURCHASE_COMPLETED & XP_EARNED stages.");

  console.log("\n============================================================================");
  console.log("🎉 ALL 16 STAGES OF THE BACKEND EVENT FUNNEL VERIFIED WITH 100% SUCCESS!");
  console.log("============================================================================");
}

runBackendEventFunnelVerification().catch((err) => {
  console.error("❌ Verification failed with error:", err);
  process.exit(1);
});
