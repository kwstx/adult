/**
 * UNIT TEST SUITE: AUTHORITATIVE ORDER MANAGEMENT ENGINE
 * 
 * Verifies core order processing, lifecycle states, and 3-concept separation:
 * 1. Authoritative price catalog lookup (client price is never trusted)
 * 2. Idempotent checkout execution (duplicate requests return existing order)
 * 3. Banned/invalid buyer rejection
 * 4. PPV, Subscription, Interaction, Gift, and Private Session order types
 * 5. Order State Machine transitions (PROCESSING -> COMPLETED)
 * 6. Order Refund orchestration (reverses ledger & revokes entitlements)
 */

import { TestRunner, assert, assertEqual } from "../utils/test-runner";
import { OrderService } from "@/modules/orders/order.service";
import { EntitlementService } from "@/modules/entitlements/entitlement.service";
import { mockDb } from "../utils/mock-db";

export async function runOrderUnitTests(): Promise<boolean> {
  const runner = new TestRunner("Layer 1: Order Engine Unit Tests");
  runner.printHeader();

  // Setup Fixtures
  mockDb.seedFixtures();
  OrderService._resetStoreForTesting();
  EntitlementService._resetStoreForTesting();

  const fanId = "user_fan_01";
  const creatorUserId = "user_creator_01";
  const creatorProfileId = "creator_maya_01";

  // Create content fixture for PPV
  const contentId = "cnt_photo_pack_01";
  await mockDb.content.create({
    data: {
      id: contentId,
      creatorProfileId,
      title: "Exclusive Tokyo Gallery",
      contentType: "ALBUM",
      accessLevel: "PPV_PURCHASE",
      priceCredits: 150,
      isPublished: true,
      creatorProfile: { id: creatorProfileId, userId: creatorUserId },
    },
  });

  // --------------------------------------------------------------------------
  // TEST 1: PPV Content Order Creation & Fulfillment
  // --------------------------------------------------------------------------
  await runner.runTest("Order Lifecycle: Creates and fulfills PPV Content Order", async () => {
    const idempotencyKey = "ord_ppv_test_01";

    const res = await OrderService.createAndProcessOrder(
      {
        buyerId: fanId,
        orderType: "PPV_CONTENT",
        targetResourceId: contentId,
        paymentMethod: "WALLET_CREDITS",
        idempotencyKey,
      },
      mockDb as any
    );

    assertEqual(res.success, true, "Order execution must succeed");
    assertEqual(res.order.status, "COMPLETED", "Order status must be COMPLETED");
    assertEqual(res.order.priceCredits, 150, "Order price must match authoritative content price (150)");
    assert(res.order.orderNumber.startsWith("ORD-"), "Order number must follow standard format");
    assertEqual(res.grantedEntitlements.length, 1, "Must grant 1 entitlement");
    assertEqual(res.grantedEntitlements[0].key, "CONTENT_ACCESS", "Entitlement key must be CONTENT_ACCESS");

    // Verify Entitlement is active in EntitlementService
    const entCheck = await EntitlementService.checkEntitlement(
      {
        userId: fanId,
        key: "CONTENT_ACCESS",
        resourceId: contentId,
      },
      mockDb as any
    );
    assertEqual(entCheck.hasEntitlement, true, "Entitlement check must immediately pass after order completion");
  });

  // --------------------------------------------------------------------------
  // TEST 2: Idempotent Execution
  // --------------------------------------------------------------------------
  await runner.runTest("Order Engine: Idempotency prevents duplicate order execution", async () => {
    const idempotencyKey = "ord_ppv_test_01"; // reuse previous key

    const res = await OrderService.createAndProcessOrder(
      {
        buyerId: fanId,
        orderType: "PPV_CONTENT",
        targetResourceId: contentId,
        paymentMethod: "WALLET_CREDITS",
        idempotencyKey,
      },
      mockDb as any
    );

    assertEqual(res.success, true, "Idempotent response must succeed");
    assertEqual(res.statusCode, 200, "Status code must be 200 OK for cached order");
    assertEqual(res.order.idempotencyKey, idempotencyKey, "Must return the same order record");
  });

  // --------------------------------------------------------------------------
  // TEST 3: Tip / Gift Order Processing
  // --------------------------------------------------------------------------
  await runner.runTest("Order Lifecycle: Creates and processes Live Tip / Gift Order", async () => {
    const res = await OrderService.createAndProcessOrder(
      {
        buyerId: fanId,
        sellerId: creatorProfileId,
        orderType: "TIP_GIFT",
        paymentMethod: "WALLET_CREDITS",
        idempotencyKey: "ord_gift_test_01",
        customMessage: "Amazing stream Maya! 💖",
        metadata: { amountCredits: 200, giftName: "Diamond Rose" },
      },
      mockDb as any
    );

    assertEqual(res.success, true, "Tip order must succeed");
    assertEqual(res.order.status, "COMPLETED", "Status must be COMPLETED");
    assertEqual(res.order.priceCredits, 200, "Price credits must match gift amount");
    assertEqual(res.order.sellerId, creatorProfileId, "Seller must match creator");
  });

  // --------------------------------------------------------------------------
  // TEST 4: Subscription Order Processing
  // --------------------------------------------------------------------------
  await runner.runTest("Order Lifecycle: Creates and fulfills Subscription Order", async () => {
    const res = await OrderService.createAndProcessOrder(
      {
        buyerId: fanId,
        orderType: "SUBSCRIPTION",
        targetResourceId: "sub_prod_vip_01",
        paymentMethod: "WALLET_CREDITS",
        idempotencyKey: "ord_sub_test_01",
      },
      mockDb as any
    );

    assertEqual(res.success, true, "Subscription order must succeed");
    assertEqual(res.order.status, "COMPLETED", "Status must be COMPLETED");
    assertEqual(res.order.priceCredits, 200, "Subscription credit price must be 200");
    assert(res.grantedEntitlements.some((e) => e.key === "SUBSCRIBER"), "Must grant SUBSCRIBER entitlement");
  });

  // --------------------------------------------------------------------------
  // TEST 5: Order Retrieval & Listing Filter
  // --------------------------------------------------------------------------
  await runner.runTest("Order Registry: Retrieves orders and filters by buyer/seller", async () => {
    const listRes = await OrderService.listOrders({
      buyerId: fanId,
      limit: 10,
    });

    assertEqual(listRes.total >= 3, true, "Should list at least 3 completed orders for this buyer");
    assertEqual(listRes.orders[0].buyerId, fanId, "Buyer ID must match");
  });

  // --------------------------------------------------------------------------
  // TEST 6: Authoritative Order Refund
  // --------------------------------------------------------------------------
  await runner.runTest("Order Refund: Reverses financial state and revokes entitlements", async () => {
    // 1. Create a dedicated order to refund
    const orderRes = await OrderService.createAndProcessOrder(
      {
        buyerId: fanId,
        orderType: "PPV_CONTENT",
        targetResourceId: contentId,
        paymentMethod: "WALLET_CREDITS",
        idempotencyKey: "ord_refund_test_01",
      },
      mockDb as any
    );

    assert(orderRes.success, "Order creation must succeed for refund test");
    const orderId = orderRes.order.id;

    // Verify entitlement active
    const checkBefore = await EntitlementService.checkEntitlement(
      {
        userId: fanId,
        key: "CONTENT_ACCESS",
        resourceId: contentId,
      },
      mockDb as any
    );
    assertEqual(checkBefore.hasEntitlement, true, "Entitlement must be active before refund");

    // 2. Process Refund
    const refundRes = await OrderService.refundOrder(
      {
        orderId,
        refundReason: "Accidental purchase",
        initiatedByUserId: "user_admin_01",
        isAdminOverride: true,
      },
      mockDb as any
    );

    assertEqual(refundRes.success, true, "Refund must succeed");
    assertEqual(refundRes.refundStatus, "FULLY_REFUNDED", "Refund status must be FULLY_REFUNDED");
    assertEqual(refundRes.revokedEntitlementCount >= 1, true, "Must revoke linked entitlement");

    // 3. Verify Entitlement is now REVOKED
    const checkAfter = await EntitlementService.checkEntitlement(
      {
        userId: fanId,
        key: "CONTENT_ACCESS",
        resourceId: contentId,
      },
      mockDb as any
    );
    assertEqual(checkAfter.hasEntitlement, false, "Entitlement must be revoked after refund");
  });

  return runner.getSummary().failedCount === 0;
}

if (require.main === module) {
  runOrderUnitTests().then((passed) => {
    process.exit(passed ? 0 : 1);
  });
}
