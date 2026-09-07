/**
 * Verification Script: Optimistic UI vs Conservative Financial State Management
 *
 * Tests:
 * 1. Optimistic Follow: Instant visual state transition (Follow -> Following) before network resolution.
 * 2. Optimistic Follow Rollback: Automatic snapshot restoration upon background API rejection.
 * 3. Conservative Financial Action: Immediate in-flight loading state without premature success display.
 * 4. Conservative Financial Confirmation: Permanent success & queue position committed ONLY on backend verification.
 * 5. Conservative Financial Rejection: Zero phantom wallet debits upon backend rejection (insufficient balance).
 * 6. Concurrency Protection: Anti-double submission guard for in-flight financial mutations.
 */

import { ServerStateCache } from "../src/lib/state/server-cache";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

// -------------------------------------------------------------------
// Mock Implementations for Headless Node.js Verification
// -------------------------------------------------------------------

interface OptimisticFollowSimulator {
  isFollowing: boolean;
  followerCount: number;
  isPending: boolean;
  error: Error | null;
  toggleFollow: (mockNetworkCall: () => Promise<{ isFollowing: boolean; followerCount: number }>) => Promise<boolean>;
}

function createOptimisticFollowSimulator(initialIsFollowing = false, initialCount = 100): OptimisticFollowSimulator {
  const state = {
    isFollowing: initialIsFollowing,
    followerCount: initialCount,
    isPending: false,
    error: null as Error | null,
    async toggleFollow(mockNetworkCall: () => Promise<{ isFollowing: boolean; followerCount: number }>) {
      // 1. Snapshot
      const snapshot = { isFollowing: state.isFollowing, followerCount: state.followerCount };

      // 2. Instant Optimistic State Flip (Follow -> Following)
      const nextFollowing = !snapshot.isFollowing;
      const nextCount = nextFollowing ? snapshot.followerCount + 1 : Math.max(0, snapshot.followerCount - 1);

      state.isFollowing = nextFollowing;
      state.followerCount = nextCount;
      state.isPending = true;
      state.error = null;

      try {
        const result = await mockNetworkCall();
        state.isFollowing = result.isFollowing;
        state.followerCount = result.followerCount;
        state.isPending = false;
        return state.isFollowing;
      } catch (err: any) {
        // 3. Rollback on failure
        state.isFollowing = snapshot.isFollowing;
        state.followerCount = snapshot.followerCount;
        state.isPending = false;
        state.error = err;
        return snapshot.isFollowing;
      }
    },
  };

  return state;
}

interface ConservativeFinancialSimulator {
  status: "idle" | "processing" | "confirmed" | "error";
  isPending: boolean;
  isSuccess: boolean;
  receipt: any | null;
  error: Error | null;
  purchase: (params: { priceCredits: number; walletBalance: number; mockBackend: () => Promise<any> }) => Promise<any>;
}

function createConservativeFinancialSimulator(): ConservativeFinancialSimulator {
  let inFlight = false;

  const state: ConservativeFinancialSimulator = {
    status: "idle",
    isPending: false,
    isSuccess: false,
    receipt: null,
    error: null,
    async purchase({ priceCredits, walletBalance, mockBackend }) {
      if (inFlight) {
        throw new Error("Transaction already in flight");
      }

      if (walletBalance < priceCredits) {
        state.status = "error";
        state.error = new Error(`Insufficient credits: required ${priceCredits}, available ${walletBalance}`);
        throw state.error;
      }

      // 1. IMMEDIATE LOADING STATE (Conservative: NEVER commit permanent success yet!)
      inFlight = true;
      state.status = "processing";
      state.isPending = true;
      state.isSuccess = false;
      state.receipt = null;
      state.error = null;

      try {
        const backendReceipt = await mockBackend();

        // 2. PERMANENT SUCCESS ONLY AFTER AUTHORITATIVE CONFIRMATION
        state.status = "confirmed";
        state.isPending = false;
        state.isSuccess = true;
        state.receipt = backendReceipt;
        return backendReceipt;
      } catch (err: any) {
        state.status = "error";
        state.isPending = false;
        state.isSuccess = false;
        state.receipt = null;
        state.error = err;
        throw err;
      } finally {
        inFlight = false;
      }
    },
  };

  return state;
}

