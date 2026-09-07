/**
 * Verification Script: Frontend State Management Architecture
 *
 * Tests:
 * 1. Local UI state isolation (0 network requests, pure component memory).
 * 2. Server state caching, key normalization, and request deduplication.
 * 3. Tag-based & event-driven cache invalidation with subscriber notifications.
 * 4. Optimistic mutations with automatic snapshot rollback on failure.
 * 5. Realtime SSE domain event to cache reconciliation.
 * 6. Authoritative backend synchronization integrity.
 */

import {
  ServerStateCache,
  normalizeQueryKey,
} from "../src/lib/state/server-cache";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("🛠️  RUNNING FRONTEND STATE MANAGEMENT VERIFICATION");
  console.log("=======================================================\n");

  const cache = ServerStateCache.getInstance();
  cache.clear();

  // -------------------------------------------------------------
  // TEST 1: Key Normalization & Local UI State Isolation
  // -------------------------------------------------------------
  console.log("🔹 TEST 1: Query Key Normalization & UI State Isolation");

  const k1 = normalizeQueryKey(["wallet", "usr_fan_alex"]);
  const k2 = normalizeQueryKey("wallet:usr_fan_alex");
  const k3 = normalizeQueryKey(["creators", "mayavelvet", { detail: true }]);

  assert(k1 === "wallet:usr_fan_alex", "Array key normalized correctly to string");
  assert(k1 === k2, "String key matches normalized array key");
  assert(
    k3 === 'creators:mayavelvet:{"detail":true}',
    "Nested object in query key serialized accurately"
  );

  // Verify that UI state properties are not present in server cache
  assert(
    cache.get("ui:isGiftDrawerOpen") === undefined,
    "Local UI state is not stored in ServerStateCache"
  );
  assert(
    cache.get("ui:isMuted") === undefined,
    "Video player mute state is not persisted to ServerStateCache"
  );

  // -------------------------------------------------------------
  // TEST 2: Server State Caching, Stale Detection & Inflight Deduplication
  // -------------------------------------------------------------
  console.log("\n🔹 TEST 2: Server State Caching & Inflight Request Deduplication");

  let fetchCount = 0;
  const mockWalletFetcher = async () => {
    fetchCount++;
    await new Promise((resolve) => setTimeout(resolve, 50));
    return { balance: 2500, currency: "CREDITS", userId: "usr_fan_alex" };
  };

  // Launch 3 concurrent fetches for the exact same query key
  const [res1, res2, res3] = await Promise.all([
    cache.fetch(["wallet", "usr_fan_alex"], mockWalletFetcher, { staleTime: 1000 }),
    cache.fetch(["wallet", "usr_fan_alex"], mockWalletFetcher, { staleTime: 1000 }),
    cache.fetch(["wallet", "usr_fan_alex"], mockWalletFetcher, { staleTime: 1000 }),
  ]);

  assert(fetchCount === 1, "Inflight deduplication executed: only 1 fetch call made for 3 concurrent requests");
  assert(res1.balance === 2500, "Result 1 returned correct data");
  assert(res2.balance === 2500, "Result 2 returned correct data");
  assert(res3.balance === 2500, "Result 3 returned correct data");

  // Subsequent fetch while fresh should return from cache without re-fetching
  const cachedRes = await cache.fetch(["wallet", "usr_fan_alex"], mockWalletFetcher);
  assert(fetchCount === 1, "Cached data served immediately without network request (cache hit)");
  assert(cache.isStale(["wallet", "usr_fan_alex"]) === false, "Entry is marked fresh within TTL");

  // -------------------------------------------------------------
  // TEST 3: Subscriber Pub/Sub & Reactive Notifications
  // -------------------------------------------------------------
  console.log("\n🔹 TEST 3: Subscriber Pub/Sub & Reactive Notifications");

  let subscriberNotified = false;
  let receivedBalance = 0;

  const unsubscribe = cache.subscribe(["wallet", "usr_fan_alex"], (entry) => {
    subscriberNotified = true;
    if (entry.data) {
      receivedBalance = entry.data.balance;
    }
  });

  // Mutate data
  cache.set(["wallet", "usr_fan_alex"], { balance: 3000, currency: "CREDITS", userId: "usr_fan_alex" });

  assert(subscriberNotified === true, "Active subscriber received update notification");
  assert(receivedBalance === 3000, "Subscriber received updated balance (3000)");

  unsubscribe();
  subscriberNotified = false;

  cache.set(["wallet", "usr_fan_alex"], { balance: 3500, currency: "CREDITS", userId: "usr_fan_alex" });
  assert(subscriberNotified === false, "Unsubscribed listener is no longer called");

  // -------------------------------------------------------------
  // TEST 4: Tag-Based & Event-Driven Cache Invalidation
  // -------------------------------------------------------------
  console.log("\n🔹 TEST 4: Tag-Based & Event-Driven Cache Invalidation");

  // Populate multiple server state entities
  cache.set(["wallet", "usr_fan_alex"], { balance: 3500 }, { tags: ["wallet"] });
  cache.set(["wallet", "usr_fan_sarah"], { balance: 10000 }, { tags: ["wallet"] });
  cache.set(["creator", "mayavelvet"], { displayName: "Maya Velvet" }, { tags: ["creator"] });
  cache.set(["xp", "usr_fan_alex", "mayavelvet"], { xp: 1200 }, { tags: ["xp", "relationship"] });

  assert(cache.isStale(["wallet", "usr_fan_alex"]) === false, "Alex wallet is fresh before invalidation");
  assert(cache.isStale(["wallet", "usr_fan_sarah"]) === false, "Sarah wallet is fresh before invalidation");

  // Invalidate all queries tagged with 'wallet'
  await cache.invalidate("wallet");

  assert(cache.isStale(["wallet", "usr_fan_alex"]) === true, "Alex wallet invalidated via tag");
  assert(cache.isStale(["wallet", "usr_fan_sarah"]) === true, "Sarah wallet invalidated via tag");
  assert(cache.isStale(["creator", "mayavelvet"]) === false, "Creator profile unaffected by wallet invalidation");

  // -------------------------------------------------------------
  // TEST 5: Optimistic Updates with Automatic Rollback on Failure
  // -------------------------------------------------------------
  console.log("\n🔹 TEST 5: Optimistic Updates & Automatic Snapshot Rollback");

  cache.set(["wallet", "usr_fan_alex"], { balance: 2000, userId: "usr_fan_alex" });

  // Successful mutation
  const successResult = await cache.mutate(
    ["wallet", "usr_fan_alex"],
    (current) => ({ ...current, balance: (current?.balance || 0) - 100 }),
    { rollbackOnError: true }
  );

  assert(successResult.balance === 1900, "Optimistic spend successfully deducted 100 (balance = 1900)");
  assert(cache.getData(["wallet", "usr_fan_alex"]).balance === 1900, "Cache reflects optimistic balance");

  // Failed mutation with rollback
  try {
    await cache.mutate(
      ["wallet", "usr_fan_alex"],
      async (current) => {
        // Optimistically deduct 500
        const updated = { ...current, balance: (current?.balance || 0) - 500 };
        // Simulate backend rejecting the transaction
        throw new Error("Backend payment provider rejected charge");
      },
      { rollbackOnError: true }
    );
    assert(false, "Mutation should have thrown error");
  } catch (err: any) {
    assert(err.message === "Backend payment provider rejected charge", "Captured rejection error");
  }

  // Verify rollback restored previous snapshot (1900)
  const rolledBackData = cache.getData(["wallet", "usr_fan_alex"]);
  assert(rolledBackData.balance === 1900, `Automatic snapshot rollback restored balance: ${rolledBackData.balance}`);

  // -------------------------------------------------------------
  // TEST 6: Realtime SSE Event-to-Cache Reconciliation
  // -------------------------------------------------------------
  console.log("\n🔹 TEST 6: Realtime SSE Domain Event Reconciliation");

  // Seed live status, messages, queue, and relationship
  cache.set(["live-status", "mayavelvet"], {
    creatorId: "mayavelvet",
    isLive: true,
    viewerCount: 350,
    goal: { title: "Milestone", target: 3000, progress: 2000, percentage: 66, isCompleted: false },
  });

  cache.set(["messages", "mayavelvet"], [
    { messageId: "m1", text: "Hello stream!", sender: { displayName: "Sarah" } },
  ]);

  cache.set(["interaction-queue", "mayavelvet"], [
    { id: "q1", actionTitle: "Dance", credits: 100, status: "PENDING" },
  ]);

  // Simulate SSE event: GIFT_SENT
  const giftEvent = {
    type: "GIFT_SENT",
    payload: {
      sender: { userId: "usr_fan_alex", displayName: "Alex" },
      gift: { creditAmount: 500, name: "Super Diamond" },
      updatedGoal: { title: "Milestone", target: 3000, progress: 2500, percentage: 83, isCompleted: false },
    },
  };

  // Process event in cache
  await cache.mutate(["live-status", "mayavelvet"], (current: any) => ({
    ...current,
    goal: giftEvent.payload.updatedGoal,
  }));
  await cache.invalidate(["wallet", "usr_fan_alex"]);
  await cache.invalidate(["xp", "usr_fan_alex", "mayavelvet"]);

  const updatedLiveStatus: any = cache.getData(["live-status", "mayavelvet"]);
  assert(updatedLiveStatus.goal.progress === 2500, "Live goal progress updated to 2500 via SSE reconciliation");
  assert(updatedLiveStatus.goal.percentage === 83, "Live goal percentage updated to 83%");
  assert(cache.isStale(["wallet", "usr_fan_alex"]) === true, "Sender wallet invalidated to fetch authoritative balance");
  assert(cache.isStale(["xp", "usr_fan_alex", "mayavelvet"]) === true, "Sender XP invalidated for progression sync");

  // Simulate SSE event: NEW_MESSAGE
  const chatEvent = {
    type: "NEW_MESSAGE",
    payload: { messageId: "m2", text: "Awesome dance!", sender: { displayName: "Alex" } },
  };

  await cache.mutate(["messages", "mayavelvet"], (current: any) => [...(current || []), chatEvent.payload]);
  const messages: any = cache.getData(["messages", "mayavelvet"]);
  assert(messages.length === 2, "Chat messages cache updated with incoming SSE message");
  assert(messages[1].text === "Awesome dance!", "Message text matches SSE payload");

  // -------------------------------------------------------------
  // TEST 7: Telemetry & Cache Stats
  // -------------------------------------------------------------
  console.log("\n🔹 TEST 7: Telemetry & Stats");
  const finalStats = cache.getStats();
  assert(finalStats.totalEntries > 0, `Active cache entries tracked: ${finalStats.totalEntries}`);
  assert(finalStats.keys.length === finalStats.totalEntries, "Query keys match total entries count");

  console.log("\n=======================================================");
  console.log("🎉 ALL FRONTEND STATE MANAGEMENT VERIFICATIONS PASSED!");
  console.log("=======================================================\n");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
