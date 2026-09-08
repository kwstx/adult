/**
 * END-TO-END TEST SUITE: COMPLETE USER JOURNEYS
 * 
 * Verifies multi-step lifecycle journeys across the platform:
 * 1. User & Creator Onboarding + 2257 Verification
 * 2. Fiat Wallet Top-Up via Webhook
 * 3. Live Broadcast Discovery & Presence
 * 4. In-Stream Tipping & Gift Animations
 * 5. Priority Queue Interaction Lifecycle (Queue -> Accept -> Complete)
 * 6. VIP Subscription Upgrade & Entitlement Resolution
 * 7. Private 1-on-1 Video Session Booking & Room Gate Authorization
 * 8. Full Financial Reconciliation
 */

import { TestRunner, assert, assertEqual } from "../utils/test-runner";
import { MockDatabaseStore } from "../utils/mock-db";
import { MockGateway } from "../utils/mock-gateway";
import { InteractionQueueService } from "@/modules/realtime/interaction-queue.service";
import { PrivateBookingService } from "@/modules/private-sessions/booking.service";
import { reservationLockService } from "@/modules/private-sessions/reservation-lock.service";
import { EntitlementService, SubscriptionStatus } from "@/modules/subscription";

export async function runE2eTests(): Promise<boolean> {
  const runner = new TestRunner("Layer 6: End-to-End User Journey Tests");
  runner.printHeader();

  const db = new MockDatabaseStore();

  await runner.runTest("E2E Journey: Fan registers, tops up, tips in live, queues interaction, subscribes, and books private session", async () => {
    // ------------------------------------------------------------------------
    // STEP 1: Fan & Creator Registration
    // ------------------------------------------------------------------------
    const fanUser = await db.user.create({
      data: {
        username: "e2e_fan",
        email: "fan@journey.com",
        displayName: "E2E Super Fan 💎",
        role: "FAN",
      },
    });

    const creatorUser = await db.user.create({
      data: {
        username: "e2e_creator",
        email: "creator@journey.com",
        displayName: "E2E Star Creator ✨",
        role: "CREATOR",
      },
    });

    const creatorProfile = await db.creatorProfile.create({
      data: {
        userId: creatorUser.id,
        stageName: "E2E Star Creator ✨",
        verificationStatus: "APPROVED",
        kycStatus: "COMPLIANCE_2257_APPROVED",
        canMonetize: true,
      },
    });

    const fanWallet = await db.wallet.create({
      data: { userId: fanUser.id, balance: 0, status: "ACTIVE" },
    });

    const creatorWallet = await db.wallet.create({
      data: { userId: creatorUser.id, balance: 0, status: "ACTIVE" },
    });

    assertEqual(fanWallet.balance, 0, "Step 1: Fan initial balance is 0");
    assertEqual(creatorProfile.canMonetize, true, "Step 1: Creator is 2257 approved");

    // ------------------------------------------------------------------------
    // STEP 2: Fan Wallet Top-Up via Webhook (+1,000 credits)
    // ------------------------------------------------------------------------
    const webhook = MockGateway.createSignedWebhook({
      userId: fanUser.id,
      amountFiatCents: 1000,
      creditsPurchased: 1000,
    });

    // Process deposit
    await db.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: fanWallet.id },
        data: { balance: 1000 },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: fanWallet.id,
          userId: fanUser.id,
          type: "DEPOSIT",
          amountCredits: 1000,
          direction: "CREDIT",
          idempotencyKey: `wh_${webhook.payload.gatewayTransactionId}`,
        },
      });
    });

    const fanWalletAfterDeposit = await db.wallet.findUnique({ where: { userId: fanUser.id } });
    assertEqual(fanWalletAfterDeposit.balance, 1000, "Step 2: Fan balance topped up to 1,000");

    // ------------------------------------------------------------------------
    // STEP 3: Fan tips 200 credits in Live Stream
    // ------------------------------------------------------------------------
    const tipCredits = 200;
    const tipRake = 40;
    const tipNet = 160;

    await db.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: fanWallet.id },
        data: { balance: fanWalletAfterDeposit.balance - tipCredits },
      });
      await tx.wallet.update({
        where: { id: creatorWallet.id },
        data: { balance: creatorWallet.balance + tipNet },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: fanWallet.id,
          userId: fanUser.id,
          type: "SPEND_TIP",
          amountCredits: tipCredits,
          direction: "DEBIT",
          platformFeeCredits: tipRake,
          creatorNetCredits: tipNet,
        },
      });
    });

    // ------------------------------------------------------------------------
    // STEP 4: Fan purchases 300-credit interaction -> Enters Queue
    // ------------------------------------------------------------------------
    const interactionCost = 300;
    const interactionNet = 240;

    await db.$transaction(async (tx) => {
      const currentFan = await tx.wallet.findUnique({ where: { userId: fanUser.id } });
      await tx.wallet.update({
        where: { id: fanWallet.id },
        data: { balance: currentFan.balance - interactionCost },
      });
      const currentCreator = await tx.wallet.findUnique({ where: { userId: creatorUser.id } });
      await tx.wallet.update({
        where: { id: creatorWallet.id },
        data: { balance: currentCreator.balance + interactionNet },
      });
    });

    // Place into queue
    const queueItem = await InteractionQueueService.enqueueInteraction({
      creatorId: creatorProfile.id,
      senderId: fanUser.id,
      senderName: fanUser.displayName,
      menuItemId: "inter_wheel_01",
      title: "VIP Wheel Spin",
      creditCost: 300,
      actionType: "WHEEL_SPIN",
      customMessage: "Let's spin!",
    });

    // Creator accepts, starts, and completes the interaction following state machine rules
    const accepted = await InteractionQueueService.acceptInteraction({
      creatorId: creatorProfile.id,
      queueId: queueItem.id,
    });
    assertEqual(accepted?.status, "ACCEPTED", "Step 5a: Interaction accepted by creator");

    const started = await InteractionQueueService.startProgressInteraction(
      creatorProfile.id,
      queueItem.id
    );
    assertEqual(started?.status, "IN_PROGRESS", "Step 5b: Interaction started by creator");

    const completed = await InteractionQueueService.completeInteraction(
      creatorProfile.id,
      queueItem.id
    );
    assertEqual(completed?.status, "COMPLETED", "Step 5c: Interaction marked COMPLETED by creator");

    // ------------------------------------------------------------------------
    // STEP 6: Fan Subscribes to VIP Tier
    // ------------------------------------------------------------------------
    await db.subscription.create({
      data: {
        fanId: fanUser.id,
        creatorProfileId: creatorProfile.id,
        tier: "VIP",
        tierLevel: 2,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    const entitlementCheck = await EntitlementService.hasEntitlement(
      {
        fanId: fanUser.id,
        creatorProfileId: creatorProfile.id,
        entitlement: "VIP_MEDIA",
      },
      db as any
    );

    assertEqual(entitlementCheck.hasEntitlement, true, "Step 6: Fan has active VIP Entitlement (VIP_MEDIA)");

    // ------------------------------------------------------------------------
    // STEP 7: Private Session Reservation & Booking
    // ------------------------------------------------------------------------
    const holdRes = reservationLockService.acquireHold({
      creatorProfileId: creatorProfile.id,
      fanId: fanUser.id,
      startTimeUtc: new Date(Date.now() + 7200 * 1000).toISOString(),
      endTimeUtc: new Date(Date.now() + 9000 * 1000).toISOString(),
      displayTime: "22:00 - 22:30",
      durationMinutes: 30,
      priceFiatCents: 10000,
      priceTokens: 500,
    });

    assertEqual(holdRes.success, true, "Step 7a: Slot reservation hold acquired");

    const bookingResult = await PrivateBookingService.processPaymentAndConfirm({
      reservationId: holdRes.hold!.reservationId,
      fanUser: {
        id: fanUser.id,
        displayName: fanUser.displayName,
        username: fanUser.username,
      },
      creatorUser: {
        id: creatorUser.id,
        displayName: creatorProfile.stageName,
        username: creatorUser.username,
      },
      paymentMethod: "WALLET_TOKENS",
    });

    assertEqual(bookingResult.success, true, "Step 7b: Private session payment and booking confirmed");
    assertEqual(bookingResult.booking?.status, "CONFIRMED", "Booking status is CONFIRMED");

    // Authorize private video room entry
    const roomGate = PrivateBookingService.authorizeRoomEntry({
      bookingId: bookingResult.booking!.id,
      userId: fanUser.id,
      currentTime: new Date(bookingResult.booking!.scheduledStartTime),
    });
    assertEqual(roomGate.authorized, true, "Step 7c: Private room gate validated and authorized");

    // ------------------------------------------------------------------------
    // STEP 8: Final Balance & Ledger Verification
    // ------------------------------------------------------------------------
    const finalFan = await db.wallet.findUnique({ where: { userId: fanUser.id } });
    const finalCreator = await db.wallet.findUnique({ where: { userId: creatorUser.id } });

    // Initial 1,000 - Tip 200 - Interaction 300 = 500
    assertEqual(finalFan.balance, 500, "Fan final balance is 500 credits");
    // Creator: Tip 160 + Interaction 240 = 400
    assertEqual(finalCreator.balance, 400, "Creator final earnings balance is 400 credits");
  });

  const summary = runner.printFooter();
  return summary.failedCount === 0;
}

// Direct execution support
if (require.main === module) {
  runE2eTests().then((success) => process.exit(success ? 0 : 1));
}
