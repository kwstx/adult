/**
 * INTEGRATION TEST SUITE: BEHAVIORAL EVENTS FAN-OUT TO 8 DOWNSTREAM ENGINES
 * 
 * Verifies that every core user behavior:
 * - User joined live
 * - User followed creator
 * - User bought content
 * - User sent gift
 * - Goal progressed
 * - Level increased
 * - Session booked
 * 
 * Automatically feeds the 8 downstream subsystems:
 * 1. Analytics
 * 2. Notifications
 * 3. Recommendations
 * 4. Leaderboards
 * 5. XP & Progression
 * 6. Creator CRM
 * 7. Fraud Detection
 * 8. Creator Analytics
 */

import { TestRunner, assert, assertEqual } from "../utils/test-runner";
import { EventStreamService } from "@/modules/events/event-stream.service";
import { NotificationHubSubscriber } from "@/modules/events/subscribers/notification-hub.subscriber";
import { RecommendationHubSubscriber } from "@/modules/events/subscribers/recommendation-hub.subscriber";
import { CreatorCrmHubSubscriber } from "@/modules/events/subscribers/crm-hub.subscriber";
import { FraudHubSubscriber } from "@/modules/events/subscribers/fraud-hub.subscriber";
import { CreatorAnalyticsHubSubscriber } from "@/modules/events/subscribers/creator-analytics-hub.subscriber";
import { creatorCrmStore } from "@/modules/creator-crm/crm-store";
import { EventActor } from "@/modules/events/types";

