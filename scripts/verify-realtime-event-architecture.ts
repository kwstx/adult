/**
 * ============================================================================
 * REAL-TIME DOMAIN EVENT ARCHITECTURE VERIFICATION TEST SUITE
 * ============================================================================
 *
 * Verifies:
 * 1. Standardized Domain Event Vocabulary (all 14 core event types)
 * 2. Single Authoritative Event -> Multi-Subscriber Reactive Fan-Out:
 *    A GIFT_SENT event updates:
 *      - The Live Room (Animations, Banners, Presence)
 *      - The Creator Revenue Display (Gross, Net, Rake ticker)
 *      - The Fan Wallet (Authoritative balance deduction & sync)
 *      - The Leaderboard (ZSET re-ranking -> LEADERBOARD_UPDATED)
 *      - The Goal Engine (Progress -> GOAL_COMPLETED milestone)
 *      - The Progression Engine (XP -> RELATIONSHIP_LEVEL_UP)
 *      - The Analytics System (Telemetry ingestion & GMV metrics)
 * 3. Typed Subscriptions, Wildcards, Channel Scoping, and Error Isolation
 * 4. Zero Polling Architecture
 */

import {
  eventBus,
  RealtimeEventRegistry,
  publishAuthoritativeEvent,
  LiveRoomSubscriber,
  CreatorRevenueSubscriber,
  FanWalletSubscriber,
  LeaderboardSubscriber,
  GoalSubscriber,
  ProgressionSubscriber,
  AnalyticsSubscriber,
  GiftSentPayload,
  LiveStartedPayload,
  LiveEndedPayload,
  UserJoinedPayload,
  UserLeftPayload,
  MessageCreatedPayload,
  InteractionCreatedPayload,
  InteractionPurchasedPayload,
  InteractionAcceptedPayload,
  GoalProgressPayload,
  GoalCompletedPayload,
  RelationshipLevelUpPayload,
  LeaderboardUpdatedPayload,
  ContentPurchasedPayload,
  StandardEventType,
  DomainEvent,
} from "../src/modules/realtime";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}${details ? ` -> ${details}` : ""}`);
    failedCount++;
  }
}

async function runRealtimeEventArchitectureVerification() {
  console.log("====================================================================");
  console.log("⚡ STARTING REAL-TIME EVENT ARCHITECTURE VERIFICATION SUITE");
  console.log("====================================================================\n");

  // Reset all stores and bus for clean testing
  RealtimeEventRegistry.resetForTesting();
  RealtimeEventRegistry.initialize();

  const creatorId = "creator_maya";
  const fanId = "sarah_fan";
  const roomChannel = `room:${creatorId}`;
  const userChannel = `user:${fanId}`;
  const creatorChannel = `creator:${creatorId}`;

  // --------------------------------------------------------------------------
  // TEST 1: EVENT BUS INITIALIZATION & SUBSCRIBER REGISTRATION
  // --------------------------------------------------------------------------
  console.log("--- 1. Event Bus Subscriptions & Subscriber Introspection ---");

  const metrics = eventBus.getMetrics();
  assert(metrics.activeTypeSubscribers > 0, "Type-based subscribers registered successfully");
  assert(metrics.wildcardSubscribers > 0, "Wildcard analytics subscriber registered successfully");

  // --------------------------------------------------------------------------
  // TEST 2: THE AUTHORITATIVE GIFT_SENT SCENARIO (MULTI-SUBSCRIBER FAN-OUT)
  // --------------------------------------------------------------------------
  console.log("\n--- 2. Single Authoritative Event Fan-Out (GIFT_SENT Scenario) ---");
  console.log("  Scenario: Sarah sends a 500-credit 'Diamond Spark' gift to Creator Maya.");
  console.log("  Expected: 7 decoupled systems react to this single authoritative event.\n");

  // Setup Initial State
  FanWalletSubscriber.setBalance(fanId, 2500);
  GoalSubscriber.setGoal(creatorId, "Unlock Midnight VIP Show", 500, 0);
  ProgressionSubscriber.setProgression(creatorId, fanId, 0);

  // Capture broadcasted events across channels
  const capturedRoomEvents: DomainEvent[] = [];
  const capturedUserEvents: DomainEvent[] = [];
  const capturedCreatorEvents: DomainEvent[] = [];

  const unsubRoom = eventBus.subscribe(roomChannel, (e) => capturedRoomEvents.push(e));
  const unsubUser = eventBus.subscribe(userChannel, (e) => capturedUserEvents.push(e));
  const unsubCreator = eventBus.subscribe(creatorChannel, (e) => capturedCreatorEvents.push(e));

  // Build Authoritative GIFT_SENT Payload
  const giftPayload: GiftSentPayload = {
    eventId: "gift_tx_884920",
    creatorId,
    sender: {
      userId: fanId,
      username: "sarah_fan",
      displayName: "Sarah (Diamond VIP)",
      avatarUrl: "https://platform.local/avatars/sarah.jpg",
      badge: "👑 Top Supporter",
      fanLevel: 1,
    },
    gift: {
      id: "gift_diamond_500",
      name: "Diamond Spark",
      icon: "💎",
      creditAmount: 500,
      tier: "LEGENDARY",
      animationType: "GRAND_DIAMOND_EXPLOSION",
      customMessage: "Sarah: Keep inspiring everyone! Amazing broadcast! ✨",
    },
    creatorEarningsDelta: {
      grossCredits: 500,
      netCredits: 400, // 80% creator net
      platformRakeCredits: 100, // 20% platform rake
      totalSessionCredits: 400,
    },
    sentAt: new Date().toISOString(),
  };

  // Publish SINGLE Authoritative Event
  publishAuthoritativeEvent("GIFT_SENT", giftPayload, {
    channel: roomChannel,
    actor: {
      userId: fanId,
      displayName: "Sarah (Diamond VIP)",
      role: "FAN",
    },
    entityId: "gift_diamond_500",
    correlationId: "corr_gift_884920",
  });

  // Small delay for async subscriber reactions
  await new Promise((resolve) => setTimeout(resolve, 30));

  // SUB-ASSERTION A: Live Room Subscriber
  console.log("  [A] Checking Live Room Reaction:");
  const animEvent = capturedRoomEvents.find(
    (e) => (e.payload as any)?.action === "TRIGGER_ANIMATION"
  );
  assert(!!animEvent, "Live Room received visual animation trigger event");
  assert(
    (animEvent?.payload as any)?.animationType === "GRAND_DIAMOND_EXPLOSION",
    "Animation type is 'GRAND_DIAMOND_EXPLOSION'"
  );

  // SUB-ASSERTION B: Creator Revenue Display Subscriber
  console.log("  [B] Checking Creator Revenue Reaction:");
  const revEvent = capturedCreatorEvents.find(
    (e) => (e.payload as any)?.type === "REVENUE_TICKER_UPDATE"
  );
  assert(!!revEvent, "Creator Revenue HUD received real-time revenue ticker update");
  const creatorRevenue = CreatorRevenueSubscriber.getSessionRevenue(creatorId);
  assert(creatorRevenue.totalGrossCredits === 500, "Creator Gross Credits = 500");
  assert(creatorRevenue.totalNetCredits === 400, "Creator Net Credits = 400 (+80%)");
  assert(creatorRevenue.totalPlatformRakeCredits === 100, "Platform Rake = 100 (20%)");

  // SUB-ASSERTION C: Fan Wallet Subscriber
  console.log("  [C] Checking Fan Wallet Reaction:");
  const walletSyncEvent = capturedUserEvents.find(
    (e) => (e.payload as any)?.type === "WALLET_BALANCE_UPDATED"
  );
  assert(!!walletSyncEvent, "Fan received real-time wallet balance sync event on private channel");
  const sarahRemainingBalance = FanWalletSubscriber.getBalance(fanId);
  assert(
    sarahRemainingBalance === 2000,
    `Sarah balance updated from 2,500 to 2,000 credits (-500 deducted, actual: ${sarahRemainingBalance})`
  );

  // SUB-ASSERTION D: Leaderboard Subscriber
  console.log("  [D] Checking Leaderboard Reaction:");
  const lbEvent = capturedRoomEvents.find((e) => e.type === "LEADERBOARD_UPDATED");
  assert(!!lbEvent, "Leaderboard Subscriber recalculated rankings and emitted LEADERBOARD_UPDATED");
  const topList = (lbEvent?.payload as LeaderboardUpdatedPayload)?.topContributors || [];
  assert(topList.length > 0 && topList[0].userId === fanId, "Sarah is now #1 on the leaderboard");
  assert(topList[0].totalCredits === 500, "Leaderboard records 500 total credits for Sarah");

  // SUB-ASSERTION E: Goal Engine Subscriber
  console.log("  [E] Checking Goal Engine Reaction:");
  const goalProgEvent = capturedRoomEvents.find((e) => e.type === "GOAL_PROGRESS");
  assert(!!goalProgEvent, "Goal Engine emitted GOAL_PROGRESS event (100% reached)");
  const goalCompEvent = capturedRoomEvents.find((e) => e.type === "GOAL_COMPLETED");
  assert(!!goalCompEvent, "Goal Engine automatically triggered and emitted GOAL_COMPLETED milestone event");
  const completedPayload = goalCompEvent?.payload as GoalCompletedPayload;
  assert(
    completedPayload?.unlock?.title?.includes("VIP Celebration"),
    "Goal completion unlocked celebration reward"
  );

  // SUB-ASSERTION F: Progression Engine Subscriber
  console.log("  [F] Checking Relationship Progression Reaction:");
  const levelUpEvent = capturedUserEvents.find((e) => e.type === "RELATIONSHIP_LEVEL_UP");
  assert(!!levelUpEvent, "Progression Engine detected milestone and emitted RELATIONSHIP_LEVEL_UP");
  const progRecord = ProgressionSubscriber.getProgression(creatorId, fanId);
  assert(progRecord?.totalXp === 5000, "Sarah awarded 5,000 Relationship XP (500 creds x 10)");
  assert(progRecord?.level === 5, "Sarah leveled up to Level 5 ('Diamond Inner Circle')");

  // SUB-ASSERTION G: Analytics System Subscriber
  console.log("  [G] Checking Analytics Reaction:");
  const analytics = AnalyticsSubscriber.getAggregates();
  assert(analytics.totalEventsProcessed > 0, "Analytics wildcard listener processed domain events");
  assert(
    analytics.totalGrossCreditsMoved === 500,
    `Analytics tracked 500 gross credits moved (actual: ${analytics.totalGrossCreditsMoved})`
  );
  assert(analytics.activeLiveRooms.has(creatorId), "Analytics captured active room creator_maya");
  assert(analytics.activeUserSessions.has(fanId), "Analytics captured active user sarah_fan");

  unsubRoom();
  unsubUser();
  unsubCreator();

  // --------------------------------------------------------------------------
  // TEST 3: VERIFICATION OF ALL 14 STANDARDIZED DOMAIN EVENT TYPES
  // --------------------------------------------------------------------------
  console.log("\n--- 3. Standardized Event Vocabulary (All 14 Event Types) ---");

  const receivedTypes = new Set<string>();
  const testSub = eventBus.onAny((e) => {
    receivedTypes.add(e.type);
  });

  const eventTestDefinitions: Array<{ type: StandardEventType; payload: any }> = [
    {
      type: "LIVE_STARTED",
      payload: {
        livestreamId: "live_101",
        creatorId,
        creatorUserId: "usr_maya",
        creatorDisplayName: "Maya Live",
        creatorUsername: "maya",
        title: "Exclusive Acoustic Evening",
        streamMode: "PUBLIC_BROADCAST",
        startedAt: new Date().toISOString(),
      } as LiveStartedPayload,
    },
    {
      type: "LIVE_ENDED",
      payload: {
        livestreamId: "live_101",
        creatorId,
        title: "Exclusive Acoustic Evening",
        durationSeconds: 3600,
        peakViewers: 2150,
        totalUniqueViewers: 5400,
        totalCreditsEarned: 18500,
        totalGiftsReceived: 42,
        totalInteractionsCompleted: 15,
        endedAt: new Date().toISOString(),
      } as LiveEndedPayload,
    },
    {
      type: "USER_JOINED",
      payload: {
        creatorId,
        user: {
          userId: "usr_alex",
          username: "alex_fan",
          displayName: "Alex",
          role: "FAN",
        },
        viewerCount: 2001,
        joinedAt: new Date().toISOString(),
      } as UserJoinedPayload,
    },
    {
      type: "USER_LEFT",
      payload: {
        creatorId,
        userId: "usr_alex",
        viewerCount: 2000,
        leftAt: new Date().toISOString(),
      } as UserLeftPayload,
    },
    {
      type: "MESSAGE_CREATED",
      payload: {
        id: "msg_777",
        creatorId,
        senderId: fanId,
        senderName: "Sarah",
        senderRole: "VIP",
        text: "Love the new song preview! 🎵",
        createdAt: new Date().toISOString(),
      } as MessageCreatedPayload,
    },
    {
      type: "GIFT_SENT",
      payload: giftPayload,
    },
    {
      type: "INTERACTION_CREATED",
      payload: {
        interaction: {
          id: "int_spin_wheel",
          creatorProfileId: creatorId,
          type: "ACTIVITY",
          name: "Wheel of Fortunes",
          description: "Spin the live interactive prize wheel",
          price: 250,
          duration: 30,
          quantity: 10,
          remainingQuantity: 10,
          whoCanPurchase: "ALL",
          requiresAcceptance: false,
          entersQueue: true,
          isActive: true,
          icon: "🎡",
          createdAt: new Date().toISOString(),
        },
        creatorId,
        publishedAt: new Date().toISOString(),
      } as InteractionCreatedPayload,
    },
    {
      type: "INTERACTION_PURCHASED",
      payload: {
        queueId: "q_item_991",
        interactionId: "int_spin_wheel",
        creatorId,
        senderId: fanId,
        senderName: "Sarah",
        actionItem: {
          id: "int_spin_wheel",
          title: "Wheel of Fortunes",
          creditCost: 250,
          actionType: "WHEEL_SPIN",
        },
        status: "QUEUED",
        purchasedAt: new Date().toISOString(),
      } as InteractionPurchasedPayload,
    },
    {
      type: "INTERACTION_ACCEPTED",
      payload: {
        queueId: "q_item_991",
        interactionId: "int_spin_wheel",
        creatorId,
        buyerId: fanId,
        senderName: "Sarah",
        actionTitle: "Wheel of Fortunes",
        actionType: "WHEEL_SPIN",
        acceptedAt: new Date().toISOString(),
      } as InteractionAcceptedPayload,
    },
    {
      type: "GOAL_PROGRESS",
      payload: {
        goalId: "goal_maya",
        creatorId,
        title: "Unlock Midnight VIP Show",
        target: 500,
        progress: 500,
        percentage: 100,
        remaining: 0,
        deltaCredits: 500,
        isCompleted: true,
        updatedAt: new Date().toISOString(),
      } as GoalProgressPayload,
    },
    {
      type: "GOAL_COMPLETED",
      payload: {
        goalId: "goal_maya",
        creatorId,
        title: "Unlock Midnight VIP Show",
        target: 500,
        finalProgress: 500,
        contributorCount: 1,
        completedAt: new Date().toISOString(),
        unlock: {
          type: "SPECIAL_EXPERIENCE",
          title: "VIP Celebration Show",
          description: "Goal target of 500 credits reached",
        },
      } as GoalCompletedPayload,
    },
    {
      type: "RELATIONSHIP_LEVEL_UP",
      payload: {
        creatorId,
        fanUserId: fanId,
        fanDisplayName: "Sarah",
        previousLevel: 1,
        newLevel: 5,
        levelTitle: "Diamond Inner Circle",
        totalXp: 5000,
        xpGained: 5000,
        updatedAt: new Date().toISOString(),
      } as RelationshipLevelUpPayload,
    },
    {
      type: "LEADERBOARD_UPDATED",
      payload: {
        creatorId,
        topContributors: [
          {
            rank: 1,
            userId: fanId,
            username: "sarah_fan",
            displayName: "Sarah",
            totalCredits: 500,
            badge: "🥇 Top Tipper",
            isTopTipper: true,
          },
        ],
        totalRoomContributors: 1,
        updatedAt: new Date().toISOString(),
      } as LeaderboardUpdatedPayload,
    },
    {
      type: "CONTENT_PURCHASED",
      payload: {
        contentId: "ppv_video_44",
        creatorId,
        buyerUserId: fanId,
        buyerDisplayName: "Sarah",
        title: "Behind The Scenes 4K Documentary",
        contentType: "VIDEO",
        priceCredits: 300,
        purchasedAt: new Date().toISOString(),
      } as ContentPurchasedPayload,
    },
  ];

  for (const def of eventTestDefinitions) {
    publishAuthoritativeEvent(def.type, def.payload);
  }

  await new Promise((resolve) => setTimeout(resolve, 20));

  for (const def of eventTestDefinitions) {
    assert(receivedTypes.has(def.type), `Standardized Event Type '${def.type}' successfully published and received`);
  }

  testSub();

  // --------------------------------------------------------------------------
  // TEST 4: ERROR ISOLATION & FAULT TOLERANCE
  // --------------------------------------------------------------------------
  console.log("\n--- 4. Error Isolation & Subscriber Resilience ---");
  console.log("  Scenario: A buggy subscriber throws an unhandled exception.");
  console.log("  Expected: Other subscribers still execute smoothly without crashing.");

  let healthySubscriberExecuted = false;

  // Faulty subscriber
  const faultyUnsub = eventBus.on("MESSAGE_CREATED", () => {
    throw new Error("Simulated subscriber crash in buggy third-party handler!");
  });

  // Healthy subscriber
  const healthyUnsub = eventBus.on("MESSAGE_CREATED", () => {
    healthySubscriberExecuted = true;
  });

  // Publish event
  publishAuthoritativeEvent("MESSAGE_CREATED", {
    id: "msg_err_test",
    creatorId,
    senderId: "usr_test",
    senderName: "Tester",
    senderRole: "FAN",
    text: "Testing resilience",
    createdAt: new Date().toISOString(),
  });

  assert(healthySubscriberExecuted, "Healthy subscriber executed normally despite companion subscriber throwing");

  faultyUnsub();
  healthyUnsub();

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log("\n====================================================================");
  console.log(`🎯 VERIFICATION COMPLETE: ${passedCount} Passed, ${failedCount} Failed`);
  console.log("====================================================================");

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runRealtimeEventArchitectureVerification().catch((err) => {
  console.error("Verification suite encountered unexpected error:", err);
  process.exit(1);
});
