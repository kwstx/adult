import {
  InteractionQueue,
  InvalidStateTransitionError,
} from "../src/modules/queue/interaction-queue.model";

function runQueueStateMachineTests() {
  console.log("=================================================");
  console.log("TESTING AUTHORITATIVE QUEUE BACKEND OBJECT & STATE MACHINE");
  console.log("=================================================\n");

  const queue = new InteractionQueue("creator_maya");

  // 1. Test Enqueue
  console.log("1. Enqueuing 3 interaction items...");
  const item1 = queue.enqueue({
    fan: {
      id: "fan_alex",
      username: "alex_patron",
      displayName: "Alex Patron 💎",
      avatarUrl: "https://example.com/alex.jpg",
      fanLevel: 14,
      relationshipTier: "ROYAL_PATRON",
      isVip: true,
      isSubscriber: true,
    },
    interaction: {
      id: "int_spin",
      title: "Wheel of Fortune Spin 🎡",
      actionType: "Visual",
      durationSeconds: 15,
      customMessage: "Spin for neon victory!",
    },
    price: {
      amountCredits: 250,
      fiatEquivalentCents: 2000,
      platformFeeCredits: 50,
      creatorNetCredits: 200,
    },
  });

  const item2 = queue.enqueue({
    fan: {
      id: "fan_sarah",
      username: "sarah_diamond",
      displayName: "Sarah Diamond 👑",
      avatarUrl: "https://example.com/sarah.jpg",
      fanLevel: 9,
      relationshipTier: "SOULMATE",
      isVip: true,
      isSubscriber: true,
    },
    interaction: {
      id: "int_dance",
      title: "Mini Freestyle Dance 💃",
      actionType: "Request",
      durationSeconds: 30,
      customMessage: "Play cyber bass!",
    },
    price: {
      amountCredits: 100,
      fiatEquivalentCents: 800,
      platformFeeCredits: 20,
      creatorNetCredits: 80,
    },
  });

  const item3 = queue.enqueue({
    fan: {
      id: "fan_elena",
      username: "elena_velvet",
      displayName: "Elena Velvet 🌸",
      avatarUrl: "https://example.com/elena.jpg",
      fanLevel: 3,
      relationshipTier: "SUPPORTER",
      isVip: false,
      isSubscriber: false,
    },
    interaction: {
      id: "int_shoutout",
      title: "VIP Champagne Pop 🍾",
      actionType: "VIP",
      durationSeconds: 25,
      customMessage: "Cheers to the stream!",
    },
    price: {
      amountCredits: 500,
      fiatEquivalentCents: 4000,
      platformFeeCredits: 100,
      creatorNetCredits: 400,
    },
  });

  console.log(`✓ Item 1 Position: #${item1.position}, Status: ${item1.status}`);
  console.log(`✓ Item 2 Position: #${item2.position}, Status: ${item2.status}`);
  console.log(`✓ Item 3 Position: #${item3.position}, Status: ${item3.status}`);
  if (item1.position !== 1 || item2.position !== 2 || item3.position !== 3) {
    throw new Error("Position rank calculation failed.");
  }

  // 2. Transition Item 1: Pending -> Accepted
  console.log("\n2. Creator accepts Item 1 (Pending -> Accepted)...");
  queue.accept(item1.id, "Accepted! Preparing spin.");
  console.log(`✓ Item 1 Status: ${item1.status}, Decision: ${item1.creatorDecision.decision}, Note: "${item1.creatorDecision.creatorNote}"`);
  if (item1.status !== "ACCEPTED") throw new Error("Accept failed");

  // 3. Transition Item 1: Accepted -> In progress
  console.log("\n3. Creator starts Item 1 (Accepted -> In progress)...");
  queue.startProgress(item1.id);
  console.log(`✓ Item 1 Status: ${item1.status}, StartTime: ${item1.startTime}, TimeRemaining: ${item1.timeRemainingSeconds}s`);
  if (item1.status !== "IN_PROGRESS" || !item1.startTime) throw new Error("Start progress failed");

  // 4. Transition Item 1: In progress -> Completed
  console.log("\n4. Creator completes Item 1 (In progress -> Completed)...");
  queue.complete(item1.id);
  console.log(`✓ Item 1 Status: ${item1.status}, CompletionTime: ${item1.completionTime}, Position: ${item1.position}`);
  if (item1.status !== "COMPLETED" || item1.position !== 0) throw new Error("Complete failed");

  // Verify Positions recalculate (Item 2 is now #1, Item 3 is now #2)
  console.log(`✓ Recalculated Active Positions: Item 2 is #${item2.position}, Item 3 is #${item3.position}`);
  if (item2.position !== 1 || item3.position !== 2) throw new Error("Recalculate positions failed after completion.");

  // 5. Transition Item 2: Pending -> Rejected with Refund State
  console.log("\n5. Creator rejects Item 2 (Pending -> Rejected with Refund)...");
  queue.reject(item2.id, "Song not available in library", "ref_tx_99812");
  console.log(`✓ Item 2 Status: ${item2.status}`);
  console.log(`✓ Item 2 Refund State:`, item2.potentialRefundState);
  if (
    item2.status !== "REJECTED" ||
    !item2.potentialRefundState.isRefunded ||
    item2.potentialRefundState.refundStatus !== "PROCESSED" ||
    item2.potentialRefundState.refundedAmountCredits !== 100
  ) {
    throw new Error("Reject with refund state failed");
  }

  // Verify Item 3 is now #1
  console.log(`✓ Item 3 Position after rejection: #${item3.position}`);
  if (item3.position !== 1) throw new Error("Position recalculation failed after rejection.");

  // 6. Transition Item 3: Pending -> Accepted -> Cancelled with Refund State
  console.log("\n6. Creator accepts then cancels Item 3 (Accepted -> Cancelled with Refund)...");
  queue.accept(item3.id);
  queue.cancel(item3.id, "Stream ending early", "CREATOR", "ref_tx_cancel_334");
  console.log(`✓ Item 3 Status: ${item3.status}`);
  console.log(`✓ Item 3 Refund State:`, item3.potentialRefundState);
  if (item3.status !== "CANCELLED" || !item3.potentialRefundState.isRefunded) {
    throw new Error("Cancel with refund state failed");
  }

  // 7. Transition Item 1 (Completed) -> Refunded
  console.log("\n7. Direct Refund on Completed Item 1 (Completed -> Refunded)...");
  queue.refund(item1.id, "Courtesy refund requested by viewer", "ref_tx_direct_555");
  console.log(`✓ Item 1 Status: ${item1.status}`);
  console.log(`✓ Item 1 Refund State:`, item1.potentialRefundState);
  if (item1.status !== "REFUNDED" || !item1.potentialRefundState.isRefunded) {
    throw new Error("Direct refund on completed item failed");
  }

  // 8. Test Invalid State Transition Guard
  console.log("\n8. Testing Invalid State Transition Guard (Rejected -> In progress should throw)...");
  try {
    queue.startProgress(item2.id);
    throw new Error("Guard failed: Illegal transition was permitted!");
  } catch (err: any) {
    if (err instanceof InvalidStateTransitionError) {
      console.log(`✓ Successfully caught InvalidStateTransitionError: "${err.message}"`);
    } else {
      throw err;
    }
  }

  console.log("\n=================================================");
  console.log("ALL QUEUE STATE MACHINE TESTS PASSED SUCCESSFULLY! 🎉");
  console.log("=================================================");
}

runQueueStateMachineTests();