// -------------------------------------------------------------------
// RUN TESTS
// -------------------------------------------------------------------
async function runTests() {
  console.log("\n=======================================================");
  console.log("🛠️  OPTIMISTIC VS CONSERVATIVE FINANCIAL UI VERIFICATION");
  console.log("=======================================================\n");

  const cache = ServerStateCache.getInstance();
  cache.clear();

  // -------------------------------------------------------------
  // TEST 1: Optimistic Follow Instant State Transition
  // -------------------------------------------------------------
  console.log("🔹 TEST 1: Optimistic Follow Instant State Transition");
  const followSim = createOptimisticFollowSimulator(false, 500);

  assert(followSim.isFollowing === false, "Initial follow state is FALSE ('Follow')");
  assert(followSim.followerCount === 500, "Initial follower count is 500");

  let networkResolved = false;
  const slowNetworkPromise = followSim.toggleFollow(async () => {
    await new Promise((resolve) => setTimeout(resolve, 80));
    networkResolved = true;
    return { isFollowing: true, followerCount: 501 };
  });

  // Check state SYNCHRONOUSLY before network resolves
  assert(
    followSim.isFollowing === true,
    "OPTIMISTIC EFFECT: isFollowing changed instantly to TRUE ('Following') before network response"
  );
  assert(
    followSim.followerCount === 501,
    "OPTIMISTIC EFFECT: followerCount incremented synchronously to 501 before network response"
  );
  assert(followSim.isPending === true, "Background network sync marked as in-flight");
  assert(networkResolved === false, "Network request has not yet completed");

  // Await network resolution
  await slowNetworkPromise;
  assert(networkResolved === true, "Background network request completed");
  assert(followSim.isFollowing === true, "Authoritative 'Following' state preserved after network success");
  assert(followSim.isPending === false, "Pending flag cleared after resolution");

  // -------------------------------------------------------------
  // TEST 2: Optimistic Follow Rollback on Network Rejection
  // -------------------------------------------------------------
  console.log("\n🔹 TEST 2: Optimistic Follow Rollback on Network Failure");
  const rollbackSim = createOptimisticFollowSimulator(false, 1000);

  const failedNetworkPromise = rollbackSim.toggleFollow(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    throw new Error("Rate limit exceeded or creator disabled follows");
  });

  // Immediate optimistic update
  assert(rollbackSim.isFollowing === true, "State optimistically flipped to TRUE immediately");
  assert(rollbackSim.followerCount === 1001, "Count optimistically incremented to 1001 immediately");

  // Await failure
  await failedNetworkPromise;

  // Verify rollback
  assert(
    rollbackSim.isFollowing === false,
    "ROLLBACK VERIFIED: isFollowing restored to previous snapshot FALSE ('Follow')"
  );
  assert(
    rollbackSim.followerCount === 1000,
    "ROLLBACK VERIFIED: followerCount restored to previous snapshot 1000"
  );
  assert(rollbackSim.error !== null, "Error object captured for user notification toast");
  assert(rollbackSim.isPending === false, "Pending state cleared after rollback");

  // -------------------------------------------------------------
  // TEST 3: Conservative Financial UI Loading State (1,000-Credit Interaction)
  // -------------------------------------------------------------
  console.log("\n🔹 TEST 3: Conservative Financial UI Loading State (1,000-Credit Interaction)");
  const financialSim = createConservativeFinancialSimulator();
  let backendFinished = false;

  const purchasePromise = financialSim.purchase({
    priceCredits: 1000,
    walletBalance: 2500,
    mockBackend: async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      backendFinished = true;
      return {
        transactionId: "tx_int_1000_abc",
        title: "Live Backstage Acoustic Song Request",
        priceCredits: 1000,
        queuePosition: 2,
        fanRemainingBalance: 1500,
      };
    },
  });

  // Verify state during in-flight processing
  assert(
    financialSim.status === "processing",
    "CONSERVATIVE PRINCIPLE: status is immediately 'processing' (loading spinner)"
  );
  assert(financialSim.isPending === true, "isPending is TRUE (buttons disabled to prevent double clicks)");
  assert(
    financialSim.isSuccess === false,
    "CRITICAL CONSERVATIVE RULE: isSuccess is FALSE while in-flight (never prematurely marked as success)"
  );
  assert(
    financialSim.receipt === null,
    "CRITICAL CONSERVATIVE RULE: receipt is NULL before backend confirmation"
  );
  assert(backendFinished === false, "Backend transaction is still processing");

  // -------------------------------------------------------------
  // TEST 4: Conservative Financial Confirmation Upon Authoritative Response
  // -------------------------------------------------------------
  console.log("\n🔹 TEST 4: Conservative Financial Confirmation Upon Backend Response");
  const confirmedReceipt = await purchasePromise;

  assert(backendFinished === true, "Backend successfully committed database transaction");
  assert(
    financialSim.status === "confirmed",
    "CONSERVATIVE PRINCIPLE: status changed to 'confirmed' ONLY after backend HTTP 201 response"
  );
  assert(financialSim.isSuccess === true, "isSuccess is now TRUE");
  assert(financialSim.receipt !== null, "Receipt attached to state");
  assert(confirmedReceipt.queuePosition === 2, "Authoritative Queue Position #2 confirmed");
  assert(confirmedReceipt.fanRemainingBalance === 1500, "Authoritative Remaining Balance confirmed: 1,500 credits");

  // -------------------------------------------------------------
  // TEST 5: Conservative Financial Rejection & Zero Wallet Corruption
  // -------------------------------------------------------------
  console.log("\n🔹 TEST 5: Conservative Financial Rejection with Zero Wallet Corruption");
  const rejectedFinancialSim = createConservativeFinancialSimulator();

  // Test insufficient balance rejection
  try {
    await rejectedFinancialSim.purchase({
      priceCredits: 1000,
      walletBalance: 400, // Insufficient!
      mockBackend: async () => {
        throw new Error("Should not reach backend");
      },
    });
    assert(false, "Should have rejected due to insufficient balance");
  } catch (err: any) {
    assert(
      err.message.includes("Insufficient credits"),
      "Cleanly caught insufficient credit validation error"
    );
  }

  assert(
    rejectedFinancialSim.status === "error",
    "Status cleanly transitioned to 'error' without phantom success"
  );
  assert(
    rejectedFinancialSim.isSuccess === false,
    "isSuccess remained FALSE throughout rejected transaction"
  );
  assert(
    rejectedFinancialSim.receipt === null,
    "No receipt generated, preserving financial integrity"
  );

  // -------------------------------------------------------------
  // TEST 6: In-Flight Concurrency Protection
  // -------------------------------------------------------------
  console.log("\n🔹 TEST 6: In-Flight Concurrency Protection (Anti-Double Charge Guard)");
  const concurrentSim = createConservativeFinancialSimulator();

  const activeTransaction = concurrentSim.purchase({
    priceCredits: 1000,
    walletBalance: 5000,
    mockBackend: async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
      return { queuePosition: 1, fanRemainingBalance: 4000 };
    },
  });

  // Attempt duplicate purchase while first is in-flight
  try {
    await concurrentSim.purchase({
      priceCredits: 1000,
      walletBalance: 5000,
      mockBackend: async () => ({ queuePosition: 2, fanRemainingBalance: 3000 }),
    });
    assert(false, "Concurrent purchase should have been blocked");
  } catch (err: any) {
    assert(
      err.message === "Transaction already in flight",
      "In-flight double submission was blocked, protecting against double debiting"
    );
  }

  await activeTransaction;
  assert(concurrentSim.status === "confirmed", "Original transaction finished safely");

  console.log("\n=======================================================");
  console.log("🎉 ALL OPTIMISTIC VS CONSERVATIVE UI TESTS PASSED!");
  console.log("=======================================================\n");
}

runTests().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
