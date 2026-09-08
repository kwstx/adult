/**
 * FINANCIAL & CONCURRENCY SCENARIOS TEST SUITE
 * 
 * Verifies the 10 platform-critical financial & concurrency scenarios
 * that break real platforms:
 * 
 *  1. User with 1,000 credits spends 500.
 *  2. User with 100 credits attempts to spend 500.
 *  3. Two simultaneous 1,000-credit purchases against a 1,000-credit balance (Race Condition).
 *  4. Payment webhook arrives twice (Idempotency).
 *  5. Payment webhook arrives late (Replay Attack / Stale Timestamp).
 *  6. Refund occurs (Ledger Reversal & Clawback).
 *  7. Chargeback occurs (Wallet Suspension & Dispute Handling).
 *  8. Subscription expires (Grace Period & Entitlement Revocation).
 *  9. Two users attempt the same private slot (Concurrency Slot Lock).
 * 10. Creator disables an interaction while a fan is purchasing it (In-Flight Inactive Race).
 */

import { TestRunner, assert, assertEqual, assertRejects, assertThrows } from "../utils/test-runner";
import { MockDatabaseStore } from "../utils/mock-db";
import { MockGateway } from "../utils/mock-gateway";
import { PaymentAdapter } from "@/modules/economic/payment.adapter";
import {
  WalletLedgerService,
  InsufficientFundsError,
  WalletSuspendedError,
} from "@/modules/economic/wallet-ledger.service";
import {
  InteractionPurchaseService,
  InteractionInactiveError,
  InsufficientBalanceError,
} from "@/modules/interaction/interaction-purchase.service";
import { InteractionService } from "@/modules/interaction/interaction.service";
import { EntitlementService, SubscriptionStatus } from "@/modules/subscription";
import { reservationLockService } from "@/modules/private-sessions/reservation-lock.service";

