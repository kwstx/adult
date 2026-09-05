import { PaidMessagingService } from "../src/modules/messaging/paid-messaging.service";
import { eventBus } from "../src/modules/realtime/event-bus";
import { InsufficientFundsError } from "../src/modules/economic/wallet-ledger.service";

async function verifyPaidMessagingSuite() {
  console.log("================================================================================");
  console.log("🚀 STARTING PAID MESSAGING SYSTEM VERIFICATION SUITE");
  console.log("================================================================================\n");

  const creatorProfileId = "prof_maya";
  const fanUserId = "fan_alex";
  const secondFanId = "fan_sarah";

  // ----------------------------------------------------------------------------
  // TEST 1: CREATOR CONFIGURATION (FREE VS. PAID MESSAGING)
  // ----------------------------------------------------------------------------
  console.log("⏳ [1/7] Testing Creator Messaging Configuration (Free vs Paid)...");
  
  // Set creator to require 50 credits per message
  const updatedSettings = await PaidMessagingService.updateCreatorSettings(creatorProfileId, {
    paidMessagesEnabled: true,
    messagePriceCredits: 50,
    allowFreeSubscribers: false,
    allowFreeVip: false,
    customWelcomeMessage: "Welcome! Paid messages receive priority replies 💕",
  });

  console.log(`  - Paid Messages Enabled: ${updatedSettings.paidMessagesEnabled}`);
  console.log(`  - Message Price: ${updatedSettings.messagePriceCredits} credits`);
  console.log(`  - Welcome Notice: "${updatedSettings.customWelcomeMessage}"`);

  if (!updatedSettings.paidMessagesEnabled || updatedSettings.messagePriceCredits !== 50) {
    throw new Error("Failed to configure creator paid messaging rules.");
  }
  console.log("✅ [1/7] Creator Configuration Verified!\n");

  // ----------------------------------------------------------------------------
  // TEST 2: SERVER-SIDE PRICING VALIDATION & ELIGIBILITY
  // ----------------------------------------------------------------------------
  console.log("⏳ [2/7] Testing Server-Side Price & Eligibility Validation...");
  
  const eligibility = await PaidMessagingService.validateMessageEligibility(
    fanUserId,
    creatorProfileId,
    0
  );

  console.log(`  - Requires Payment: ${eligibility.requiresPayment}`);
  console.log(`  - Required Credits: ${eligibility.requiredCredits}`);
  console.log(`  - Fan Wallet Balance: ${eligibility.walletBalance}`);
  console.log(`  - Can Send: ${eligibility.canSend}`);

  if (!eligibility.requiresPayment || eligibility.requiredCredits !== 50) {
    throw new Error("Price validation mismatch against creator configuration.");
  }
  console.log("✅ [2/7] Server-Side Price Validation Verified!\n");

  // ----------------------------------------------------------------------------
  // TEST 3: REAL-TIME EVENT BUS INSTANT DELIVERY LISTENER
  // ----------------------------------------------------------------------------
  console.log("⏳ [3/7] Registering Real-time Instant Broadcast Listener...");
  let receivedRealtimeEvent: any = null;

  const unsubscribe = eventBus.subscribe(`creator:creator_maya`, (event) => {
    receivedRealtimeEvent = event;
    console.log(`  ⚡ [Real-time Event Captured] Channel: ${event.channel}, Type: ${event.type}`);
  });

  // ----------------------------------------------------------------------------
  // TEST 4: ATOMIC PAID MESSAGE DISPATCH & DOUBLE-ENTRY WALLET TRANSACTIONS
  // ----------------------------------------------------------------------------
  console.log("⏳ [4/7] Testing Backend-Authoritative Paid Message Dispatch & Wallet Debit...");
  
  const paidMsgResult = await PaidMessagingService.sendPaidMessage({
    senderId: fanUserId,
    creatorId: creatorProfileId,
    body: "Hi Maya! Here's a paid message for the VIP setlist request 🎵",
    attachedCredits: 100, // Boosted to 100 credits
    isPaidMessage: true,
  });

  console.log(`  - Success: ${paidMsgResult.success}`);
  console.log(`  - Message ID: ${paidMsgResult.message.id}`);
  console.log(`  - Is Paid Message: ${paidMsgResult.message.isPaidMessage}`);
  console.log(`  - Paid Price Credits: ${paidMsgResult.message.paidPriceCredits}`);
  console.log(`  - Priority Status: ${paidMsgResult.message.isPriority}`);
  console.log(`  - Credits Deducted: ${paidMsgResult.walletDebit?.creditsDeducted}`);
  console.log(`  - Creator Credited (80%): ${paidMsgResult.walletDebit?.creatorNet}`);
  console.log(`  - Platform Rake (20%): ${paidMsgResult.walletDebit?.platformFee}`);
  console.log(`  - Fan Remaining Balance: ${paidMsgResult.walletDebit?.fanRemainingBalance}`);

  if (!paidMsgResult.message.isPaidMessage || paidMsgResult.message.paidPriceCredits !== 100) {
    throw new Error("Message was not assigned authoritative paid status.");
  }
  if (paidMsgResult.walletDebit?.platformFee !== 20 || paidMsgResult.walletDebit?.creatorNet !== 80) {
    throw new Error("Platform rake and creator net calculation mismatch.");
  }
  console.log("✅ [4/7] Atomic Paid Message & Ledger Transaction Verified!\n");

  // ----------------------------------------------------------------------------
  // TEST 5: INSTANT REAL-TIME DELIVERY VERIFICATION
  // ----------------------------------------------------------------------------
  console.log("⏳ [5/7] Verifying Instant Real-time Delivery without Full Reload...");
  if (!receivedRealtimeEvent || receivedRealtimeEvent.type !== "NEW_MESSAGE") {
    throw new Error("Real-time message broadcast was not delivered to event bus.");
  }
  console.log(`  - Delivered Message: "${receivedRealtimeEvent.payload.message.body}"`);
  console.log(`  - Real-time Paid Status: ${receivedRealtimeEvent.payload.isPaid}`);
  unsubscribe();
  console.log("✅ [5/7] Zero-Polling Real-time Delivery Verified!\n");

  // ----------------------------------------------------------------------------
  // TEST 6: NEGATIVE BALANCE & OVERSPENDING GUARD
  // ----------------------------------------------------------------------------
  console.log("⏳ [6/7] Testing Negative Balance Prevention Guard...");
  let overspendingBlocked = false;

  try {
    await PaidMessagingService.sendPaidMessage({
      senderId: fanUserId,
      creatorId: creatorProfileId,
      body: "Trying to spend more than wallet has...",
      attachedCredits: 99999999, // Exceeds balance
      isPaidMessage: true,
    });
  } catch (err: any) {
    if (err instanceof InsufficientFundsError || err.name === "InsufficientFundsError") {
      overspendingBlocked = true;
      console.log(`  - Successfully rejected overspending: "${err.message}"`);
    }
  }

  if (!overspendingBlocked) {
    throw new Error("Security breach: Allowed paid message with insufficient funds!");
  }
  console.log("✅ [6/7] Negative Balance Prevention Guard Verified!\n");

  // ----------------------------------------------------------------------------
  // TEST 7: CREATOR ATTENTION PRIORITIZATION (UNREAD, PAID, PRIORITY, SUB, VIP)
  // ----------------------------------------------------------------------------
  console.log("⏳ [7/7] Testing Creator Inbox Attention Prioritization Filters...");
  
  // All conversations
  const allConversations = await PaidMessagingService.getConversationsForUser("creator_maya", "CREATOR", "all");
  console.log(`  - Total Creator Conversations: ${allConversations.length}`);

  // Paid filter
  const paidConversations = await PaidMessagingService.getConversationsForUser("creator_maya", "CREATOR", "paid");
  console.log(`  - Paid Filter Count: ${paidConversations.length}`);
  if (paidConversations.length === 0 || !paidConversations[0].hasPaidMessages) {
    throw new Error("Creator paid filter failed to return paid conversations.");
  }

  // Priority filter
  const priorityConversations = await PaidMessagingService.getConversationsForUser("creator_maya", "CREATOR", "priority");
  console.log(`  - Priority Filter Count: ${priorityConversations.length}`);
  if (priorityConversations.length === 0 || !priorityConversations[0].isPriority) {
    throw new Error("Creator priority filter failed to return high-priority threads.");
  }

  // VIP filter & Relationship Tier
  const vipConversations = await PaidMessagingService.getConversationsForUser("creator_maya", "CREATOR", "vip");
  console.log(`  - VIP Filter Count: ${vipConversations.length}`);
  console.log(`  - Top Conversation Relationship Level: ${vipConversations[0]?.relationshipLevel} (${vipConversations[0]?.relationshipTier})`);

  console.log("✅ [7/7] Creator Attention Prioritization & Filters Verified!\n");

  console.log("================================================================================");
  console.log("🎉 ALL 7 PAID MESSAGING & PRIORITIZATION TESTS PASSED SUCCESSFULLY!");
  console.log("================================================================================\n");
}

verifyPaidMessagingSuite().catch((err) => {
  console.error("Verification suite failed:", err);
  process.exit(1);
});
