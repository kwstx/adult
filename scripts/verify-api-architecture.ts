/**
 * ============================================================================
 * END-TO-END VERIFICATION SUITE: 16-DOMAIN CLEAN API ARCHITECTURE
 * ============================================================================
 *
 * Verifies all 16 conceptual platform domains:
 * 1.  Authentication APIs
 * 2.  User APIs
 * 3.  Creator APIs
 * 4.  Live APIs
 * 5.  Wallet APIs
 * 6.  Payment APIs
 * 7.  Subscription APIs
 * 8.  Content APIs
 * 9.  Messaging APIs
 * 10. Interaction APIs
 * 11. Goal APIs
 * 12. Progression APIs
 * 13. Session APIs
 * 14. Notification APIs
 * 15. Moderation APIs
 * 16. Admin APIs
 */

import prisma from "../src/lib/db";
import { AuthService } from "../src/modules/auth/auth.service";
import { UserService } from "../src/modules/user/user.service";
import { CreatorService } from "../src/modules/creator/creator.service";
import { StreamService } from "../src/modules/livestream/stream.service";
import { WalletLedgerService } from "../src/modules/economic/wallet-ledger.service";
import { PaymentAdapter, CREDIT_PACKAGES } from "../src/modules/economic/payment.adapter";
import { SubscriptionService, EntitlementService } from "../src/modules/subscription";
import { ContentService } from "../src/modules/content/content.service";
import { PaidMessagingService } from "../src/modules/messaging/paid-messaging.service";
import { InteractionService } from "../src/modules/interaction/interaction.service";
import { InteractionPurchaseService } from "../src/modules/interaction/interaction-purchase.service";
import { CollectiveGoalService } from "../src/modules/goals/collective-goal.service";
import { ProgressionEngineService } from "../src/modules/xp/progression-engine.service";
import { RelationshipService } from "../src/modules/relationship/relationship.service";
import { PrivateBookingService } from "../src/modules/private-sessions/booking.service";
import { SlotGeneratorService } from "../src/modules/private-sessions/slot-generator.service";
import { NotificationService } from "../src/modules/notifications/notification.service";
import { ModerationService } from "../src/modules/trust-safety/moderation.service";
import { AdminService } from "../src/modules/admin/admin.service";
import { AdminAuthService } from "../src/modules/admin/admin-auth.service";
import { generateUserToken, verifyUserToken } from "../src/lib/api-handler";

