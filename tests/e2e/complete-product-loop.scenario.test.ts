/**
 * E2E SCENARIO TEST SUITE: COMPLETE PRODUCT LOOP
 * 
 * Verifies the complete 38-step end-to-end product loop described in the specification:
 * 1. Fan authentication & backend profile retrieval (0 credits, NEW_FAN)
 * 2. Feed service retrieves recommended lives & frontend displays Creator Luna
 * 3. Fan watches for 45 seconds & analytics records viewing telemetry
 * 4. Fan opens interaction menu (Ask a question 100c, Priority 500c, Private 1000c)
 * 5. Fan buys 100 credits -> Webhook confirmed -> Wallet ledger credits account (+100c)
 * 6. Fan buys question -> Zero-trust price/balance check -> Atomic debit -> Order created -> 80/20 creator share
 * 7. Interaction enters queue -> Creator control room receives event -> Creator accepts
 * 8. Fan receives acceptance -> Interaction happens -> Order becomes COMPLETED
 * 9. Fan earns 500 relationship XP -> Level increases -> LEVEL UP — SUPPORTER emitted -> Badge changes
 * 10. Creator's leaderboard changes -> Goal progresses (+100c) -> Fan remains in room
 * 11. Fan subscribes -> Entitlements granted (SUBSCRIBER_CONTENT, SUBSCRIBER_CHAT, VIP_BADGE)
 * 12. Fan returns tomorrow -> Recommendation system evaluates repeated multi-layered engagement -> Luna boosted to #1 in feed
 */

import { TestRunner, assert, assertEqual } from "../utils/test-runner";
import { ProductLoopOrchestrator } from "@/modules/scenarios/product-loop-orchestrator";

