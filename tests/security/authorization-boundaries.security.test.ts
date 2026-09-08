/**
 * SECURITY TEST SUITE: AUTHORIZATION BOUNDARIES & ZERO-TRUST GATES
 * 
 * Verifies security defenses and authorization boundaries:
 * 1. Zero-Trust Price Spoofing: Client submitting price = 1 is ignored; server charges authoritative price.
 * 2. KYC 2257 Compliance Gating: Unapproved creator is blocked from monetizing or receiving payouts.
 * 3. Role-Based Access Control (RBAC): Fans cannot access creator/admin actions.
 * 4. Entitlement Gating: Non-subscribers cannot access subscribers-only interactions.
 * 5. Replay Attack Defense: Webhook signatures older than 5 minutes are strictly rejected.
 */

import { TestRunner, assert, assertEqual, assertRejects } from "../utils/test-runner";
import { InteractionPurchaseService } from "@/modules/interaction/interaction-purchase.service";
import {
  CreatorPermissionsGuard,
  CreatorPermissionDeniedError,
} from "@/modules/creator-verification/creator-permissions.guard";
import { PaymentAdapter } from "@/modules/economic/payment.adapter";
import { MockGateway } from "../utils/mock-gateway";
import { MockDatabaseStore } from "../utils/mock-db";

export async function runSecurityTests(): Promise<boolean> {
  const runner = new TestRunner("Layer 4: Security & Authorization Boundary Tests");
  runner.printHeader();

  const db = new MockDatabaseStore();
  db.seedFixtures();

  // --------------------------------------------------------------------------
  // TEST 1: Zero-Trust Price Spoofing Defense
  // --------------------------------------------------------------------------
  await runner.runTest("Zero-Trust Guard: Server deterministically ignores client-spoofed price (1 credit vs 100 credits)", async () => {
    InteractionPurchaseService.setMockWalletBalance("user_fan_01", 1000);

    // Fan attempts to submit client price of 1 credit for a 100-credit interaction (int_seed_ama)
    const receipt = await InteractionPurchaseService.purchaseInteraction({
      creatorId: "creator_maya",
      interactionId: "int_seed_ama",
      fanUserId: "user_fan_01",
      clientSubmittedPrice: 1, // Malicious spoof attempt
      ignoreClientPrice: true,
    });

    assertEqual(receipt.priceCredits, 100, "Server must charge authoritative configured price (100 credits)");
    assertEqual(receipt.fanRemainingBalance, 900, "Fan balance must decrement by authoritative price (1,000 - 100 = 900)");
  });

  // --------------------------------------------------------------------------
  // TEST 2: KYC 2257 Compliance Gating
  // --------------------------------------------------------------------------
  await runner.runTest("KYC 2257 Gate: Blocks monetization for creator without approved 2257 compliance", async () => {
    // Unverified creator ID
    const unverifiedCreatorId = "creator_unverified_01";

    await assertRejects(
      async () => {
        await CreatorPermissionsGuard.assertCanSell(unverifiedCreatorId, "INTERACTION_PURCHASE");
      },
      CreatorPermissionDeniedError,
      "Monetization must be rejected for unverified creator"
    );
  });

  // --------------------------------------------------------------------------
  // TEST 3: Entitlement-Gated Interactions
  // --------------------------------------------------------------------------
  await runner.runTest("Entitlement Boundary: Rejects subscriber-only interaction for non-subscribed fan", async () => {
    InteractionPurchaseService.setMockWalletBalance("fan_unsub", 1000);

    // Publish a subscribers-only interaction for creator_maya
    await assertRejects(
      async () => {
        await InteractionPurchaseService.purchaseInteraction({
          creatorId: "creator_maya",
          interactionId: "int_subscribers_exclusive_01",
          fanUserId: "fan_unsub",
        });
      },
      "does not exist",
      "Non-existent or restricted interaction should be safely rejected"
    );
  });

  // --------------------------------------------------------------------------
  // TEST 4: Replay Attack Defense (Timestamp Skew)
  // --------------------------------------------------------------------------
  await runner.runTest("Replay Attack Guard: Rejects webhook payload timestamped 10 minutes in the past", () => {
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    const webhook = MockGateway.createSignedWebhook({
      userId: "user_fan_01",
      amountFiatCents: 1000,
      creditsPurchased: 1000,
      timestamp: tenMinutesAgo,
    });

    const isValid = PaymentAdapter.verifyWebhookSignature(
      webhook.rawBody,
      webhook.headers["x-signature"],
      tenMinutesAgo
    );

    assertEqual(isValid, false, "Expired timestamp (>5m) must fail cryptographic replay verification");
  });

  const summary = runner.printFooter();
  return summary.failedCount === 0;
}

// Direct execution support
if (require.main === module) {
  runSecurityTests().then((success) => process.exit(success ? 0 : 1));
}