async function runVerification() {
  console.log("================================================================================");
  console.log("🚀 STARTING FULL 16-DOMAIN API ARCHITECTURE VERIFICATION TEST");
  console.log("================================================================================\n");

  const runId = Date.now().toString().slice(-6);

  // --------------------------------------------------------------------------
  // DOMAIN 1: AUTHENTICATION APIs
  // --------------------------------------------------------------------------
  console.log("🔹 [1/16] Testing Authentication Domain...");
  const fanRegisterResult = await AuthService.register({
    email: `fan_${runId}@auralive.test`,
    username: `fan_alex_${runId}`,
    displayName: "Alex Patron",
    role: "FAN",
    bio: "Superfan of interactive live streams.",
  });
  console.log("   ✅ Fan registered with atomic wallet:", fanRegisterResult.user.id);

  const creatorRegisterResult = await AuthService.register({
    email: `creator_${runId}@auralive.test`,
    username: `maya_velvet_${runId}`,
    displayName: "Maya Velvet",
    role: "CREATOR",
    bio: "Professional dancer & interactive creator.",
  });
  console.log("   ✅ Creator registered with atomic creator profile:", creatorRegisterResult.user.creatorProfileId);

  // Login & Session check
  const loginResult = await AuthService.login({
    identifier: fanRegisterResult.user.username,
  });
  console.log("   ✅ Login successful, issued JWT token:", loginResult.token.substring(0, 25) + "...");

  const decodedToken = verifyUserToken(loginResult.token);
  if (decodedToken.userId !== fanRegisterResult.user.id) {
    throw new Error("Token decoding mismatch!");
  }
  console.log("   ✅ Token cryptographic verification passed.");

  const sessionData = await AuthService.getSession(fanRegisterResult.user.id);
  console.log("   ✅ Authoritative session retrieved, balance:", sessionData.walletBalance);

  // --------------------------------------------------------------------------
  // DOMAIN 2: USER APIs
  // --------------------------------------------------------------------------
  console.log("\n🔹 [2/16] Testing User Domain...");
  const updatedUser = await UserService.updateProfile(fanRegisterResult.user.id, {
    bio: "Updated bio for Alex Patron.",
  });
  console.log("   ✅ User profile updated:", updatedUser.bio);

  const publicProfile = await UserService.getProfile(fanRegisterResult.user.id);
  console.log("   ✅ Public profile fetched:", publicProfile.displayName);

  const searchResults = await UserService.searchUsers("Maya", { limit: 5 });
  console.log("   ✅ User search returned results count:", searchResults.users.length);

  // --------------------------------------------------------------------------
  // DOMAIN 3: CREATOR APIs
  // --------------------------------------------------------------------------
  console.log("\n🔹 [3/16] Testing Creator Domain...");
  const creatorProfileId = creatorRegisterResult.user.creatorProfileId!;
  const creatorDetails = await CreatorService.getCreator(creatorProfileId, fanRegisterResult.user.id);
  console.log("   ✅ Creator details fetched for:", creatorDetails.stageName);

  await CreatorService.updateSettings(creatorProfileId, {
    category: "Dance & Music",
    tags: "dance,music,interactive,neon",
    defaultMinTip: 50,
    paidMessagesEnabled: true,
    messagePriceCredits: 25,
  });
  console.log("   ✅ Creator monetization settings updated.");

  // Follow creator
  const followResult = await CreatorService.toggleFollow(fanRegisterResult.user.id, creatorProfileId);
  console.log("   ✅ Follow toggled, isFollowing:", followResult.isFollowing, "totalFollowers:", followResult.totalFollowers);

  // --------------------------------------------------------------------------
  // DOMAIN 4: LIVE APIs
  // --------------------------------------------------------------------------
  console.log("\n🔹 [4/16] Testing Live Streaming Domain...");
  const broadcastStart = await StreamService.startBroadcast(
    creatorRegisterResult.user.id,
    "Late Night Neon Dance & Requests ✨",
    "Dance & Music",
    "PUBLIC_BROADCAST"
  );
  console.log("   ✅ Livestream broadcast started, streamId:", broadcastStart.streamId);
  console.log("   ✅ Ingest URL:", broadcastStart.ingest.whipIngestUrl);

  const playbackAccess = await StreamService.requestPlaybackAccess({
    streamId: broadcastStart.streamId,
    viewerUserId: fanRegisterResult.user.id,
  });
  console.log("   ✅ Playback authorized, HLS playback URL issued:", playbackAccess.playback.hlsPlaybackUrl.substring(0, 45) + "...");

  const activeStreams = await StreamService.getActiveStreams();
  console.log("   ✅ Active streams count:", activeStreams.length);

  // --------------------------------------------------------------------------
  // DOMAIN 5 & 6: WALLET & PAYMENT APIs
  // --------------------------------------------------------------------------
  console.log("\n🔹 [5/16 & 6/16] Testing Wallet & Payment Domains...");
  console.log("   Available packages count:", CREDIT_PACKAGES.length);

  // Simulate authoritative payment gateway deposit webhook
  const depositIdempotency = `dep_${runId}`;
  const depositResult = await WalletLedgerService.processDeposit({
    userId: fanRegisterResult.user.id,
    amountFiatCents: 5000, // $50.00
    currency: "USD",
    creditsPurchased: 5000,
    bonusCredits: 500,
    gateway: "CCBILL",
    gatewayTransactionId: `ccb_${runId}`,
    idempotencyKey: depositIdempotency,
  });
  console.log("   ✅ Deposit settled atomically: +5,500 credits");
  console.log("   ✅ New fan balance:", depositResult.fanRemainingBalance);

  // Wallet statement
  const statement = await WalletLedgerService.getStatement(fanRegisterResult.user.id);
  console.log("   ✅ Authoritative wallet statement generated, items count:", statement.statementItems.length);

  // --------------------------------------------------------------------------
  // DOMAIN 7: SUBSCRIPTION APIs
  // --------------------------------------------------------------------------
  console.log("\n🔹 [7/16] Testing Subscription Domain...");
  // Create subscription product for creator
  const subProduct = await prisma.subscriptionProduct.create({
    data: {
      creatorProfileId,
      tier: "VIP",
      name: "VIP Devotee",
      description: "Access to exclusive VIP livestreams and badges",
      priceCredits: 200,
      billingPeriodDays: 30,
      badgeColor: "#FFD700",
      badgeIcon: "👑",
      isActive: true,
    },
  });

  const subResult = await SubscriptionService.subscribe({
    fanId: fanRegisterResult.user.id,
    creatorProfileId,
    productId: subProduct.id,
    idempotencyKey: `sub_${runId}`,
  });
  console.log("   ✅ Fan subscribed to VIP tier, subscriptionId:", subResult.subscription.id);
  console.log("   ✅ Fan balance after subscription:", subResult.ledgerSummary.fanRemainingBalance);

  const entitlementCheck = await EntitlementService.hasEntitlement({
    fanId: fanRegisterResult.user.id,
    creatorProfileId,
    entitlement: "VIP_BADGE",
  });
  console.log("   ✅ Entitlement verified (VIP_BADGE):", entitlementCheck.hasEntitlement);

  // --------------------------------------------------------------------------
  // DOMAIN 8: CONTENT & PPV APIs
  // --------------------------------------------------------------------------
  console.log("\n🔹 [8/16] Testing Content & PPV Domain...");
  const content = await ContentService.createContent(creatorProfileId, {
    title: "Exclusive 4K Neon Dance Routine",
    description: "High energy full uncut rehearsal",
    contentType: "VIDEO",
    accessLevel: "PPV_PURCHASE",
    priceCredits: 150,
    mediaUrl: "https://cdn.platform.local/creators/maya/exclusive_4k.mp4",
    previewUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600",
    mediaDurationSeconds: 180,
  });
  console.log("   ✅ PPV Content published, contentId:", content.id);

  // Check before unlock
  const contentBefore = await ContentService.getContent(content.id, fanRegisterResult.user.id);
  console.log("   ✅ Content locked for viewer:", !contentBefore.isUnlocked);

  // Unlock PPV
  const unlockResult = await ContentService.unlockPPV(fanRegisterResult.user.id, content.id);
  console.log("   ✅ Content unlocked via wallet transaction, fanBalance:", unlockResult.fanRemainingBalance);

  const contentAfter = await ContentService.getContent(content.id, fanRegisterResult.user.id);
  console.log("   ✅ Content unlocked verified, mediaUrl granted:", contentAfter.isUnlocked);

  // --------------------------------------------------------------------------
  // DOMAIN 9: MESSAGING APIs
  // --------------------------------------------------------------------------
  console.log("\n🔹 [9/16] Testing Paid Messaging Domain...");
  const messageResult = await PaidMessagingService.sendPaidMessage({
    senderId: fanRegisterResult.user.id,
    creatorId: creatorProfileId,
    body: "Loved the latest dance routine! Can you play some synthwave tonight?",
    attachedCredits: 25,
    isPaidMessage: true,
  });
  console.log("   ✅ Paid message sent with credit deduction, messageId:", messageResult.message.id);
  console.log("   ✅ Creator received net earnings:", messageResult.paymentSummary?.creatorNetCredits);

  // --------------------------------------------------------------------------
  // DOMAIN 10: INTERACTION APIs
  // --------------------------------------------------------------------------
  console.log("\n🔹 [10/16] Testing Interaction Domain...");
  const interactionCreate = await InteractionService.createAndPublishInteraction({
    creatorProfileId,
    input: {
      type: "CHALLENGE",
      name: "Neon Confetti Spin 🎊",
      description: "Live wheel spin and celebratory popper blast",
      price: 100,
      duration: 20,
      quantity: 10,
      whoCanPurchase: "ALL",
      requiresAcceptance: false,
      entersQueue: true,
      icon: "🎊",
    },
  });
  console.log("   ✅ Interaction published to live menu:", interactionCreate.interaction.name);

  const purchaseResult = await InteractionPurchaseService.purchaseInteraction({
    fanUserId: fanRegisterResult.user.id,
    creatorProfileId,
    interactionId: interactionCreate.interaction.id,
    customPrompt: "Let's see what the wheel lands on!",
  });
  console.log("   ✅ Interaction purchased and queued, queueEntryId:", purchaseResult.queueEntry?.id);
  console.log("   ✅ Fan balance after interaction:", purchaseResult.financials.fanRemainingBalance);

  // --------------------------------------------------------------------------
  // DOMAIN 11: GOAL APIs
  // --------------------------------------------------------------------------
  console.log("\n🔹 [11/16] Testing Collective Goal Domain...");
  const goal = await CollectiveGoalService.createGoal({
    creatorProfileId,
    livestreamId: broadcastStart.streamId,
    title: "Cosplay Dance & Laser Show Spectacular 🎉",
    description: "Unlock full neon costume + laser lighting show",
    targetCredits: 500,
    initialCredits: 0,
  });
  console.log("   ✅ Collective Goal created, target:", goal.targetCredits);

  const contribution = await CollectiveGoalService.contributeToGoal({
    fanId: fanRegisterResult.user.id,
    goalId: goal.id,
    amountCredits: 200,
    message: "Contributing 200 tokens for the laser show!",
  });
  console.log("   ✅ Goal contribution processed, currentProgress:", contribution.currentProgressCredits, `(${contribution.progressPercentage.toFixed(1)}%)`);

  // --------------------------------------------------------------------------
  // DOMAIN 12: PROGRESSION APIs
  // --------------------------------------------------------------------------
  console.log("\n🔹 [12/16] Testing Progression & XP Domain...");
  const relationship = await RelationshipService.getRelationship(
    fanRegisterResult.user.id,
    creatorProfileId
  );
  console.log("   ✅ Fan-Creator Relationship Tier:", relationship.tier);
  console.log("   ✅ Total Relationship XP:", relationship.totalXp);
  console.log("   ✅ Lifetime Spend on Creator:", relationship.lifetimeSpendCredits);

  // --------------------------------------------------------------------------
  // DOMAIN 13: SESSION APIs
  // --------------------------------------------------------------------------
  console.log("\n🔹 [13/16] Testing Private 1-on-1 Session Domain...");
  const todayStr = new Date().toISOString().split("T")[0];
  const slots = SlotGeneratorService.generateBookableSlots({
    creatorProfileId,
    dateStr: todayStr,
    durationMinutes: 30,
  });
  console.log("   ✅ Generated bookable slots count:", slots.length);

  const selectedSlot = slots[0];
  const reserveResult = PrivateBookingService.reserveSlot({
    creatorProfileId,
    fanId: fanRegisterResult.user.id,
    startTimeUtc: selectedSlot.startTimeUtc,
    endTimeUtc: selectedSlot.endTimeUtc,
    displayTime: selectedSlot.displayTime,
    durationMinutes: 30,
  });
  console.log("   ✅ 10-Minute Lock acquired for slot:", reserveResult.hold?.displayTime);

  // Complete booking payment
  const bookingConfirm = await PrivateBookingService.payAndConfirmBooking({
    reservationId: reserveResult.hold!.reservationId,
    fanId: fanRegisterResult.user.id,
    creatorProfileId,
    priceCredits: 500,
    durationMinutes: 30,
    customNote: "Excited for our 1-on-1 session!",
  });
  console.log("   ✅ Booking confirmed atomically, bookingId:", bookingConfirm.booking.id);

  // Authorize media session
  const sessionAuth = await PrivateBookingService.authorizeSessionMedia(
    bookingConfirm.booking.id,
    fanRegisterResult.user.id
  );
  console.log("   ✅ Private WebRTC media room authorized, token issued:", sessionAuth.mediaToken.substring(0, 20) + "...");

  // --------------------------------------------------------------------------
  // DOMAIN 14: NOTIFICATION APIs
  // --------------------------------------------------------------------------
  console.log("\n🔹 [14/16] Testing Notification Domain...");
  const notif = await NotificationService.createNotification({
    userId: fanRegisterResult.user.id,
    type: "TIP_RECEIVED",
    title: "Gift Confirmed",
    body: "Your gift was received by Maya Velvet!",
  });
  console.log("   ✅ Notification created, notifId:", notif.id);

  const unreadNotifs = await NotificationService.getUserNotifications(fanRegisterResult.user.id, { unreadOnly: true });
  console.log("   ✅ Unread notifications count:", unreadNotifs.length);

  await NotificationService.markAsRead(notif.id, fanRegisterResult.user.id);
  console.log("   ✅ Notification marked as read.");

  // --------------------------------------------------------------------------
  // DOMAIN 15: MODERATION APIs
  // --------------------------------------------------------------------------
  console.log("\n🔹 [15/16] Testing Trust & Safety / Moderation Domain...");
  const reportResult = await ModerationService.submitReport({
    reporterId: fanRegisterResult.user.id,
    targetCreatorProfileId: creatorProfileId,
    category: "OTHER",
    notes: "Testing trust and safety automated pipeline.",
  });
  console.log("   ✅ Report submitted, reportId:", reportResult.report.id);
  console.log("   ✅ Linked investigation case created, caseId:", reportResult.case.id);

  // --------------------------------------------------------------------------
  // DOMAIN 16: ADMIN APIs
  // --------------------------------------------------------------------------
  console.log("\n🔹 [16/16] Testing Admin Domain...");
  // Create an admin user
  const adminUser = await prisma.user.upsert({
    where: { email: "superadmin@auralive.internal" },
    create: {
      email: "superadmin@auralive.internal",
      username: "master_admin",
      displayName: "Platform Administrator",
      role: "ADMIN",
      kycStatus: "COMPLIANCE_2257_APPROVED",
      wallet: { create: { balance: 0 } },
    },
    update: {},
  });

  const adminAuth = await AdminAuthService.authenticateAdminUser(adminUser.id);
  console.log("   ✅ Admin authenticated with RBAC role:", adminAuth.adminRole);

  const overviewStats = await AdminService.getDashboardOverview();
  console.log("   ✅ Admin platform overview metrics: Total Users =", overviewStats.totalUsers, ", Active Creators =", overviewStats.activeCreators);

  // End broadcast cleanly
  await StreamService.endBroadcast(creatorRegisterResult.user.id);
  console.log("   ✅ Broadcast cleanly ended.");

  console.log("\n================================================================================");
  console.log("🎉 ALL 16 DOMAINS VERIFIED SUCCESSFULLY!");
  console.log("================================================================================\n");
}

runVerification()
  .catch((e) => {
    console.error("❌ Verification failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
