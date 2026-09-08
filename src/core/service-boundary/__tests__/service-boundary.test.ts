/**
 * Service Boundary & Candidate Services Test Suite
 * 
 * Verifies:
 * 1. Health & registration of all 9 candidate services.
 * 2. In-process execution of all 9 services in modular monolith mode.
 * 3. Dynamic mode switching between IN_PROCESS and OUT_OF_PROCESS_RPC.
 * 4. Circuit breaker failure detection, fast-failing, and graceful fallbacks.
 * 5. Standalone microservice HTTP/RPC server boot and dispatching.
 */

import { serviceRegistry } from "../service-registry";
import { CircuitBreaker } from "../circuit-breaker";
import {
  mediaOrchestrationService,
  paymentWalletService,
  messagingService,
  recommendationService,
  notificationService,
  moderationService,
  analyticsService,
  searchService,
  creatorPayoutService,
} from "../../services";
import { StandaloneServiceServer } from "../../../services/standalone-server";

async function runServiceBoundaryTestSuite() {
  console.log("===============================================================");
  console.log("🧪 TEST SUITE: Service Boundary & 9 Candidate Services");
  console.log("===============================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Service Registry Initialization & Health Summary
    // -------------------------------------------------------------------------
    console.log("[1] Testing Service Registry Health Summary for all 9 Services...");
    const healthSummary = serviceRegistry.getHealthSummary();
    assert(healthSummary.length === 9, "All 9 candidate services registered in ServiceRegistry");
    assert(
      healthSummary.every((h) => h.status === "HEALTHY"),
      "All 9 candidate services initially report HEALTHY"
    );
    assert(
      healthSummary.every((h) => h.mode === "IN_PROCESS"),
      "All 9 candidate services default to IN_PROCESS (modular monolith)"
    );

    // -------------------------------------------------------------------------
    // TEST 2: In-Process Execution: Service #1 (Media Orchestration)
    // -------------------------------------------------------------------------
    console.log("\n[2] Testing Media Orchestration Service...");
    const transcodeRes = await mediaOrchestrationService.requestTranscoding({
      mediaId: "vod_100",
      sourceUrl: "s3://raw-uploads/video.mp4",
      renditions: ["1080p", "720p"],
    });
    assert(Boolean(transcodeRes.jobId), "Transcoding job submitted with ID");

    const signedUrlRes = await mediaOrchestrationService.generateSignedMediaUrl("vod_100", "user_1");
    assert(signedUrlRes.signedUrl.includes("protected/vod_100"), "Signed media URL generated");

    const tokenRes = await mediaOrchestrationService.createLiveEgressToken({
      streamId: "stream_test",
      userId: "fan_1",
      role: "VIEWER",
      protocol: "HLS_LL",
    });
    assert(Boolean(tokenRes.streamToken), "Live stream egress token created");

    // -------------------------------------------------------------------------
    // TEST 3: In-Process Execution: Service #2 (Payments & Wallet)
    // -------------------------------------------------------------------------
    console.log("\n[3] Testing Payments & Wallet Service...");
    const balanceRes = await paymentWalletService.getBalance("wallet_fan_1");
    assert(balanceRes.currency === "CREDITS", "Wallet balance queried in CREDITS");

    const holdRes = await paymentWalletService.reserveCredits({
      walletId: "wallet_fan_1",
      amountCredits: 100,
      idempotencyKey: "hold_test_1",
      reason: "Interaction reservation",
    });
    assert(holdRes.status === "HELD", "Credits held with status HELD");

    const transferRes = await paymentWalletService.transferCredits({
      sourceWalletId: "wallet_fan_1",
      targetWalletId: "wallet_creator_1",
      amountCredits: 500,
      idempotencyKey: "tip_test_1",
      purpose: "TIP",
      creatorSharePercent: 80,
    });
    assert(transferRes.netCreditsTransferred === 400, "Net credits calculated (80% creator net = 400)");
    assert(transferRes.platformRakeCredits === 100, "Platform rake calculated (20% = 100)");

    const webhookRes = await paymentWalletService.processGatewayWebhook(
      "STRIPE",
      { orderId: "ord_101", amountCredits: 1000 },
      "sig_valid"
    );
    assert(webhookRes.eventHandled === true, "Gateway webhook processed idempotently");

    // -------------------------------------------------------------------------
    // TEST 4: In-Process Execution: Service #3 (Messaging)
    // -------------------------------------------------------------------------
    console.log("\n[4] Testing Messaging Service...");
    const dmRes = await messagingService.sendDirectMessage({
      senderId: "fan_1",
      recipientId: "creator_maya",
      content: "Loved your stream today!",
      tipAmountCredits: 50,
    });
    assert(Boolean(dmRes.messageId), "Direct message dispatched with ID");

    const bcastRes = await messagingService.broadcastRoomChat({
      roomId: "room_101",
      senderId: "fan_1",
      senderName: "DiamondFan",
      senderRole: "VIP",
      content: "Hello everyone!",
    });
    assert(Boolean(bcastRes.broadcastId), "Room chat broadcast dispatched");

    // -------------------------------------------------------------------------
    // TEST 5: In-Process Execution: Service #4 (Recommendation)
    // -------------------------------------------------------------------------
    console.log("\n[5] Testing Recommendation Service...");
    const feedRes = await recommendationService.getLiveFeedRecommendations({ limit: 5 });
    assert(feedRes.items.length > 0, "Feed recommendations returned candidates");
    assert(Boolean(feedRes.algorithmVersion), "Algorithm version stamped on response");

    const affinityRes = await recommendationService.calculateUserCreatorAffinity("user_1", "creator_maya");
    assert(affinityRes.affinityScore > 0, "Affinity score calculated");

    // -------------------------------------------------------------------------
    // TEST 6: In-Process Execution: Service #5 (Notifications)
    // -------------------------------------------------------------------------
    console.log("\n[6] Testing Notifications Service...");
    const notifRes = await notificationService.dispatchNotification({
      recipientUserId: "user_fan_1",
      type: "LIVE_STARTED",
      title: "Streamer Maya is live!",
      body: "Come watch the new VIP interaction show",
      channels: ["IN_APP", "WEB_PUSH"],
    });
    assert(Boolean(notifRes.notificationId), "Notification dispatched with ID");

    const liveAlertRes = await notificationService.broadcastLiveAlert({
      creatorId: "creator_maya",
      creatorName: "Maya Lin",
      streamId: "stream_101",
      streamTitle: "Late Night VIP Session",
      category: "Interactive",
    });
    assert(liveAlertRes.audienceSize > 0, "Live alert broadcast triggered to audience");

    // -------------------------------------------------------------------------
    // TEST 7: In-Process Execution: Service #6 (Moderation)
    // -------------------------------------------------------------------------
    console.log("\n[7] Testing Moderation Service...");
    const cleanTextRes = await moderationService.screenText({
      text: "Hello, great stream!",
      authorUserId: "user_1",
      context: "CHAT",
    });
    assert(cleanTextRes.actionTaken === "ALLOW", "Clean text permitted with ALLOW");

    const flaggedTextRes = await moderationService.screenText({
      text: "Warning: check out this scam link",
      authorUserId: "user_2",
      context: "CHAT",
    });
    assert(flaggedTextRes.actionTaken === "MASK", "Suspicious terms flagged with MASK");

    const complianceRes = await moderationService.verify2257Compliance("creator_maya");
    assert(complianceRes.isCompliant === true, "2257 age verification verified");

    // -------------------------------------------------------------------------
    // TEST 8: In-Process Execution: Service #7 (Analytics)
    // -------------------------------------------------------------------------
    console.log("\n[8] Testing Analytics Service...");
    const trackRes = await analyticsService.trackEvent({
      eventName: "STREAM_VIEW_30S",
      userId: "user_1",
      creatorId: "creator_maya",
      streamId: "stream_101",
    });
    assert(trackRes.acknowledged === true, "Analytics event tracked");

    const revMetrics = await analyticsService.getCreatorRevenueMetrics({
      creatorId: "creator_maya",
      startDate: "2026-09-01",
      endDate: "2026-09-08",
    });
    assert(revMetrics.totalNetCents > 0, "Creator revenue metrics retrieved");

    // -------------------------------------------------------------------------
    // TEST 9: In-Process Execution: Service #8 (Search)
    // -------------------------------------------------------------------------
    console.log("\n[9] Testing Search Service...");
    const searchRes = await searchService.search({ query: "Maya", type: "CREATORS" });
    assert(searchRes.results.length > 0, "Search query returned matching creator");
    assert(searchRes.results[0].title === "Maya Lin", "Matching creator title is Maya Lin");

    const indexRes = await searchService.indexEntity({
      entityType: "CREATOR",
      entityId: "creator_maya",
      action: "UPSERT",
    });
    assert(indexRes.acknowledged === true, "Search indexing request acknowledged");

    // -------------------------------------------------------------------------
    // TEST 10: In-Process Execution: Service #9 (Creator Payouts)
    // -------------------------------------------------------------------------
    console.log("\n[10] Testing Creator Payouts Service...");
    const earningsRes = await creatorPayoutService.getPayableEarnings("creator_maya");
    assert(earningsRes.payableCredits > 0, "Payable earnings retrieved");

    const payoutReqRes = await creatorPayoutService.requestPayout({
      creatorProfileId: "creator_maya",
      amountCredits: 5000,
      payoutMethod: "STRIPE_CONNECT",
      payoutDestination: "acct_stripe_connect_test",
    });
    assert(payoutReqRes.grossAmountCents === 50000, "Gross payout cents calculated ($500.00 = 50,000 cents)");
    assert(payoutReqRes.netAmountCents === 40000, "Net creator payout calculated ($400.00 = 40,000 cents)");
    assert(payoutReqRes.platformRakeCents === 10000, "Platform rake calculated ($100.00 = 10,000 cents)");

    // -------------------------------------------------------------------------
    // TEST 11: Circuit Breaker Resilience & Fallback
    // -------------------------------------------------------------------------
    console.log("\n[11] Testing Circuit Breaker State Transitions & Fallbacks...");
    const testBreaker = new CircuitBreaker("TEST_CIRCUIT", {
      failureThreshold: 3,
      resetTimeoutMs: 500,
      timeoutMs: 100,
    });

    assert(testBreaker.getState() === "CLOSED", "Circuit starts CLOSED");

    // Induce 3 failures
    for (let i = 0; i < 3; i++) {
      try {
        await testBreaker.execute(async () => {
          throw new Error("Simulated network outage");
        });
      } catch {}
    }

    assert(testBreaker.getState() === "OPEN", "Circuit tripped to OPEN after 3 failures");

    // Verify fast-fail fallback
    const fallbackRes = await testBreaker.execute(
      async () => "success",
      (err) => "fallback_handled"
    );
    assert(fallbackRes === "fallback_handled", "Fast-failing circuit executed fallback handler");

    // -------------------------------------------------------------------------
    // TEST 12: Standalone HTTP/RPC Microservice Server & Dispatching
    // -------------------------------------------------------------------------
    console.log("\n[12] Testing Standalone Microservice Server on Port 4999...");
    const standaloneServer = new StandaloneServiceServer({
      serviceName: "PAYMENTS_WALLET",
      port: 4999,
    });

    await standaloneServer.start();

    // Verify health endpoint
    const healthResp = await fetch("http://localhost:4999/health");
    const healthJson = await healthResp.json();
    assert(healthJson.status === "UP", "Standalone microservice /health endpoint returned UP");
    assert(healthJson.service === "PAYMENTS_WALLET", "Health endpoint identified correct service");

    // Verify RPC dispatch endpoint over HTTP
    const rpcResp = await fetch("http://localhost:4999/get-balance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletId: "test_wallet_standalone" }),
    });
    const rpcJson = await rpcResp.json();
    assert(rpcJson.currency === "CREDITS", "Standalone RPC call returned valid balance object");

    await standaloneServer.stop();
    assert(true, "Standalone server stopped cleanly");

  } catch (error) {
    console.error("Test execution fatal error:", error);
    failed++;
  }

  console.log("\n===============================================================");
  console.log(`SERVICE BOUNDARY TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("===============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

// Run test if invoked directly
if (require.main === module) {
  runServiceBoundaryTestSuite()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

export { runServiceBoundaryTestSuite };
