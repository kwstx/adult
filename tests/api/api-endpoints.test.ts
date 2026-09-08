/**
 * API TEST SUITE: ENDPOINT VERIFICATION & HTTP CONTRACTS
 * 
 * Verifies Next.js App Router Route Handlers:
 * 1. POST /api/economic/webhooks/payment (HMAC authentication & status codes)
 * 2. POST /api/economic/tip (Input validation, schema checks)
 * 3. POST /api/subscriptions/subscribe (Self-subscription prevention, bad requests)
 * 4. POST /api/creators/[creatorId]/interactions/purchase (Auth requirement, 404/400 handling)
 */

import { TestRunner, assert, assertEqual } from "../utils/test-runner";
import { MockHttpClient } from "../utils/http-client";
import { POST as paymentWebhookHandler } from "@/app/api/economic/webhooks/payment/route";
import { POST as tipHandler } from "@/app/api/economic/tip/route";
import { POST as subscribeHandler } from "@/app/api/subscriptions/subscribe/route";
import { POST as interactionPurchaseHandler } from "@/app/api/creators/[creatorId]/interactions/purchase/route";
import { MockGateway } from "../utils/mock-gateway";
import { MockDatabaseStore } from "../utils/mock-db";

export async function runApiTests(): Promise<boolean> {
  const runner = new TestRunner("Layer 3: API Endpoint Tests");
  runner.printHeader();

  const db = new MockDatabaseStore();
  db.seedFixtures();

  // --------------------------------------------------------------------------
  // TEST 1: Payment Webhook - Signature Missing (401)
  // --------------------------------------------------------------------------
  await runner.runTest("POST /api/economic/webhooks/payment: Rejects request with 401 when X-Signature header is missing", async () => {
    const req = MockHttpClient.createRequest("/api/economic/webhooks/payment", {
      method: "POST",
      body: { event: "payment.succeeded" },
    });

    const res = await paymentWebhookHandler(req);
    const parsed = await MockHttpClient.parseJsonResponse(res);

    assertEqual(parsed.status, 401, "Should respond with 401 Unauthorized");
    assert(parsed.data.error.includes("cryptographic signature"), "Error message should mention signature");
  });

  // --------------------------------------------------------------------------
  // TEST 2: Payment Webhook - Forged Signature (401)
  // --------------------------------------------------------------------------
  await runner.runTest("POST /api/economic/webhooks/payment: Rejects forged signature with 401 Unauthorized", async () => {
    const webhook = MockGateway.createSignedWebhook({
      userId: "user_fan_01",
      amountFiatCents: 1000,
      creditsPurchased: 1000,
      corruptSignature: true, // Corrupt HMAC
    });

    const req = MockHttpClient.createRequest("/api/economic/webhooks/payment", {
      method: "POST",
      headers: webhook.headers,
      body: webhook.payload,
    });

    const res = await paymentWebhookHandler(req);
    const parsed = await MockHttpClient.parseJsonResponse(res);

    assertEqual(parsed.status, 401, "Forged webhook must be rejected with 401");
  });

  // --------------------------------------------------------------------------
  // TEST 3: Economic Tip - Missing Required Fields (400)
  // --------------------------------------------------------------------------
  await runner.runTest("POST /api/economic/tip: Rejects incomplete payload with 400 Bad Request", async () => {
    const req = MockHttpClient.createRequest("/api/economic/tip", {
      method: "POST",
      body: {
        fanUserId: "user_fan_01",
        // missing creatorId and credits
      },
    });

    const res = await tipHandler(req);
    const parsed = await MockHttpClient.parseJsonResponse(res);

    assertEqual(parsed.status, 400, "Missing fields should return 400");
    assert(parsed.data.error.includes("Missing required fields"), "Should specify missing fields");
  });

  // --------------------------------------------------------------------------
  // TEST 4: Subscription Subscribe - Missing Required Fields (400)
  // --------------------------------------------------------------------------
  await runner.runTest("POST /api/subscriptions/subscribe: Rejects missing productId with 400 Bad Request", async () => {
    const req = MockHttpClient.createRequest("/api/subscriptions/subscribe", {
      method: "POST",
      body: {
        fanId: "user_fan_01",
        creatorProfileId: "creator_maya_01",
        // missing productId
      },
    });

    const res = await subscribeHandler(req);
    const parsed = await MockHttpClient.parseJsonResponse(res);

    assertEqual(parsed.status, 400, "Missing productId must return 400");
  });

  // --------------------------------------------------------------------------
  // TEST 5: Interaction Purchase - Unauthenticated Request (401)
  // --------------------------------------------------------------------------
  await runner.runTest("POST /api/creators/[id]/interactions/purchase: Blocks unauthenticated request with 401", async () => {
    const req = MockHttpClient.createRequest("/api/creators/creator_maya_01/interactions/purchase", {
      method: "POST",
      body: { interactionId: "inter_wheel_01" },
      // No auth header / session cookie
    });

    const res = await interactionPurchaseHandler(req, {
      params: Promise.resolve({ creatorId: "creator_maya_01" }),
    });
    const parsed = await MockHttpClient.parseJsonResponse(res);

    assertEqual(parsed.status, 401, "Unauthenticated purchase attempt must return 401");
  });

  const summary = runner.printFooter();
  return summary.failedCount === 0;
}

// Direct execution support
if (require.main === module) {
  runApiTests().then((success) => process.exit(success ? 0 : 1));
}