export async function runCompleteProductLoopTests(): Promise<boolean> {
  const runner = new TestRunner("Layer 6B: Complete Product Loop Lifecycle Scenario");
  runner.printHeader();

  const orchestrator = new ProductLoopOrchestrator();

  await runner.runTest("Step 1: Fan authenticates & profile initialized with 0 credits and NEW_FAN tier", async () => {
    const state = await orchestrator.step1_AuthenticateFan();
    assertEqual(state.fan.walletBalance, 0, "Fan initial wallet balance is 0 credits");
    assertEqual(state.fan.relationshipTier, "NEW_FAN", "Fan starts at NEW_FAN relationship tier");
    assertEqual(state.fan.currentLevel, 1, "Fan starts at Level 1");
  });

  await runner.runTest("Step 2: Feed service retrieves recommended lives and displays Creator Luna", async () => {
    const state = await orchestrator.step2_DiscoverCreatorLuna();
    assertEqual(state.creatorLuna.isLive, true, "Creator Luna is authoritatively LIVE");
    assert(state.feedRanking.day1Feed.some((f) => f.creatorId === state.creatorLuna.id), "Luna is in Day 1 Discovery Feed");
  });

  await runner.runTest("Step 3: Fan watches for 45 seconds and analytics records high-retention telemetry", async () => {
    const state = await orchestrator.step3_RecordViewingTelemetry();
    assertEqual(state.currentStep, 3, "Step 3 completed");
    assert(state.activeEventLog.some((e) => e.eventType === "WATCH_TELEMETRY_RECORDED"), "Analytics logged viewing telemetry");
  });

  await runner.runTest("Step 4: Interaction menu returns 100c Question, 500c Priority, 1000c Private", async () => {
    const state = await orchestrator.step4_OpenInteractionMenu();
    assertEqual(state.creatorLuna.activeInteractions.length, 3, "3 active interactions returned");
    assertEqual(state.creatorLuna.activeInteractions[0].priceCredits, 100, "Ask a question is 100 credits");
    assertEqual(state.creatorLuna.activeInteractions[1].priceCredits, 500, "Priority interaction is 500 credits");
    assertEqual(state.creatorLuna.activeInteractions[2].priceCredits, 1000, "Private session is 1,000 credits");
  });

  await runner.runTest("Step 5: Fan buys 100 credits via signed webhook & wallet ledger credits account (+100c)", async () => {
    const state = await orchestrator.step5_BuyCreditsViaGateway();
    assertEqual(state.fan.walletBalance, 100, "Fan wallet balance credited to 100 credits");
    assert(state.activeEventLog.some((e) => e.eventType === "WALLET_CREDITED"), "Ledger deposit event recorded");
  });

  await runner.runTest("Step 6: Fan buys question (100c) -> Atomic debit, order creation & 80/20 split (80c Luna, 20c rake)", async () => {
    const state = await orchestrator.step6_PurchaseQuestionInteraction();
    assertEqual(state.fan.walletBalance, 0, "Fan wallet debited 100 credits to 0 balance");
    assertEqual(state.creatorLuna.walletBalance, 80, "Creator Luna earned 80 credits (80% net)");
    assertEqual(state.liveInteractionQueue.length, 1, "Interaction placed in Live Queue");
    assertEqual(state.liveInteractionQueue[0].position, 1, "Interaction is at position #1");
  });

  await runner.runTest("Step 7: Creator control room receives event & accepts the question", async () => {
    const state = await orchestrator.step7_CreatorAcceptsInteraction();
    assertEqual(state.liveInteractionQueue[0].status, "ACCEPTED", "Interaction status transitioned to ACCEPTED");
  });

  await runner.runTest("Step 8: Interaction happens on stream & order becomes COMPLETED", async () => {
    const state = await orchestrator.step8_ExecuteAndCompleteOrder();
    assertEqual(state.liveInteractionQueue[0].status, "COMPLETED", "Order status transitioned to COMPLETED");
  });

  await runner.runTest("Step 9: Fan earns 500 XP -> LEVEL UP — SUPPORTER emitted & badge updates to Blue Shield", async () => {
    const state = await orchestrator.step9_AwardXpAndLevelUp();
    assertEqual(state.fan.totalXp, 500, "Fan earned 500 XP");
    assertEqual(state.fan.relationshipTier, "SUPPORTER", "Relationship tier upgraded to SUPPORTER");
    assertEqual(state.fan.currentLevel, 3, "Fan advanced to Level 3");
    assertEqual(state.celebrationBanner?.title, "LEVEL UP — SUPPORTER", "LEVEL UP — SUPPORTER celebration modal triggered");
  });

  await runner.runTest("Step 10: Collective Goal progresses (+100c) and fan ascends to Leaderboard Rank #2", async () => {
    const state = await orchestrator.step10_UpdateLeaderboardAndGoal();
    assertEqual(state.creatorLuna.liveGoal.currentCredits, 500, "Goal incremented from 400 to 500 credits");
    assertEqual(state.creatorLuna.liveGoal.progressPercent, 50, "Goal reached 50% completion");
    assertEqual(state.creatorLuna.leaderboardRank[1].userId, state.fan.id, "Fan Alex is Rank #2 on Luna's leaderboard");
  });

  await runner.runTest("Step 11: Fan subscribes to VIP Tier -> Entitlements granted (SUBSCRIBER_CONTENT, SUBSCRIBER_CHAT)", async () => {
    const state = await orchestrator.step11_FanSubscribes();
    assert(state.fan.entitlements.includes("SUBSCRIBER_CONTENT"), "Fan granted SUBSCRIBER_CONTENT entitlement");
    assert(state.fan.entitlements.includes("SUBSCRIBER_CHAT"), "Fan granted SUBSCRIBER_CHAT entitlement");
    assert(state.fan.entitlements.includes("VIP_BADGE"), "Fan granted VIP_BADGE entitlement");
  });

  await runner.runTest("Step 12: Fan returns tomorrow -> Recommendation affinity boosts Luna to #1 in feed", async () => {
    const state = await orchestrator.step12_NextDayReturnFeedElevation();
    assertEqual(state.feedRanking.day2Feed[0].creatorId, state.creatorLuna.id, "Creator Luna elevated to Rank #1 in Day 2 Feed");
    assertEqual(state.feedRanking.day2Feed[0].rank, 1, "Luna rank is #1");
    assertEqual(state.feedRanking.day2Feed[0].isBoosted, true, "Personalized affinity boost flag is active");
    assert(state.feedRanking.day2Feed[0].score > 0.95, "Luna affinity score reaches 0.99");
  });

  const summary = runner.printFooter();
  return summary.failedCount === 0;
}

if (require.main === module) {
  runCompleteProductLoopTests().then((success) => process.exit(success ? 0 : 1));
}
