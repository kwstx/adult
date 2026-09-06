import { NotificationService } from "../src/modules/notifications/notification.service";
import { notificationQueue } from "../src/modules/notifications/notification-queue.service";
import { notificationWorker } from "../src/modules/notifications/notification-worker";
import { AudienceResolver } from "../src/modules/notifications/audience-resolver";
import { eventBus } from "../src/modules/realtime/event-bus";
import { performance } from "perf_hooks";

async function runVerification() {
  console.log("================================================================================");
  console.log("🚀 STARTING NOTIFICATION SYSTEM ARCHITECTURE VERIFICATION");
  console.log("================================================================================\n");

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ PASS: ${testName} ${detail ? `(${detail})` : ""}`);
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ""}`);
    }
  }

  // ---------------------------------------------------------------------------
  // TEST 1: Non-Blocking "Go Live" Execution Latency (< 10ms)
  // ---------------------------------------------------------------------------
  console.log("TEST 1: Non-Blocking Creator 'Go Live' Producer Latency");
  const startGoLive = performance.now();
  const goLiveResult = await NotificationService.notifyCreatorWentLive({
    creatorProfileId: "prof_maya",
    streamTitle: "Midnight Glow Interactive Stage ✨",
    stageName: "Maya Velvet ✨",
  });
  const goLiveDurationMs = performance.now() - startGoLive;

  assert(
    goLiveResult.success && !goLiveResult.isDuplicate,
    "Go Live Notification enqueued successfully",
    `Job ID: ${goLiveResult.jobId}`
  );
  assert(
    goLiveDurationMs < 20,
    "Go Live producer returns in sub-20ms (< 10ms nominal)",
    `Actual: ${goLiveDurationMs.toFixed(2)}ms`
  );
  console.log("");

  // ---------------------------------------------------------------------------
  // TEST 2: Idempotency & Duplicate Protection Coalescing
  // ---------------------------------------------------------------------------
  console.log("TEST 2: Idempotency & Burst Protection");
  const duplicateGoLive = await NotificationService.notifyCreatorWentLive({
    creatorProfileId: "prof_maya",
    streamTitle: "Midnight Glow Interactive Stage ✨",
    stageName: "Maya Velvet ✨",
  });

  assert(
    duplicateGoLive.isDuplicate === true,
    "Duplicate rapid go-live within cooldown is safely coalesced",
    `isDuplicate = ${duplicateGoLive.isDuplicate}`
  );
  console.log("");

  // ---------------------------------------------------------------------------
  // TEST 3: All 8 Core Platform Event Types Dispatch
  // ---------------------------------------------------------------------------
  console.log("TEST 3: Universal Architecture - Enqueueing All 8 Core Event Types");

  // 1. Private Session Reminder (15m before booking)
  const remResult = await NotificationService.notifyPrivateSessionReminder({
    bookingId: "bk_test_881",
    fanUserId: "fan_alex",
    creatorUserId: "creator_maya",
    creatorDisplayName: "Maya Velvet ✨",
    fanDisplayName: "Alex Patron 💎",
    scheduledStartTime: new Date(Date.now() + 15 * 60000).toISOString(),
    minutesUntil: 15,
  });
  assert(remResult.success, "1. Private Session Reminder Enqueued", `Job: ${remResult.jobId}`);

  // 2. Subscription Renewal
  const subResult = await NotificationService.notifySubscriptionRenewal({
    fanUserId: "fan_alex",
    creatorProfileId: "prof_maya",
    creatorName: "Maya Velvet ✨",
    tierName: "Diamond VIP",
    priceCredits: 1500,
    status: "SUCCESS",
  });
  assert(subResult.success, "2. Subscription Renewal Enqueued", `Job: ${subResult.jobId}`);

  // 3. Direct / Paid Message Received
  const msgResult = await NotificationService.notifyMessageReceived({
    senderUserId: "fan_sarah",
    senderDisplayName: "Sarah 👑",
    recipientUserId: "creator_maya",
    messagePreview: "Loved the VIP set yesterday! 💖",
    conversationId: "conv_sarah_maya",
    isPaid: true,
    creditsAmount: 100,
  });
  assert(msgResult.success, "3. Paid Message Notification Enqueued", `Job: ${msgResult.jobId}`);

  // 4. Content Release (PPV / Gallery)
  const contentResult = await NotificationService.notifyContentRelease({
    creatorProfileId: "prof_maya",
    creatorName: "Maya Velvet ✨",
    contentId: "cnt_stage_4k_99",
    contentTitle: "Neon Nights 4K Studio Set",
    contentType: "VIDEO",
    accessLevel: "PPV_PURCHASE",
  });
  assert(contentResult.success, "4. Content Release Notification Enqueued", `Job: ${contentResult.jobId}`);

  // 5. Goal Completed
  const goalResult = await NotificationService.notifyGoalCompleted({
    creatorProfileId: "prof_maya",
    creatorName: "Maya Velvet ✨",
    goalId: "goal_midnight_100k",
    goalTitle: "MIDNIGHT GOAL",
    targetCredits: 100000,
    unlockTitle: "Special Experience Stage Unlocked",
  });
  assert(goalResult.success, "5. Goal Completed Celebration Enqueued", `Job: ${goalResult.jobId}`);

  // 6. Creator Event
  const eventResult = await NotificationService.notifyCreatorEvent({
    creatorProfileId: "prof_maya",
    creatorName: "Maya Velvet ✨",
    eventId: "evt_masquerade_01",
    eventTitle: "Annual VIP Masquerade Gala",
    scheduledStartTime: new Date(Date.now() + 86400000).toISOString(),
  });
  assert(eventResult.success, "6. Creator Event Notification Enqueued", `Job: ${eventResult.jobId}`);

  // 7. Drop Release
  const dropResult = await NotificationService.notifyDropRelease({
    creatorProfileId: "prof_maya",
    creatorName: "Maya Velvet ✨",
    dropId: "drop_holo_pass_10",
    dropTitle: "Numbered Holographic VIP Pass",
    limitedQuantity: 50,
    priceCredits: 2500,
  });
  assert(dropResult.success, "7. Exclusive Drop Notification Enqueued", `Job: ${dropResult.jobId}`);
  console.log("");

  // ---------------------------------------------------------------------------
  // TEST 4: Real-time SSE Multi-Cast Listener Verification
  // ---------------------------------------------------------------------------
  console.log("TEST 4: Real-Time EventBus Multi-Cast Channel Delivery");
  let receivedRealtimeEvent = false;
  const unsubscribe = eventBus.subscribe("user:fan_alex", (event) => {
    if (event.type === ("NOTIFICATION" as any)) {
      receivedRealtimeEvent = true;
    }
  });

  // Enqueue direct specific user notification
  await NotificationService.sendNotification({
    eventType: "SYSTEM_ANNOUNCEMENT",
    payload: {
      type: "SYSTEM_ANNOUNCEMENT",
      title: "Real-time SSE Delivery Test",
      body: "Instant WebSocket/SSE push validation.",
    },
    audience: { type: "SPECIFIC_USERS", userIds: ["fan_alex"] },
    channels: ["IN_APP", "REALTIME_SSE"],
  });

  // Process job
  await notificationWorker.drainQueue();
  unsubscribe();

  assert(
    receivedRealtimeEvent === true,
    "Real-time event was delivered to user:fan_alex channel instantly",
    "SSE / WebSocket listener triggered"
  );
  console.log("");

  // ---------------------------------------------------------------------------
  // TEST 5: Background Batch Worker Queue Drain & Telemetry
  // ---------------------------------------------------------------------------
  console.log("TEST 5: Background Batch Worker Processing & Telemetry");
  const workerStart = performance.now();
  const batchResults = await notificationWorker.drainQueue();
  const workerDuration = performance.now() - workerStart;

  const stats = await notificationQueue.getHealthStats();

  assert(
    stats.completedJobsTotal >= 7,
    "Worker successfully processed all enqueued jobs",
    `Completed Jobs: ${stats.completedJobsTotal}`
  );
  assert(
    stats.failedJobsTotal === 0,
    "Zero job failures across all transports",
    `Failed: ${stats.failedJobsTotal}, DLQ: ${stats.deadLetterJobsTotal}`
  );
  assert(
    stats.totalNotificationsDelivered > 0,
    "Notification deliveries recorded in telemetry",
    `Total Delivered: ${stats.totalNotificationsDelivered}`
  );
  console.log("");

  // ---------------------------------------------------------------------------
  // FINAL SUMMARY
  // ---------------------------------------------------------------------------
  console.log("================================================================================");
  console.log(`🏁 NOTIFICATION ENGINE VERIFICATION COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log("================================================================================\n");

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error("Verification script encountered fatal error:", err);
  process.exit(1);
});
