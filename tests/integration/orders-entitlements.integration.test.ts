/**
 * INTEGRATION TEST SUITE: ORDERS, WALLET LEDGER & ENTITLEMENTS TRIAD
 * 
 * Verifies the complete 3-way architectural separation and lifecycle coordination:
 * 1. Concept 1 (Wallet Ledger): Financial movement, double-entry credits, lot deductions.
 * 2. Concept 2 (Order): Purchase intent, pricing catalog verification, order state machine.
 * 3. Concept 3 (Entitlement): What access/privilege the user received.
 * 
 * Tests the full Purchase -> Fulfillment -> Authorization -> Refund -> Revocation loop.
 */

import { TestRunner, assert, assertEqual } from "../utils/test-runner";
import { OrderService } from "@/modules/orders/order.service";
import { EntitlementService } from "@/modules/entitlements/entitlement.service";
import { mockDb } from "../utils/mock-db";

export async function runOrdersEntitlementsIntegrationTests(): Promise<boolean> {
  const runner = new TestRunner("Layer 2: Orders-Ledger-Entitlements Integration Tests");
  runner.printHeader();

  // Setup Clean Environment
  mockDb.seedFixtures();
  OrderService._resetStoreForTesting();
  EntitlementService._resetStoreForTesting();

  const fanId = "user_fan_01";
  const creatorUserId = "user_creator_01";
  const creatorProfileId = "creator_maya_01";

  // Create test video fixture
  const videoId = "content_premium_film_01";
  await mockDb.content.create({
    data: {
      id: videoId,
      creatorProfileId,
      title: "Neon Velvet: Extended Director's Cut",
      contentType: "VIDEO",
      accessLevel: "PPV_PURCHASE",
      priceCredits: 300,
      isPublished: true,
      creatorProfile: { id: creatorProfileId, userId: creatorUserId },
    },
  });

  // --------------------------------------------------------------------------
  // TEST 1: Full Purchase -> Ledger Movement -> Entitlement Granting Triad
  // --------------------------------------------------------------------------
  await runner.runTest("Triad Lifecycle: Executes Order, Ledger Debit, and Entitlement Grant atomically", async () => {
    // 1. Initial State Checks
    const initialWallet = await mockDb.wallet.findUnique({ where: { userId: fanId } });
    assertEqual(initialWallet.balance, 1000, "Fan initial wallet balance must be 1,000 credits");

    const accessBefore = await EntitlementService.checkEntitlement(
      {
        userId: fanId,
        key: "CONTENT_ACCESS",
        resourceId: videoId,
      },
      mockDb as any
    );
    assertEqual(accessBefore.hasEntitlement, false, "Content must be locked prior to purchase");

    // 2. Execute Order via OrderService
    const orderResult = await OrderService.createAndProcessOrder(
      {
        buyerId: fanId,
        orderType: "PPV_CONTENT",
        targetResourceId: videoId,
        paymentMethod: "WALLET_CREDITS",
        idempotencyKey: "integ_ord_ppv_01",
      },
      mockDb as any
    );

    assertEqual(orderResult.success, true, "Order execution must succeed");
    const order = orderResult.order;
    assertEqual(order.status, "COMPLETED", "Order status must be COMPLETED");
    assertEqual(order.priceCredits, 300, "Order must record exact catalog price 300");
    assert(order.walletTransactionId !== null, "Order must reference the financial ledger transaction ID");
    assertEqual(order.entitlementIds.length, 1, "Order must reference the granted entitlement ID");

    // 3. Verify Financial Ledger Effect (Concept 1)
    const updatedWallet = await mockDb.wallet.findUnique({ where: { userId: fanId } });
    assertEqual(updatedWallet.balance, 700, "Wallet balance must be exactly 700 (1000 - 300)");

    // 4. Verify Entitlement Effect (Concept 3)
    const accessAfter = await EntitlementService.checkEntitlement(
      {
        userId: fanId,
        key: "CONTENT_ACCESS",
        resourceId: videoId,
      },
      mockDb as any
    );
    assertEqual(accessAfter.hasEntitlement, true, "Entitlement must be immediately active");
    assertEqual(accessAfter.statusCode, 200, "Access status must be 200 OK");

    // 5. Verify Consolidated Frontend Summary
    const summary = await EntitlementService.getUserEntitlements(
      {
        userId: fanId,
        contentId: videoId,
      },
      mockDb as any
    );
    assert(summary.unlockedContentIds.includes(videoId) || summary.activeEntitlements.some((e) => e.resourceId === videoId), "Consolidated summary must include unlocked video");
  });

  // --------------------------------------------------------------------------
  // TEST 2: Full Refund -> Ledger Reversal -> Entitlement Revocation
  // --------------------------------------------------------------------------
  await runner.runTest("Triad Lifecycle: Executes Refund, Ledger Credit, and Entitlement Revocation", async () => {
    // 1. Get the completed order
    const listRes = await OrderService.listOrders({ buyerId: fanId, limit: 1 });
    const order = listRes.orders[0];
    assertEqual(order.status, "COMPLETED", "Order must be in COMPLETED state");

    // 2. Issue authoritative refund
    const refundResult = await OrderService.refundOrder(
      {
        orderId: order.id,
        refundReason: "Accidental double-click purchase",
        initiatedByUserId: "user_admin_01",
        isAdminOverride: true,
      },
      mockDb as any
    );

    assertEqual(refundResult.success, true, "Refund must succeed");
    assertEqual(refundResult.refundStatus, "FULLY_REFUNDED", "Order refund status must be FULLY_REFUNDED");
    assertEqual(refundResult.refundAmountCredits, 300, "Refund amount must match order price");
    assertEqual(refundResult.revokedEntitlementCount, 1, "Must revoke exactly 1 linked entitlement");

    // 3. Verify Entitlement Revocation in Gatekeeper
    const accessAfterRefund = await EntitlementService.checkEntitlement(
      {
        userId: fanId,
        key: "CONTENT_ACCESS",
        resourceId: videoId,
      },
      mockDb as any
    );
    assertEqual(accessAfterRefund.hasEntitlement, false, "Content access must be revoked following refund");
    assertEqual(accessAfterRefund.statusCode, 403, "Status code must return 403 Forbidden");

    // 4. Verify Order Record Updated
    const refundedOrder = await OrderService.getOrder(order.id);
    assertEqual(refundedOrder?.status, "REFUNDED", "Order record status must be updated to REFUNDED");
    assertEqual(refundedOrder?.refundStatus, "FULLY_REFUNDED", "Refund status must be FULLY_REFUNDED");
  });

  return runner.getSummary().failedCount === 0;
}

if (require.main === module) {
  runOrdersEntitlementsIntegrationTests().then((passed) => {
    process.exit(passed ? 0 : 1);
  });
}
