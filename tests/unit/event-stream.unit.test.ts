/**
 * UNIT TEST SUITE: BEHAVIORAL EVENT STREAM PIPELINE
 * 
 * Verifies core behavioral event emission, envelope metadata enrichment,
 * and typed dispatchers:
 * 1. User Joined Live
 * 2. User Followed Creator
 * 3. User Bought Content
 * 4. User Sent Gift
 * 5. Goal Progressed
 * 6. Level Increased
 * 7. Session Booked
 * 8. Buffer and Event Stream Metrics
 */

import { TestRunner, assert, assertEqual } from "../utils/test-runner";
import { EventStreamService } from "@/modules/events/event-stream.service";
import { EventActor } from "@/modules/events/types";

export async function runEventStreamUnitTests(): Promise<boolean> {
  const runner = new TestRunner("Layer 1D: Behavioral Event Stream Unit Tests");
  runner.printHeader();

  EventStreamService._reset();

  const actor: EventActor = {
    userId: "user_fan_01",
    username: "alex_patron",
    displayName: "Alex Patron 💎",
    role: "FAN",
    fanLevel: 3,
  };

  const creatorProfileId = "creator_maya_01";
  const livestreamId = "stream_live_123";

  // --------------------------------------------------------------------------
  // TEST 1: User Joined Live
  // --------------------------------------------------------------------------
  await runner.runTest("Event Stream: Emits USER_JOINED_LIVE event with full envelope", () => {
    const event = EventStreamService.emitUserJoinedLive(
      {
        livestreamId,
        creatorProfileId,
        userId: actor.userId,
        joinedAt: new Date().toISOString(),
        isSubscriber: true,
        tierLevel: 2,
        seatIndex: 1,
      },
      actor
    );

    assertEqual(event.type, "USER_JOINED_LIVE", "Event type must match");
    assertEqual(event.channel, `room:${livestreamId}`, "Channel must route to stream room");
    assertEqual(event.actor.userId, actor.userId, "Actor ID must match");
    assert(event.id.startsWith("evt_"), "Event ID must be generated");
  });

  // --------------------------------------------------------------------------
  // TEST 2: User Followed Creator
  // --------------------------------------------------------------------------
  await runner.runTest("Event Stream: Emits USER_FOLLOWED_CREATOR event", () => {
    const event = EventStreamService.emitUserFollowedCreator(
      {
        userId: actor.userId,
        creatorProfileId,
        followedAt: new Date().toISOString(),
        notifyTier: "ALL",
      },
      actor
    );

    assertEqual(event.type, "USER_FOLLOWED_CREATOR", "Event type must match");
    assertEqual(event.creatorProfileId, creatorProfileId, "Creator profile ID must be attached");
    assertEqual(event.payload.notifyTier, "ALL", "Payload parameters preserved");
  });

  // --------------------------------------------------------------------------
  // TEST 3: User Bought Content
  // --------------------------------------------------------------------------
  await runner.runTest("Event Stream: Emits USER_BOUGHT_CONTENT event with orderId", () => {
    const event = EventStreamService.emitUserBoughtContent(
      {
        orderId: "ord_ppv_123",
        userId: actor.userId,
        creatorProfileId,
        contentId: "content_video_456",
        contentTitle: "Neon Velvet Director's Cut",
        contentType: "VIDEO",
        priceCreditsPaid: 350,
        purchasedAt: new Date().toISOString(),
      },
      actor
    );

    assertEqual(event.type, "USER_BOUGHT_CONTENT", "Event type must match");
    assertEqual(event.entityId, "content_video_456", "Entity ID must point to content");
    assertEqual(event.payload.priceCreditsPaid, 350, "Price credits must match");
  });

  // --------------------------------------------------------------------------
  // TEST 4: User Sent Gift
  // --------------------------------------------------------------------------
  await runner.runTest("Event Stream: Emits USER_SENT_GIFT event with tip payload", () => {
    const event = EventStreamService.emitUserSentGift(
      {
        userId: actor.userId,
        creatorProfileId,
        livestreamId,
        giftName: "Diamond Tiara",
        amountCredits: 1000,
        creatorNetCredits: 800,
        platformFeeCredits: 200,
        customMessage: "Keep shining! ✨",
        sentAt: new Date().toISOString(),
      },
      actor
    );

    assertEqual(event.type, "USER_SENT_GIFT", "Event type must match");
    assertEqual(event.payload.amountCredits, 1000, "Gift amount must be 1000");
    assertEqual(event.payload.creatorNetCredits, 800, "Creator net must be 800");
  });

  // --------------------------------------------------------------------------
  // TEST 5: Goal Progressed
  // --------------------------------------------------------------------------
  await runner.runTest("Event Stream: Emits GOAL_PROGRESSED event", () => {
    const event = EventStreamService.emitGoalProgressed(
      {
        goalId: "goal_cosplay_01",
        creatorProfileId,
        livestreamId,
        goalTitle: "Special Midnight Outfit Unlock",
        contributorUserId: actor.userId,
        contributionCredits: 500,
        currentCredits: 4500,
        targetCredits: 5000,
        percentComplete: 90,
        isCompleted: false,
      },
      actor
    );

    assertEqual(event.type, "GOAL_PROGRESSED", "Event type must match");
    assertEqual(event.payload.percentComplete, 90, "Percent complete must be 90");
  });

  // --------------------------------------------------------------------------
  // TEST 6: Level Increased
  // --------------------------------------------------------------------------
  await runner.runTest("Event Stream: Emits LEVEL_INCREASED milestone event", () => {
    const event = EventStreamService.emitLevelIncreased(
      {
        userId: actor.userId,
        creatorProfileId,
        previousLevel: 2,
        newLevel: 3,
        totalXp: 1500,
        xpSource: "LIVESTREAM_TIPPING",
        unlockedBadge: "SILVER_SUPPORTER",
        leveledUpAt: new Date().toISOString(),
      },
      actor
    );

    assertEqual(event.type, "LEVEL_INCREASED", "Event type must match");
    assertEqual(event.payload.newLevel, 3, "New level must be 3");
  });

  // --------------------------------------------------------------------------
  // TEST 7: Session Booked
  // --------------------------------------------------------------------------
  await runner.runTest("Event Stream: Emits SESSION_BOOKED event", () => {
    const event = EventStreamService.emitSessionBooked(
      {
        bookingId: "book_priv_01",
        fanId: actor.userId,
        creatorProfileId,
        scheduledStartTime: new Date(Date.now() + 3600000).toISOString(),
        durationMinutes: 30,
        totalCreditsEscrowed: 3000,
        bookedAt: new Date().toISOString(),
      },
      actor
    );

    assertEqual(event.type, "SESSION_BOOKED", "Event type must match");
    assertEqual(event.payload.durationMinutes, 30, "Duration must be 30");
  });

  // --------------------------------------------------------------------------
  // TEST 8: Stream Metrics & Telemetry
  // --------------------------------------------------------------------------
  await runner.runTest("Event Stream: Aggregates real-time metrics and circular buffer", () => {
    const metrics = EventStreamService.getMetrics();
    assertEqual(metrics.totalPublished, 7, "Total published events must be 7");
    assertEqual(metrics.recentEvents.length, 7, "Recent events buffer must hold 7 events");
  });

  return runner.getSummary().failedCount === 0;
}

if (require.main === module) {
  runEventStreamUnitTests().then((passed) => {
    process.exit(passed ? 0 : 1);
  });
}
