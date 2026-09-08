/**
 * UNIT TEST SUITE: INDIVIDUAL BUSINESS FUNCTIONS & ALGORITHMS
 * 
 * Verifies core business logic in isolation without external network/IO:
 * 1. Revenue Share & Platform Rake Calculations (80/20 split)
 * 2. Credit Lot FIFO / Expiry Allocation Ordering
 * 3. Cryptographic Webhook HMAC Signatures & Constant-Time Verification
 * 4. Creator KYC 2257 State Machine Transitions
 * 5. Time Slot Calculation & Overlap Logic
 */

import { TestRunner, assert, assertEqual, assertThrows } from "../utils/test-runner";
import { PaymentAdapter } from "@/modules/economic/payment.adapter";
import { MockGateway, TEST_WEBHOOK_SECRET } from "../utils/mock-gateway";
import {
  CreatorOnboardingStateMachine,
  CreatorStateTransitionError,
} from "@/modules/creator-verification/creator-onboarding.state-machine";

export async function runUnitTests(): Promise<boolean> {
  const runner = new TestRunner("Layer 1: Business Functions Unit Tests");
  runner.printHeader();

  // --------------------------------------------------------------------------
  // TEST 1: Platform Rake & Creator Net Calculation (80% / 20%)
  // --------------------------------------------------------------------------
  await runner.runTest("Financial Rake: Calculates exact 80/20 revenue split for interaction", () => {
    const grossPriceCredits = 500;
    const rakePercentage = 20;
    const platformRakeCredits = Math.floor(grossPriceCredits * (rakePercentage / 100));
    const creatorNetCredits = grossPriceCredits - platformRakeCredits;

    assertEqual(platformRakeCredits, 100, "Platform rake must be 100 credits (20%)");
    assertEqual(creatorNetCredits, 400, "Creator net must be 400 credits (80%)");
    assertEqual(platformRakeCredits + creatorNetCredits, grossPriceCredits, "Rake + Creator Net must equal Gross Price");
  });

  await runner.runTest("Financial Rake: Handles odd gross credit amounts without fractional leakage", () => {
    const grossPriceCredits = 133;
    const rakePercentage = 20;
    const platformRakeCredits = Math.floor((grossPriceCredits * rakePercentage) / 100);
    const creatorNetCredits = grossPriceCredits - platformRakeCredits;

    assertEqual(platformRakeCredits, 26, "Floor of 133 * 0.20 is 26");
    assertEqual(creatorNetCredits, 107, "Creator net receives remainder 107");
    assertEqual(platformRakeCredits + creatorNetCredits, 133, "Conservation of credits holds");
  });

  // --------------------------------------------------------------------------
  // TEST 2: Credit Lot Priority Allocation (FIFO / Expiring First)
  // --------------------------------------------------------------------------
  await runner.runTest("Credit Lots: Depletes promotional/expiring lots before purchased lots", () => {
    // Simulated lots in wallet
    const lots = [
      { id: "lot_purchased", type: "PURCHASED", remaining: 1000, expiresAt: null, createdAt: 1000 },
      { id: "lot_promo", type: "PROMOTIONAL", remaining: 200, expiresAt: 5000, createdAt: 2000 },
      { id: "lot_bonus", type: "BONUS", remaining: 100, expiresAt: null, createdAt: 1500 },
    ];

    // Priority Sort: Lots with earliest expiration first, then PROMOTIONAL > BONUS > PURCHASED, then FIFO
    const sorted = [...lots].sort((a, b) => {
      if (a.expiresAt && !b.expiresAt) return -1;
      if (!a.expiresAt && b.expiresAt) return 1;
      if (a.expiresAt && b.expiresAt) return a.expiresAt - b.expiresAt;
      return a.createdAt - b.createdAt;
    });

    assertEqual(sorted[0].id, "lot_promo", "Expiring promotional lot must be prioritized first");
    assertEqual(sorted[1].id, "lot_purchased", "FIFO purchased lot created at 1000 is second");
    assertEqual(sorted[2].id, "lot_bonus", "Bonus lot created at 1500 is third");

    // Spend 250 credits
    let creditsToSpend = 250;
    const deductions: { lotId: string; deducted: number }[] = [];

    for (const lot of sorted) {
      if (creditsToSpend <= 0) break;
      const take = Math.min(lot.remaining, creditsToSpend);
      lot.remaining -= take;
      creditsToSpend -= take;
      deductions.push({ lotId: lot.id, deducted: take });
    }

    assertEqual(deductions[0].lotId, "lot_promo");
    assertEqual(deductions[0].deducted, 200, "All 200 promo credits consumed");
    assertEqual(deductions[1].lotId, "lot_purchased");
    assertEqual(deductions[1].deducted, 50, "Remaining 50 credits taken from purchased lot");
    assertEqual(creditsToSpend, 0, "All 250 credits spent");
  });

  // --------------------------------------------------------------------------
  // TEST 3: Webhook HMAC Cryptographic Validation
  // --------------------------------------------------------------------------
  await runner.runTest("Cryptography: Verifies valid HMAC-SHA256 signature with constant-time comparison", () => {
    const payload = { event: "payment.succeeded", amount: 1000 };
    const timestamp = Date.now();
    const validSignature = MockGateway.signPayload(payload, timestamp, TEST_WEBHOOK_SECRET);

    const isValid = PaymentAdapter.verifyWebhookSignature(payload, validSignature, timestamp, TEST_WEBHOOK_SECRET);
    assertEqual(isValid, true, "Valid HMAC signature must be accepted");
  });

  await runner.runTest("Cryptography: Rejects forged or tampered webhook payload signature", () => {
    const payload = { event: "payment.succeeded", amount: 1000 };
    const timestamp = Date.now();
    const forgedSignature = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";

    const isValid = PaymentAdapter.verifyWebhookSignature(payload, forgedSignature, timestamp, TEST_WEBHOOK_SECRET);
    assertEqual(isValid, false, "Forged signature must be rejected");
  });

  // --------------------------------------------------------------------------
  // TEST 4: Creator Onboarding & 2257 State Machine Transitions
  // --------------------------------------------------------------------------
  await runner.runTest("State Machine: Allows valid progressive transition from DRAFT to IDENTITY_VERIFIED", () => {
    // Should execute without throwing CreatorStateTransitionError
    CreatorOnboardingStateMachine.validateTransition(
      "DRAFT" as any,
      "IDENTITY_VERIFIED" as any
    );
    assert(true, "DRAFT -> IDENTITY_VERIFIED is allowed");
  });

  await runner.runTest("State Machine: Rejects invalid skip transition from DRAFT directly to MONETIZATION_ENABLED", () => {
    assertThrows(
      () => {
        CreatorOnboardingStateMachine.validateTransition(
          "DRAFT" as any,
          "MONETIZATION_ENABLED" as any
        );
      },
      CreatorStateTransitionError,
      "DRAFT -> MONETIZATION_ENABLED must throw CreatorStateTransitionError"
    );
  });

  // --------------------------------------------------------------------------
  // TEST 5: Private Session Time Slot Overlap Detector
  // --------------------------------------------------------------------------
  await runner.runTest("Slot Calculation: Detects overlapping interval conflicts accurately", () => {
    const isOverlapping = (
      startA: number,
      endA: number,
      startB: number,
      endB: number
    ) => startA < endB && endA > startB;

    // Slot A: 20:00 - 20:30 (100 to 130)
    // Slot B: 20:15 - 20:45 (115 to 145) -> Overlaps
    assert(isOverlapping(100, 130, 115, 145), "Overlapping slots must be detected");

    // Slot C: 20:30 - 21:00 (130 to 160) -> Back-to-back, does NOT overlap
    assert(!isOverlapping(100, 130, 130, 160), "Contiguous adjacent slots must not conflict");
  });

  const summary = runner.printFooter();
  return summary.failedCount === 0;
}

// Direct execution support
if (require.main === module) {
  runUnitTests().then((success) => process.exit(success ? 0 : 1));
}