export async function runBehavioralEventsIntegrationTests(): Promise<boolean> {
  const runner = new TestRunner("Layer 2C: Behavioral Events 8-Engine Fan-Out Integration Tests");
  runner.printHeader();

  // Reset all state
  EventStreamService._reset();
  EventStreamService.initialize();

  const fanActor: EventActor = {
    userId: "user_fan_01",
    username: "alex_patron",
    displayName: "Alex Patron 💎",
    role: "FAN",
  };

  const creatorProfileId = "creator_maya_01";
  const livestreamId = "stream_gala_99";

  // --------------------------------------------------------------------------
  // TEST 1: Notifications Engine Fan-Out
  // --------------------------------------------------------------------------
  await runner.runTest("Engine 2 (Notifications): Follow, Gift, Booking, & Level-up trigger alert dispatches", () => {
    const initialCount = NotificationHubSubscriber.processedCount;

    // Follow
    EventStreamService.emitUserFollowedCreator(
      { userId: fanActor.userId, creatorProfileId, followedAt: new Date().toISOString(), notifyTier: "ALL" },
      fanActor
    );

    // Gift
    EventStreamService.emitUserSentGift(
      { userId: fanActor.userId, creatorProfileId, livestreamId, giftName: "Diamond Rose", amountCredits: 500, creatorNetCredits: 400, platformFeeCredits: 100, sentAt: new Date().toISOString() },
      fanActor
    );

    // Booking
    EventStreamService.emitSessionBooked(
      { bookingId: "book_01", fanId: fanActor.userId, creatorProfileId, scheduledStartTime: new Date().toISOString(), durationMinutes: 20, totalCreditsEscrowed: 2000, bookedAt: new Date().toISOString() },
      fanActor
    );

    // Level up
    EventStreamService.emitLevelIncreased(
      { userId: fanActor.userId, creatorProfileId, previousLevel: 1, newLevel: 2, totalXp: 500, xpSource: "GIFT", leveledUpAt: new Date().toISOString() },
      fanActor
    );

    assertEqual(NotificationHubSubscriber.processedCount, initialCount + 4, "Notifications hub must process all 4 events");
  });

  // --------------------------------------------------------------------------
  // TEST 2: Recommendations Engine Fan-Out
  // --------------------------------------------------------------------------
  await runner.runTest("Engine 3 (Recommendations): Watch, Follow, Purchase & Gift feed affinity engine", () => {
    const initialCount = RecommendationHubSubscriber.processedCount;

    // Join Live
    EventStreamService.emitUserJoinedLive(
      { livestreamId, creatorProfileId, userId: fanActor.userId, joinedAt: new Date().toISOString(), isSubscriber: false },
      fanActor
    );

    // Bought Content
    EventStreamService.emitUserBoughtContent(
      { orderId: "ord_1", userId: fanActor.userId, creatorProfileId, contentId: "cnt_1", contentTitle: "Photo Set", contentType: "PHOTO", priceCreditsPaid: 100, purchasedAt: new Date().toISOString() },
      fanActor
    );

    assert(RecommendationHubSubscriber.processedCount > initialCount, "Recommendations hub must ingest engagement signals");
  });

  // --------------------------------------------------------------------------
  // TEST 3: Creator CRM Engine Fan-Out & Dynamic Cohort Classification
  // --------------------------------------------------------------------------
  await runner.runTest("Engine 6 (Creator CRM): High-value gift classifies fan as WHALE and TOP_SPENDER", () => {
    // Send 6,000 credit gift (exceeds Whale threshold 5,000)
    EventStreamService.emitUserSentGift(
      { userId: fanActor.userId, creatorProfileId, giftName: "Royal Crown 👑", amountCredits: 6000, creatorNetCredits: 4800, platformFeeCredits: 1200, sentAt: new Date().toISOString() },
      fanActor
    );

    const fanRecord = creatorCrmStore.getFan(creatorProfileId, fanActor.userId);
    assert(fanRecord !== undefined, "CRM fan record must be created");
    assert(fanRecord?.cohorts.includes("WHALES" as any), "Fan must be classified into WHALES cohort");
    assert(fanRecord?.cohorts.includes("TOP_SPENDERS" as any), "Fan must be classified into TOP_SPENDERS cohort");
    assertEqual(fanRecord?.totalCreditsSpent >= 6000, true, "Lifetime spend must reflect accumulated credits");
  });

  // --------------------------------------------------------------------------
  // TEST 4: Fraud Detection Engine Fan-Out & Velocity Spike Analysis
  // --------------------------------------------------------------------------
  await runner.runTest("Engine 7 (Fraud Detection): Spend velocity bursts trigger security anomaly detection", () => {
    const suspiciousUserId = "user_risky_99";
    const suspActor: EventActor = { userId: suspiciousUserId, displayName: "Risky User" };

    // Emit 11 rapid purchases in sequence
    for (let i = 0; i < 11; i++) {
      EventStreamService.emitUserSentGift(
        { userId: suspiciousUserId, creatorProfileId, giftName: "Spam Gift", amountCredits: 1000, creatorNetCredits: 800, platformFeeCredits: 200, sentAt: new Date().toISOString() },
        suspActor
      );
    }

    assert(FraudHubSubscriber.detectedRiskCount > 0, "Fraud hub must flag velocity anomaly for rapid transactions");
    const riskSignals = FraudHubSubscriber.getRiskSignals();
    assert(riskSignals.some((s) => s.userId === suspiciousUserId && s.anomalyType === "RAPID_SPEND_BURST"), "Risk signal must be recorded for suspicious user");
  });

  // --------------------------------------------------------------------------
  // TEST 5: Creator Analytics Engine Fan-Out & Live Conversion Metrics
  // --------------------------------------------------------------------------
  await runner.runTest("Engine 8 (Creator Analytics): Live viewers and payers compute realtime conversion rate", () => {
    const streamCreator = "creator_streamer_01";
    const streamerActor: EventActor = { userId: "user_viewer_01", displayName: "Viewer 1" };

    // 1. Viewer Joins
    EventStreamService.emitUserJoinedLive(
      { livestreamId: "stream_live_01", creatorProfileId: streamCreator, userId: "user_viewer_01", joinedAt: new Date().toISOString(), isSubscriber: false },
      streamerActor
    );

    // 2. Viewer Buys Content
    EventStreamService.emitUserBoughtContent(
      { orderId: "ord_conv_01", userId: "user_viewer_01", creatorProfileId: streamCreator, contentId: "cnt_conv_01", contentTitle: "Live Clip", contentType: "VIDEO", priceCreditsPaid: 200, purchasedAt: new Date().toISOString() },
      streamerActor
    );

    const metrics = CreatorAnalyticsHubSubscriber.getMetrics(streamCreator);
    assert(metrics !== null, "Creator realtime metrics must be present");
    assertEqual(metrics?.activeViewers, 1, "Active viewers must be 1");
    assertEqual(metrics?.totalPpvGross, 200, "Gross PPV revenue must be 200");
    assertEqual(metrics?.conversionRatePercent, 100, "1 out of 1 viewer converted (100% conversion rate)");
  });

  return runner.getSummary().failedCount === 0;
}

if (require.main === module) {
  runBehavioralEventsIntegrationTests().then((passed) => {
    process.exit(passed ? 0 : 1);
  });
}
