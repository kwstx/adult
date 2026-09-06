import {
  InteractionPurchaseService,
  InteractionNotFoundError,
  InteractionInactiveError,
  PriceMismatchError,
  IneligibleFanError,
  InsufficientBalanceError,
  CapacityExceededError,
  FanBlockedError,
} from "../src/modules/interaction/interaction-purchase.service";
import { InteractionService } from "../src/modules/interaction/interaction.service";
import { InteractionQueueService } from "../src/modules/realtime/interaction-queue.service";

async function runVerification() {
  console.log("===============================================================");
  console.log("🚀 STARTING INTERACTION PURCHASING ENGINE VERIFICATION (8 GATES)");
  console.log("===============================================================\n");

  const creatorId = "creator_maya";
  let passedCount = 0;
  let totalCount = 9;

  // --------------------------------------------------------------------------
  // GATE 1: THE INTERACTION EXISTS
  // --------------------------------------------------------------------------
  try {
    console.log("▶ Testing Gate 1: Non-existent interaction...");
    await InteractionPurchaseService.purchaseInteraction({
      creatorId,
      interactionId: "non_existent_id_999",
      expectedPrice: 100,
      fanUserId: "fan_alex",
    });
    console.error("❌ Gate 1 FAILED: Expected InteractionNotFoundError");
  } catch (err: any) {
    if (err instanceof InteractionNotFoundError) {
      console.log("✅ Gate 1 PASSED: Correctly threw InteractionNotFoundError (404)");
      passedCount++;
    } else {
      console.error("❌ Gate 1 FAILED: Unexpected error type", err);
    }
  }

  // --------------------------------------------------------------------------
  // GATE 2: THE INTERACTION IS ACTIVE
  // --------------------------------------------------------------------------
  try {
    console.log("\n▶ Testing Gate 2: Inactive / paused interaction...");
    // Temporarily toggle active
    InteractionService.toggleInteractionActive(creatorId, "int_seed_1");
    await InteractionPurchaseService.purchaseInteraction({
      creatorId,
      interactionId: "int_seed_1",
      expectedPrice: 100,
      fanUserId: "fan_alex",
    });
    console.error("❌ Gate 2 FAILED: Expected InteractionInactiveError");
  } catch (err: any) {
    if (err instanceof InteractionInactiveError) {
      console.log("✅ Gate 2 PASSED: Correctly threw InteractionInactiveError (400)");
      passedCount++;
    } else {
      console.error("❌ Gate 2 FAILED: Unexpected error type", err);
    }
  } finally {
    // Restore active state
    InteractionService.toggleInteractionActive(creatorId, "int_seed_1");
  }

  // --------------------------------------------------------------------------
  // GATE 3: THE PRICE IS STILL 100 (PRICE INTEGRITY)
  // --------------------------------------------------------------------------
  try {
    console.log("\n▶ Testing Gate 3: Price mismatch (tampered client price)...");
    await InteractionPurchaseService.purchaseInteraction({
      creatorId,
      interactionId: "int_seed_ama", // price is 100
      expectedPrice: 50, // client expected 50
      fanUserId: "fan_alex",
    });
    console.error("❌ Gate 3 FAILED: Expected PriceMismatchError");
  } catch (err: any) {
    if (err instanceof PriceMismatchError) {
      console.log(`✅ Gate 3 PASSED: Correctly threw PriceMismatchError (409): ${err.message}`);
      passedCount++;
    } else {
      console.error("❌ Gate 3 FAILED: Unexpected error type", err);
    }
  }

  // --------------------------------------------------------------------------
  // GATE 4: THE FAN IS ELIGIBLE
  // --------------------------------------------------------------------------
  try {
    console.log("\n▶ Testing Gate 4: Fan eligibility (subscribers-only interaction)...");
    await InteractionPurchaseService.purchaseInteraction({
      creatorId,
      interactionId: "int_seed_5", // SUBSCRIBERS_ONLY
      expectedPrice: 1500,
      fanUserId: "fan_unsub",
    });
    console.error("❌ Gate 4 FAILED: Expected IneligibleFanError");
  } catch (err: any) {
    if (err instanceof IneligibleFanError) {
      console.log(`✅ Gate 4 PASSED: Correctly threw IneligibleFanError (403): ${err.message}`);
      passedCount++;
    } else {
      console.error("❌ Gate 4 FAILED: Unexpected error type", err);
    }
  }

  // --------------------------------------------------------------------------
  // GATE 5: THE FAN HAS SUFFICIENT BALANCE
  // --------------------------------------------------------------------------
  try {
    console.log("\n▶ Testing Gate 5: Insufficient balance...");
    InteractionPurchaseService.setMockWalletBalance("fan_broke", 25);
    await InteractionPurchaseService.purchaseInteraction({
      creatorId,
      interactionId: "int_seed_ama", // price is 100
      expectedPrice: 100,
      fanUserId: "fan_broke",
    });
    console.error("❌ Gate 5 FAILED: Expected InsufficientBalanceError");
  } catch (err: any) {
    if (err instanceof InsufficientBalanceError) {
      console.log(`✅ Gate 5 PASSED: Correctly threw InsufficientBalanceError (402): ${err.message}`);
      passedCount++;
    } else {
      console.error("❌ Gate 5 FAILED: Unexpected error type", err);
    }
  }

  // --------------------------------------------------------------------------
  // GATE 6: THE INTERACTION STILL HAS CAPACITY
  // --------------------------------------------------------------------------
  try {
    console.log("\n▶ Testing Gate 6: Capacity exceeded / sold out...");
    const active = await InteractionService.getInteractionById(creatorId, "int_seed_ama");
    if (active) {
      const originalRemaining = active.remainingQuantity;
      active.remainingQuantity = 0; // Simulate sold out
      try {
        await InteractionPurchaseService.purchaseInteraction({
          creatorId,
          interactionId: "int_seed_ama",
          expectedPrice: 100,
          fanUserId: "fan_alex",
        });
        console.error("❌ Gate 6 FAILED: Expected CapacityExceededError");
      } catch (innerErr: any) {
        if (innerErr instanceof CapacityExceededError) {
          console.log(`✅ Gate 6 PASSED: Correctly threw CapacityExceededError (409): ${innerErr.message}`);
          passedCount++;
        } else {
          console.error("❌ Gate 6 FAILED: Unexpected error type", innerErr);
        }
      } finally {
        active.remainingQuantity = originalRemaining;
      }
    }
  } catch (err) {
    console.error("❌ Gate 6 test error:", err);
  }

  // --------------------------------------------------------------------------
  // GATE 7: THE FAN ISN'T BLOCKED
  // --------------------------------------------------------------------------
  try {
    console.log("\n▶ Testing Gate 7: Blocked / banned fan...");
    await InteractionPurchaseService.purchaseInteraction({
      creatorId,
      interactionId: "int_seed_ama",
      expectedPrice: 100,
      fanUserId: "fan_blocked",
    });
    console.error("❌ Gate 7 FAILED: Expected FanBlockedError");
  } catch (err: any) {
    if (err instanceof FanBlockedError) {
      console.log(`✅ Gate 7 PASSED: Correctly threw FanBlockedError (403): ${err.message}`);
      passedCount++;
    } else {
      console.error("❌ Gate 7 FAILED: Unexpected error type", err);
    }
  }

  // --------------------------------------------------------------------------
  // FULL VALID PURCHASE FLOW (Alex: 1,250 balance -> buys ASK ME ANYTHING for 100 credits)
  // --------------------------------------------------------------------------
  console.log("\n▶ Testing Full Valid Purchase Flow: Alex buys 'ASK ME ANYTHING' (100 credits)...");
  InteractionPurchaseService.setMockWalletBalance("fan_alex", 1250);

  const receipt = await InteractionPurchaseService.purchaseInteraction({
    creatorId,
    interactionId: "int_seed_ama",
    expectedPrice: 100,
    fanUserId: "fan_alex",
    fanDisplayName: "Alex Patron 💎",
    customMessage: "What advice would you give to your 20-year-old self?",
    idempotencyKey: "test_alex_purchase_001",
  });

  console.log("Receipt received from backend:", receipt);

  if (
    receipt.success &&
    receipt.title === "ASK ME ANYTHING" &&
    receipt.priceCredits === 100 &&
    receipt.fanBalanceBefore === 1250 &&
    receipt.fanRemainingBalance === 1150 &&
    receipt.queuePosition === 3 // Position #3
  ) {
    console.log(`✅ Full Purchase Flow PASSED:`);
    console.log(`   - Title: "${receipt.title}"`);
    console.log(`   - Price: ${receipt.priceCredits} credits`);
    console.log(`   - Fan Balance: 1,250 -> ${receipt.fanRemainingBalance} credits`);
    console.log(`   - Fan sees: Position #${receipt.queuePosition}`);
    passedCount++;
  } else {
    console.error("❌ Full Purchase Flow FAILED: Incorrect receipt values", receipt);
  }

  // --------------------------------------------------------------------------
  // GATE 8: THE TRANSACTION HAS NOT ALREADY HAPPENED (IDEMPOTENCY)
  // --------------------------------------------------------------------------
  console.log("\n▶ Testing Gate 8: Idempotency (repeating same transaction)...");
  const repeatReceipt = await InteractionPurchaseService.purchaseInteraction({
    creatorId,
    interactionId: "int_seed_ama",
    expectedPrice: 100,
    fanUserId: "fan_alex",
    fanDisplayName: "Alex Patron 💎",
    customMessage: "What advice would you give to your 20-year-old self?",
    idempotencyKey: "test_alex_purchase_001", // duplicate key
  });

  if (
    repeatReceipt.purchaseId === receipt.purchaseId &&
    repeatReceipt.fanRemainingBalance === 1150 // did NOT deduct another 100 credits
  ) {
    console.log("✅ Gate 8 PASSED: Duplicate idempotency key returned existing receipt without double-charging");
    passedCount++;
  } else {
    console.error("❌ Gate 8 FAILED: Double charged or incorrect receipt returned", repeatReceipt);
  }

  // Check creator queue items
  console.log("\n▶ Checking Creator Live Queue...");
  const creatorQueue = InteractionQueueService.getCreatorQueue(creatorId);
  console.log(`Queue items count: ${creatorQueue.length}`);
  const alexItem = creatorQueue.find((q) => q.senderId === "fan_alex");
  if (alexItem) {
    console.log(`✅ Creator sees: ${alexItem.senderName.split(" ")[0]} — ${alexItem.title} — ${alexItem.creditCost} credits (Position #${alexItem.queuePosition})`);
  }

  console.log("\n===============================================================");
  console.log(`🎯 VERIFICATION RESULTS: ${passedCount}/${totalCount} TESTS PASSED`);
  console.log("===============================================================");

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
