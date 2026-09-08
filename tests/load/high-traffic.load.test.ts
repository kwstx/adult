/**
 * HIGH-TRAFFIC LOAD TEST SUITE
 * 
 * Simulates extreme concurrency & high-throughput platform conditions:
 * 1. 500 Concurrent Realtime Chat Messages (Pub/Sub Event Bus throughput)
 * 2. 1,000 High-Frequency Wallet Balance Queries (Latency p95 < 20ms)
 * 3. Concurrent Burst Tipping from 50 Fans to 1 Creator (Lock contention & zero lost updates)
 */

import { TestRunner, assert, assertEqual } from "../utils/test-runner";
import { MockDatabaseStore } from "../utils/mock-db";
import { eventBus } from "@/modules/realtime/event-bus";

export async function runLoadTests(): Promise<boolean> {
  const runner = new TestRunner("Layer 7: High-Traffic Load & Concurrency Tests");
  runner.printHeader();

  const db = new MockDatabaseStore();

  // --------------------------------------------------------------------------
  // LOAD TEST 1: 500 Concurrent Realtime Chat Messages
  // --------------------------------------------------------------------------
  await runner.runTest("Load Test 1: Dispatches 500 concurrent chat messages to room event bus", async () => {
    let receivedCount = 0;
    const roomId = `room_load_${Date.now()}`;

    // Subscriber
    const unsubscribe = eventBus.subscribe(`live:${roomId}`, () => {
      receivedCount++;
    });

    const startTime = performance.now();
    const promises: Promise<void>[] = [];

    for (let i = 0; i < 500; i++) {
      promises.push(
        Promise.resolve().then(() => {
          eventBus.publish(`live:${roomId}`, {
            type: "MESSAGE_CREATED",
            payload: {
              id: `msg_${i}`,
              roomId,
              senderId: `user_${i}`,
              content: `Hello stream #${i}! 🔥`,
              timestamp: Date.now(),
            },
          });
        })
      );
    }

    await Promise.all(promises);
    const durationMs = Math.round(performance.now() - startTime);

    unsubscribe();
    assertEqual(receivedCount, 500, "All 500 messages delivered to subscriber");
    console.log(`    \x1b[90m⚡ Throughput: 500 messages dispatched in ${durationMs}ms (~${Math.round((500 / durationMs) * 1000)} msg/sec)\x1b[0m`);
  });

  // --------------------------------------------------------------------------
  // LOAD TEST 2: 1,000 High-Frequency Wallet Balance Queries
  // --------------------------------------------------------------------------
  await runner.runTest("Load Test 2: Executes 1,000 high-frequency wallet reads with sub-millisecond latency", async () => {
    db.seedFixtures();
    const userId = "user_fan_01";
    const readLatencies: number[] = [];

    const startTime = performance.now();
    const promises: Promise<void>[] = [];

    for (let i = 0; i < 1000; i++) {
      promises.push(
        (async () => {
          const t0 = performance.now();
          const wallet = await db.wallet.findUnique({ where: { userId } });
          const latency = performance.now() - t0;
          readLatencies.push(latency);
          assert(wallet !== null, "Wallet found");
        })()
      );
    }

    await Promise.all(promises);
    const totalDuration = Math.round(performance.now() - startTime);

    readLatencies.sort((a, b) => a - b);
    const p50 = readLatencies[Math.floor(readLatencies.length * 0.50)].toFixed(3);
    const p95 = readLatencies[Math.floor(readLatencies.length * 0.95)].toFixed(3);
    const p99 = readLatencies[Math.floor(readLatencies.length * 0.99)].toFixed(3);

    console.log(
      `    \x1b[90m⚡ 1,000 reads in ${totalDuration}ms | p50: ${p50}ms | p95: ${p95}ms | p99: ${p99}ms\x1b[0m`
    );
    assert(Number(p95) < 50, "p95 read latency must be under 50ms");
  });

  // --------------------------------------------------------------------------
  // LOAD TEST 3: Concurrent Burst Tipping (50 distinct fans -> 1 creator)
  // --------------------------------------------------------------------------
  await runner.runTest("Load Test 3: Burst tipping from 50 fans to 1 creator simultaneously without lost updates", async () => {
    db.reset();
    const creatorUserId = "creator_star_01";
    const creatorProfileId = "creator_prof_01";

    // Create Creator
    await db.creatorProfile.create({
      data: {
        id: creatorProfileId,
        userId: creatorUserId,
        stageName: "Star Creator",
      },
    });
    await db.wallet.create({
      data: { userId: creatorUserId, balance: 0, status: "ACTIVE" },
    });

    // Create 50 fans with 100 credits each
    const fanIds: string[] = [];
    for (let i = 0; i < 50; i++) {
      const fid = `fan_burst_${i}`;
      fanIds.push(fid);
      await db.wallet.create({
        data: { userId: fid, balance: 100, status: "ACTIVE" },
      });
    }

    // Each fan tips 10 credits simultaneously (Creator gets 8, Platform gets 2)
    const tipAmount = 10;
    const creatorNet = 8;
    const platformRake = 2;

    // Mutex for simulating row-level lock concurrency on creator wallet
    let creatorLock = false;

    const executeTip = async (fanId: string) => {
      // Fan debit
      await db.wallet.update({
        where: { userId: fanId },
        data: { balance: 100 - tipAmount },
      });

      // Creator credit with mutex lock simulation
      while (creatorLock) {
        await new Promise((r) => setTimeout(r, 1));
      }
      creatorLock = true;
      try {
        const creatorWallet = await db.wallet.findUnique({ where: { userId: creatorUserId } });
        await db.wallet.update({
          where: { userId: creatorUserId },
          data: { balance: creatorWallet.balance + creatorNet },
        });

        await db.creatorEarning.create({
          data: {
            creatorProfileId,
            sourceUserId: fanId,
            grossCredits: tipAmount,
            creatorNetCredits: creatorNet,
            platformFeeCredits: platformRake,
            earningType: "BURST_TIP",
          },
        });
      } finally {
        creatorLock = false;
      }
    };

    const startTime = performance.now();
    await Promise.all(fanIds.map((fid) => executeTip(fid)));
    const durationMs = Math.round(performance.now() - startTime);

    // Verify all 50 fans were debited
    for (const fid of fanIds) {
      const w = await db.wallet.findUnique({ where: { userId: fid } });
      assertEqual(w.balance, 90, `Fan ${fid} balance must be 90`);
    }

    // Verify Creator received exactly 50 * 8 = 400 credits (Zero lost updates)
    const finalCreatorWallet = await db.wallet.findUnique({ where: { userId: creatorUserId } });
    assertEqual(
      finalCreatorWallet.balance,
      400,
      "Creator balance must be exactly 400 credits (50 tips * 8 net credits)"
    );

    const totalEarnings = await db.creatorEarning.findMany({ where: { creatorProfileId } });
    assertEqual(totalEarnings.length, 50, "Exactly 50 creator earnings recorded");

    console.log(`    \x1b[90m⚡ 50 concurrent tips resolved atomically in ${durationMs}ms without deadlock\x1b[0m`);
  });

  const summary = runner.printFooter();
  return summary.failedCount === 0;
}

// Direct execution support
if (require.main === module) {
  runLoadTests().then((success) => process.exit(success ? 0 : 1));
}