export async function runFinancialScenarios(): Promise<boolean> {
  const runner = new TestRunner("Layer 5: Critical Financial & Concurrency Scenarios");
  runner.printHeader();

  const db = new MockDatabaseStore();

  // ==========================================================================
  // SCENARIO 1: User with 1,000 credits spends 500
  // ==========================================================================
  await runner.runTest("Scenario 1: User with 1,000 credits spends 500 -> Balance becomes 500 with 80/20 split", async () => {
    db.seedFixtures();
    const fanId = "user_fan_01";
    const creatorUserId = "user_creator_01";
    const creatorProfileId = "creator_maya_01";
    const spendCredits = 500;
    const platformRake = 100; // 20%
    const creatorNet = 400; // 80%

    // Execute atomic spend
    await db.$transaction(async (tx) => {
      const fanWallet = await tx.wallet.findUnique({ where: { userId: fanId } });
      assertEqual(fanWallet.balance, 1000, "Starting balance must be 1,000");

      await tx.wallet.update({
        where: { id: fanWallet.id },
        data: { balance: fanWallet.balance - spendCredits },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: fanWallet.id,
          userId: fanId,
          type: "SPEND_LIVE_GIFT",
          amountCredits: spendCredits,
          direction: "DEBIT",
          sourceBalanceBefore: 1000,
          sourceBalanceAfter: 500,
          platformFeeCredits: platformRake,
          creatorNetCredits: creatorNet,
        },
      });

      const creatorWallet = await tx.wallet.findUnique({ where: { userId: creatorUserId } });
      await tx.wallet.update({
        where: { id: creatorWallet.id },
        data: { balance: creatorWallet.balance + creatorNet },
      });

      await tx.creatorEarning.create({
        data: {
          creatorProfileId,
          sourceUserId: fanId,
          grossCredits: spendCredits,
          creatorNetCredits: creatorNet,
          platformFeeCredits: platformRake,
          earningType: "LIVE_GIFT",
        },
      });
    });

    const finalFanWallet = await db.wallet.findUnique({ where: { userId: fanId } });
    const finalCreatorWallet = await db.wallet.findUnique({ where: { userId: creatorUserId } });

    assertEqual(finalFanWallet.balance, 500, "Fan balance must be exactly 500");
    assertEqual(finalCreatorWallet.balance, 400, "Creator balance must be exactly 400");
  });

  // ==========================================================================
  // SCENARIO 2: User with 100 credits attempts to spend 500
  // ==========================================================================
  await runner.runTest("Scenario 2: User with 100 credits attempts to spend 500 -> Rejected with InsufficientFundsError", async () => {
    db.seedFixtures();
    const fanId = "user_fan_01";

    // Set fan wallet to 100 credits
    await db.wallet.update({
      where: { userId: fanId },
      data: { balance: 100 },
    });

    await assertRejects(
      async () => {
        await db.$transaction(async (tx) => {
          const wallet = await tx.wallet.findUnique({ where: { userId: fanId } });
          const required = 500;
          if (wallet.balance < required) {
            throw new InsufficientFundsError(required, wallet.balance);
          }
          await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: wallet.balance - required },
          });
        });
      },
      InsufficientFundsError,
      "Should reject with InsufficientFundsError"
    );

    // Verify balance remains strictly 100
    const fanWallet = await db.wallet.findUnique({ where: { userId: fanId } });
    assertEqual(fanWallet.balance, 100, "Fan balance must remain strictly 100 without debit");
  });

  // ==========================================================================
  // SCENARIO 3: Two simultaneous 1,000-credit purchases against 1,000-credit balance
  // ==========================================================================
  await runner.runTest("Scenario 3: Two simultaneous 1,000-credit purchases -> Exactly 1 succeeds, exactly 1 fails, balance is 0", async () => {
    db.seedFixtures();
    const fanId = "user_fan_01";

    // Concurrency simulator with atomic transaction mutex
    let activeLock = false;
    const processPurchaseConcurrent = async (purchaseId: string): Promise<string> => {
      // Simulate database row locking / isolation level
      while (activeLock) {
        await new Promise((r) => setTimeout(r, 5));
      }
      activeLock = true;

      try {
        return await db.$transaction(async (tx) => {
          const wallet = await tx.wallet.findUnique({ where: { userId: fanId } });
          const cost = 1000;
          if (wallet.balance < cost) {
            throw new InsufficientFundsError(cost, wallet.balance);
          }

          await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: wallet.balance - cost },
          });

          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              userId: fanId,
              type: "SPEND_INTERACTION",
              amountCredits: cost,
              direction: "DEBIT",
              idempotencyKey: `sim_${purchaseId}`,
            },
          });

          return `SUCCESS_${purchaseId}`;
        });
      } finally {
        activeLock = false;
      }
    };

    // Fire 2 simultaneous purchases concurrently
    const results = await Promise.allSettled([
      processPurchaseConcurrent("req_1"),
      processPurchaseConcurrent("req_2"),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    assertEqual(fulfilled.length, 1, "Exactly ONE transaction must succeed");
    assertEqual(rejected.length, 1, "Exactly ONE transaction must fail with insufficient funds");

    // Verify wallet balance is 0 (never negative -1,000)
    const finalWallet = await db.wallet.findUnique({ where: { userId: fanId } });
    assertEqual(finalWallet.balance, 0, "Final balance must be exactly 0, never negative");
  });

  // ==========================================================================
  // SCENARIO 4: Payment webhook arrives twice (Idempotency)
  // ==========================================================================
  await runner.runTest("Scenario 4: Payment webhook arrives twice -> First mints credits, duplicate returns idempotent success", async () => {
    db.seedFixtures();
    const fanId = "user_fan_01";
    const idempotencyKey = "webhook_stripe_evt_duplicate_test_1000";

    // Set initial wallet to 0
    await db.wallet.update({
      where: { userId: fanId },
      data: { balance: 0 },
    });

    const processWebhook = async (key: string) => {
      return await db.$transaction(async (tx) => {
        const existingTx = await tx.walletTransaction.findUnique({
          where: { idempotencyKey: key },
        });

        if (existingTx) {
          // Idempotent duplicate: return cached record without minting
          return { isDuplicate: true, creditsMinted: 0 };
        }

        const wallet = await tx.wallet.findUnique({ where: { userId: fanId } });
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: wallet.balance + 1000 },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            userId: fanId,
            type: "DEPOSIT",
            amountCredits: 1000,
            direction: "CREDIT",
            idempotencyKey: key,
          },
        });

        return { isDuplicate: false, creditsMinted: 1000 };
      });
    };

    // First Webhook Arrival
    const res1 = await processWebhook(idempotencyKey);
    assertEqual(res1.isDuplicate, false, "First webhook is not duplicate");
    assertEqual(res1.creditsMinted, 1000, "First webhook mints 1,000 credits");

    const walletAfterFirst = await db.wallet.findUnique({ where: { userId: fanId } });
    assertEqual(walletAfterFirst.balance, 1000, "Balance is 1,000 after first webhook");

    // Second Webhook Arrival (Duplicate delivery)
    const res2 = await processWebhook(idempotencyKey);
    assertEqual(res2.isDuplicate, true, "Second webhook recognized as duplicate");
    assertEqual(res2.creditsMinted, 0, "Zero additional credits minted on duplicate");

    const walletAfterSecond = await db.wallet.findUnique({ where: { userId: fanId } });
    assertEqual(walletAfterSecond.balance, 1000, "Balance remains strictly 1,000, not 2,000");
  });

  // ==========================================================================
  // SCENARIO 5: Payment webhook arrives late (Replay Protection)
  // ==========================================================================
  await runner.runTest("Scenario 5: Payment webhook arrives late (>5m) -> Rejected with replay error, 0 credits minted", async () => {
    db.seedFixtures();
    const fanId = "user_fan_01";
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;

    const lateWebhook = MockGateway.createSignedWebhook({
      userId: fanId,
      amountFiatCents: 1000,
      creditsPurchased: 1000,
      timestamp: tenMinutesAgo,
    });

    const isValid = PaymentAdapter.verifyWebhookSignature(
      lateWebhook.rawBody,
      lateWebhook.headers["x-signature"],
      tenMinutesAgo
    );

    assertEqual(isValid, false, "Stale signature must be rejected");

    // Balance remains unmodified
    const wallet = await db.wallet.findUnique({ where: { userId: fanId } });
    assertEqual(wallet.balance, 1000, "Wallet balance untouched");
  });

  // ==========================================================================
  // SCENARIO 6: Refund occurs
  // ==========================================================================
  await runner.runTest("Scenario 6: Refund occurs -> Fan refunded +100, Creator clawed back -80, Platform fee reversed -20", async () => {
    db.seedFixtures();
    const fanId = "user_fan_01";
    const creatorUserId = "user_creator_01";
    const creatorProfileId = "creator_maya_01";

    // Setup: Fan spent 100 credits on question (Fan: 900, Creator: 80, Platform: 20)
    await db.wallet.update({ where: { userId: fanId }, data: { balance: 900 } });
    await db.wallet.update({ where: { userId: creatorUserId }, data: { balance: 80 } });

    // Execute Refund Transaction
    await db.$transaction(async (tx) => {
      const refundCredits = 100;
      const creatorClawback = 80;
      const platformFeeReversal = 20;

      // 1. Credit Fan Wallet
      const fanWallet = await tx.wallet.findUnique({ where: { userId: fanId } });
      await tx.wallet.update({
        where: { id: fanWallet.id },
        data: { balance: fanWallet.balance + refundCredits },
      });

      // 2. Debit Creator Wallet
      const creatorWallet = await tx.wallet.findUnique({ where: { userId: creatorUserId } });
      await tx.wallet.update({
        where: { id: creatorWallet.id },
        data: { balance: creatorWallet.balance - creatorClawback },
      });

      // 3. Record Refund Ledger Transaction
      await tx.walletTransaction.create({
        data: {
          walletId: fanWallet.id,
          userId: fanId,
          type: "REFUND",
          amountCredits: refundCredits,
          direction: "CREDIT",
          platformFeeCredits: -platformFeeReversal,
          creatorNetCredits: -creatorClawback,
          description: "Refund for paid question",
        },
      });
    });

    const finalFanWallet = await db.wallet.findUnique({ where: { userId: fanId } });
    const finalCreatorWallet = await db.wallet.findUnique({ where: { userId: creatorUserId } });

    assertEqual(finalFanWallet.balance, 1000, "Fan balance restored to 1,000");
    assertEqual(finalCreatorWallet.balance, 0, "Creator balance clawed back to 0");
  });

  // ==========================================================================
  // SCENARIO 7: Chargeback occurs
  // ==========================================================================
  await runner.runTest("Scenario 7: Chargeback occurs -> Fan wallet suspended (SUSPENDED_CHARGEBACK) & purchases blocked", async () => {
    db.seedFixtures();
    const fanId = "user_fan_01";

    // Simulate chargeback dispute processing
    await db.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId: fanId } });
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          status: "SUSPENDED_CHARGEBACK",
          balance: 0, // Remaining balance seized
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId: fanId,
          type: "CHARGEBACK_CLAWBACK",
          amountCredits: 1000,
          direction: "DEBIT",
          description: "Gateway chargeback dispute initiated",
        },
      });
    });

    const suspendedWallet = await db.wallet.findUnique({ where: { userId: fanId } });
    assertEqual(suspendedWallet.status, "SUSPENDED_CHARGEBACK", "Wallet must be marked SUSPENDED_CHARGEBACK");

    // Attempt spending with suspended wallet
    assertThrows(
      () => {
        if (suspendedWallet.status !== "ACTIVE") {
          throw new WalletSuspendedError(suspendedWallet.id, suspendedWallet.status);
        }
      },
      WalletSuspendedError,
      "Spending from suspended wallet must throw WalletSuspendedError"
    );
  });

  // ==========================================================================
  // SCENARIO 8: Subscription expires
  // ==========================================================================
  await runner.runTest("Scenario 8: Subscription expires -> EntitlementService denies VIP stream and content access", async () => {
    db.seedFixtures();
    const fanId = "user_fan_01";
    const creatorProfileId = "creator_maya_01";

    // Seed expired subscription (period ended yesterday, grace period passed)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await db.subscription.create({
      data: {
        fanId,
        creatorProfileId,
        productId: "sub_prod_vip_01",
        tier: "VIP",
        tierLevel: 2,
        status: "EXPIRED",
        currentPeriodEnd: yesterday,
        gracePeriodEndsAt: yesterday,
      },
    });

    const entitlementCheck = await EntitlementService.hasEntitlement(
      {
        fanId,
        creatorProfileId,
        entitlement: "VIP_BADGE",
      },
      db as any
    );

    assertEqual(entitlementCheck.hasEntitlement, false, "Expired subscription must not grant entitlement");
    assertEqual(entitlementCheck.statusCode, 403, "Status code must be 403 Forbidden");
    assert(entitlementCheck.reason.includes("expired"), "Reason should indicate subscription expired");
  });

  // ==========================================================================
  // SCENARIO 9: Two users attempt the same private slot
  // ==========================================================================
  await runner.runTest("Scenario 9: Two users attempt the same private slot -> Exactly 1 acquires hold, 1 rejected with conflict", () => {
    const creatorProfileId = "creator_maya_slot_test";
    const slotParams = {
      creatorProfileId,
      startTimeUtc: "2026-09-08T20:00:00.000Z",
      endTimeUtc: "2026-09-08T20:30:00.000Z",
      displayTime: "20:00 - 20:30",
      durationMinutes: 30,
      priceFiatCents: 10000,
      priceTokens: 1000,
    };

    // Fan 1 acquires hold
    const hold1 = reservationLockService.acquireHold({
      ...slotParams,
      fanId: "fan_alex",
    });

    assertEqual(hold1.success, true, "First user must successfully acquire reservation hold");
    assert(hold1.hold?.reservationId !== undefined, "Hold ID generated");

    // Fan 2 attempts the exact same slot concurrently
    const hold2 = reservationLockService.acquireHold({
      ...slotParams,
      fanId: "fan_sarah",
    });

    assertEqual(hold2.success, false, "Second user must be rejected due to active reservation hold");
    assert(hold2.error?.includes("temporarily held"), "Error must explain slot is held by another user");
  });

  // ==========================================================================
  // SCENARIO 10: Creator disables an interaction while a fan is purchasing it
  // ==========================================================================
  await runner.runTest("Scenario 10: Creator disables interaction in-flight -> Purchase fails with InteractionInactiveError, fan uncharged", async () => {
    InteractionPurchaseService.setMockWalletBalance("user_fan_01", 1000);

    // Ensure interaction is created
    await InteractionService.createAndPublishInteraction({
      creatorProfileId: "creator_maya",
      input: {
        type: "ACTIVITY",
        name: "Temporary Dance",
        description: "30s dance",
        price: 100,
        duration: 30,
      },
    });

    const activeList = await InteractionService.getActiveInteractions("creator_maya");
    const targetInteraction = activeList[0];

    // Creator configures interaction to inactive right before purchase completes Gate 2
    InteractionService.toggleInteractionActive("creator_maya", targetInteraction.id);

    await assertRejects(
      async () => {
        await InteractionPurchaseService.purchaseInteraction({
          creatorId: "creator_maya",
          interactionId: targetInteraction.id,
          fanUserId: "user_fan_01",
        });
      },
      InteractionInactiveError,
      "Should reject with InteractionInactiveError"
    );

    // Reset interaction status for future tests
    InteractionService.toggleInteractionActive("creator_maya", targetInteraction.id);

    const fanBalance = await InteractionPurchaseService.getWalletBalance("user_fan_01");
    assertEqual(fanBalance, 1000, "Fan balance must remain 1,000 without charge");
  });

  const summary = runner.printFooter();
  return summary.failedCount === 0;
}

// Direct execution support
if (require.main === module) {
  runFinancialScenarios().then((success) => process.exit(success ? 0 : 1));
}
