/**
 * UNIT TEST SUITE: AUTHORITATIVE ENTITLEMENT ENGINE
 * 
 * Verifies core entitlement evaluation, gatekeeper rules, and access consolidation:
 * 1. Unauthenticated rejection (401)
 * 2. Banned / Suspended account rejection (403)
 * 3. Administrator Authority Bypass (200, isBypassed: true)
 * 4. Creator Self-Domain Authority Bypass (200, isBypassed: true)
 * 5. Tiered Subscription Evaluation (Basic vs VIP vs Diamond)
 * 6. PPV Content Access Resolution (Public, Sub-only, Direct Purchase)
 * 7. Private Session Room Access Verification
 * 8. Premium Livestream Seat Authorization
 * 9. Explicit Grants & Revocations
 * 10. Consolidated `getUserEntitlements` summary payload
 */

import { TestRunner, assert, assertEqual } from "../utils/test-runner";
import { EntitlementService } from "@/modules/entitlements/entitlement.service";
import { mockDb } from "../utils/mock-db";

export async function runEntitlementUnitTests(): Promise<boolean> {
  const runner = new TestRunner("Layer 1: Entitlement Engine Unit Tests");
  runner.printHeader();

  // Setup Fixtures
  mockDb.seedFixtures();
  EntitlementService._resetStoreForTesting();

  const fanId = "user_fan_01";
  const creatorUserId = "user_creator_01";
  const creatorProfileId = "creator_maya_01";

  // Create an admin user fixture
  const adminId = "user_admin_01";
  await mockDb.user.create({
    data: {
      id: adminId,
      username: "superadmin",
      email: "admin@platform.internal",
      displayName: "System Admin 🛡️",
      role: "ADMIN",
      isActive: true,
      isBanned: false,
    },
  });

  // Create a banned user fixture
  const bannedId = "user_banned_01";
  await mockDb.user.create({
    data: {
      id: bannedId,
      username: "badactor",
      email: "bad@actor.com",
      displayName: "Bad Actor",
      role: "FAN",
      isActive: false,
      isBanned: true,
    },
  });

  // --------------------------------------------------------------------------
  // TEST 1: Unauthenticated Rejection
  // --------------------------------------------------------------------------
  await runner.runTest("Entitlement Gate: Rejects unauthenticated caller (401)", async () => {
    const res = await EntitlementService.checkEntitlement(
      {
        userId: null,
        key: "SUBSCRIBER",
        creatorProfileId,
      },
      mockDb as any
    );

    assertEqual(res.hasEntitlement, false, "Unauthenticated user must not have access");
    assertEqual(res.statusCode, 401, "Status code must be 401 Unauthorized");
  });

  // --------------------------------------------------------------------------
  // TEST 2: Suspended / Banned Account Rejection
  // --------------------------------------------------------------------------
  await runner.runTest("Entitlement Gate: Rejects suspended/banned users (403)", async () => {
    const res = await EntitlementService.checkEntitlement(
      {
        userId: bannedId,
        key: "SUBSCRIBER",
        creatorProfileId,
      },
      mockDb as any
    );

    assertEqual(res.hasEntitlement, false, "Banned user must not receive access");
    assertEqual(res.statusCode, 403, "Status code must be 403 Forbidden");
  });

  // --------------------------------------------------------------------------
  // TEST 3: Administrator Authority Bypass
  // --------------------------------------------------------------------------
  await runner.runTest("Entitlement Gate: Grants Administrator authority bypass", async () => {
    const res = await EntitlementService.checkEntitlement(
      {
        userId: adminId,
        key: "VIP_ACCESS",
        creatorProfileId,
      },
      mockDb as any
    );

    assertEqual(res.hasEntitlement, true, "Admin must be granted full bypass");
    assertEqual(res.isBypassed, true, "isBypassed flag must be true");
    assertEqual(res.statusCode, 200, "Status code must be 200 OK");
  });

  // --------------------------------------------------------------------------
  // TEST 4: Creator Self-Domain Authority Bypass
  // --------------------------------------------------------------------------
  await runner.runTest("Entitlement Gate: Grants Creator bypass on own domain & content", async () => {
    const res = await EntitlementService.checkEntitlement(
      {
        userId: creatorUserId,
        key: "SUBSCRIBER_CONTENT",
        creatorProfileId,
      },
      mockDb as any
    );

    assertEqual(res.hasEntitlement, true, "Creator must have access to own domain");
    assertEqual(res.isBypassed, true, "isBypassed flag must be true");
    assertEqual(res.statusCode, 200, "Status code must be 200 OK");
  });

  // --------------------------------------------------------------------------
  // TEST 5: Active Creator Subscription & VIP Tier Evaluation
  // --------------------------------------------------------------------------
  await runner.runTest("Entitlement Gate: Evaluates active subscription and VIP tier levels", async () => {
    // 1. Without subscription -> denied
    const denied = await EntitlementService.checkEntitlement(
      {
        userId: fanId,
        key: "SUBSCRIBER",
        creatorProfileId,
      },
      mockDb as any
    );
    assertEqual(denied.hasEntitlement, false, "Must deny when no subscription exists");

    // 2. Create active VIP subscription (tierLevel = 2)
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await mockDb.subscription.create({
      data: {
        fanId,
        creatorProfileId,
        tier: "VIP",
        tierName: "VIP Fan",
        tierLevel: 2,
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: futureDate,
        renewalDate: futureDate,
      },
    });

    // 3. Verify Basic Subscriber Entitlement
    const subCheck = await EntitlementService.checkEntitlement(
      {
        userId: fanId,
        key: "SUBSCRIBER",
        creatorProfileId,
      },
      mockDb as any
    );
    assertEqual(subCheck.hasEntitlement, true, "Active subscriber check must pass");
    assertEqual(subCheck.tierLevel, 2, "Fan tier level must be 2");

    // 4. Verify VIP Tier Check
    const vipCheck = await EntitlementService.checkEntitlement(
      {
        userId: fanId,
        key: "VIP_ACCESS",
        creatorProfileId,
      },
      mockDb as any
    );
    assertEqual(vipCheck.hasEntitlement, true, "VIP tier check must pass");

    // 5. Verify Diamond Tier Check (requires level 3 -> should fail)
    const diamondCheck = await EntitlementService.checkEntitlement(
      {
        userId: fanId,
        key: "DIAMOND_ACCESS",
        creatorProfileId,
      },
      mockDb as any
    );
    assertEqual(diamondCheck.hasEntitlement, false, "Diamond tier check must fail for Level 2 fan");
  });

  // --------------------------------------------------------------------------
  // TEST 6: PPV Content Access Resolution
  // --------------------------------------------------------------------------
  await runner.runTest("Entitlement Gate: Resolves PPV content purchase unlocking", async () => {
    const videoId = "content_video_01";
    await mockDb.content.create({
      data: {
        id: videoId,
        creatorProfileId,
        title: "Exclusive 4K Masterclass",
        contentType: "VIDEO",
        accessLevel: "PPV_PURCHASE",
        priceCredits: 250,
        isPublished: true,
      },
    });

    // 1. Without purchase -> locked
    const locked = await EntitlementService.checkEntitlement(
      {
        userId: fanId,
        key: "CONTENT_ACCESS",
        resourceId: videoId,
      },
      mockDb as any
    );
    assertEqual(locked.hasEntitlement, false, "Content must be locked before purchase");

    // 2. Record authoritative ContentPurchase
    await mockDb.contentPurchase.create({
      data: {
        contentId: videoId,
        fanId,
        priceCreditsPaid: 250,
        platformFeeCredits: 50,
        creatorNetCredits: 200,
      },
    });

    // 3. Re-check -> unlocked
    const unlocked = await EntitlementService.checkEntitlement(
      {
        userId: fanId,
        key: "CONTENT_ACCESS",
        resourceId: videoId,
      },
      mockDb as any
    );
    assertEqual(unlocked.hasEntitlement, true, "Content must be unlocked after purchase");
  });

  // --------------------------------------------------------------------------
  // TEST 7: Private Session Booking Authorization
  // --------------------------------------------------------------------------
  await runner.runTest("Entitlement Gate: Authorizes private session room access for participants", async () => {
    const bookingId = "booking_1on1_01";
    await mockDb.booking.create({
      data: {
        id: bookingId,
        fanId,
        creatorProfileId,
        scheduledStartTime: new Date(),
        scheduledEndTime: new Date(Date.now() + 30 * 60 * 1000),
        durationMinutes: 30,
        creditRatePerMinute: 100,
        totalCreditsEscrowed: 3000,
        status: "CONFIRMED",
        creatorProfile: { userId: creatorUserId },
      },
    });

    // Participant Fan -> Allowed
    const fanCheck = await EntitlementService.checkEntitlement(
      {
        userId: fanId,
        key: "PRIVATE_SESSION_ACCESS",
        resourceId: bookingId,
      },
      mockDb as any
    );
    assertEqual(fanCheck.hasEntitlement, true, "Fan participant must have access");

    // Random User -> Denied
    const outsiderCheck = await EntitlementService.checkEntitlement(
      {
        userId: "user_outsider_99",
        key: "PRIVATE_SESSION_ACCESS",
        resourceId: bookingId,
      },
      mockDb as any
    );
    assertEqual(outsiderCheck.hasEntitlement, false, "Non-participant must be denied");
  });

  // --------------------------------------------------------------------------
  // TEST 8: Explicit Entitlement Grants & Revocations
  // --------------------------------------------------------------------------
  await runner.runTest("Entitlement Gate: Handles explicit grants and revocations idempotently", async () => {
    // 1. Grant special event pass
    const grant = await EntitlementService.grantEntitlement({
      userId: fanId,
      key: "SPECIAL_EVENT_TICKET",
      scope: "LIVESTREAM",
      resourceId: "stream_gala_01",
      sourceType: "ADMIN_GRANT",
    });

    assert(grant.id.startsWith("ent_"), "Entitlement ID must be generated");

    // 2. Check access
    const check1 = await EntitlementService.checkEntitlement(
      {
        userId: fanId,
        key: "SPECIAL_EVENT_TICKET",
        scope: "LIVESTREAM",
        resourceId: "stream_gala_01",
      },
      mockDb as any
    );
    assertEqual(check1.hasEntitlement, true, "Explicitly granted ticket must be active");

    // 3. Revoke access
    const revokeRes = await EntitlementService.revokeEntitlement({
      userId: fanId,
      key: "SPECIAL_EVENT_TICKET",
      resourceId: "stream_gala_01",
      reason: "Ticket refunded",
    });
    assertEqual(revokeRes.revokedCount, 1, "Must revoke exactly 1 matching record");

    // 4. Re-check -> revoked
    const check2 = await EntitlementService.checkEntitlement(
      {
        userId: fanId,
        key: "SPECIAL_EVENT_TICKET",
        scope: "LIVESTREAM",
        resourceId: "stream_gala_01",
      },
      mockDb as any
    );
    assertEqual(check2.hasEntitlement, false, "Entitlement must no longer be active");
  });

  // --------------------------------------------------------------------------
  // TEST 9: Consolidated getUserEntitlements Payload
  // --------------------------------------------------------------------------
  await runner.runTest("Entitlement Summary: Returns consolidated payload for single frontend fetch", async () => {
    const summary = await EntitlementService.getUserEntitlements(
      {
        userId: fanId,
        creatorProfileId,
      },
      mockDb as any
    );

    assertEqual(summary.userId, fanId, "Summary matches fan ID");
    assertEqual(summary.isSubscriber, true, "isSubscriber flag must be true");
    assertEqual(summary.isVip, true, "isVip flag must be true");
    assertEqual(summary.subscriptionTierLevel, 2, "subscriptionTierLevel must be 2");
    assert(summary.unlockedContentIds.includes("content_video_01"), "Unlocked content ID list must contain purchased video");
    assert(summary.activeEntitlements.length > 0, "activeEntitlements list must not be empty");
  });

  return runner.getSummary().failedCount === 0;
}

if (require.main === module) {
  runEntitlementUnitTests().then((passed) => {
    process.exit(passed ? 0 : 1);
  });
}
