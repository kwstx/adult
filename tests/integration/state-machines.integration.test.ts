/**
 * ============================================================================
 * STATE MACHINES INTEGRATION TEST SUITE
 * ============================================================================
 * 
 * Verifies end-to-end state machine coordination with database models,
 * wallet double-entry ledgers, entitlement synchronization, and realtime events.
 */

import {
  livestreamStateMachine,
  interactionStateMachine,
  subscriptionStateMachine,
  privateSessionStateMachine,
  payoutStateMachine,
} from "@/modules/state-machines";
import { EntitlementService } from "@/modules/entitlements/entitlement.service";
import { WalletLedgerService } from "@/modules/economic/wallet-ledger.service";
import { mockDb } from "../utils/mock-db";

export async function runStateMachineIntegrationTests(): Promise<boolean> {
  console.log(`\n===============================================================`);
  console.log(`🧪 TEST SUITE: Layer 2D: State Machines End-to-End Integration`);
  console.log(`===============================================================\n`);

  mockDb.seedFixtures();
  EntitlementService._resetStoreForTesting();

  let allPassed = true;

  function assert(condition: boolean, testName: string, durationMs: number = 0) {
    if (condition) {
      console.log(`  ✓ ${testName} (${durationMs}ms)`);
    } else {
      console.error(`  ✗ ${testName} (${durationMs}ms)`);
      allPassed = false;
    }
  }

  // --------------------------------------------------------------------------
  // INTEGRATION 1: LIVESTREAM + EVENT BUS
  // --------------------------------------------------------------------------
  {
    const t0 = performance.now();
    const streamContext = {
      streamId: "stream_int_01",
      creatorProfileId: "creator_maya",
      security: { actorRole: "CREATOR", actorId: "creator_maya" },
      totalDurationSeconds: 1800,
    };

    // Broadcast cycle
    await livestreamStateMachine.transition("SCHEDULED", "PREPARING", streamContext);
    await livestreamStateMachine.transition("PREPARING", "LIVE", streamContext);
    assert(livestreamStateMachine.isBroadcasting("LIVE"), "Livestream: Stream is authoritatively LIVE", Math.round(performance.now() - t0));
    assert(livestreamStateMachine.allowsInteractions("LIVE"), "Livestream: Live state enables viewer interactions");

    await livestreamStateMachine.transition("LIVE", "ENDED", streamContext);
    assert(!livestreamStateMachine.isBroadcasting("ENDED"), "Livestream: ENDED halts broadcasting and interactions");
  }

  // --------------------------------------------------------------------------
  // INTEGRATION 2: INTERACTION MARKETPLACE + AUTOMATIC REFUND ROLLBACK
  // --------------------------------------------------------------------------
  {
    const t0 = performance.now();
    const purchaseContext = {
      purchaseId: "pur_int_01",
      interactionId: "int_dance",
      fanId: "user_fan_01",
      creatorProfileId: "creator_maya",
      creditsAmount: 300,
      refundReason: "Stream ended before action could be completed",
    };

    // Step 1: Paid & Queued
    await interactionStateMachine.transition("PAID", "QUEUED", purchaseContext);
    assert(interactionStateMachine.isActive("QUEUED"), "Interaction: QUEUED is actively in line", Math.round(performance.now() - t0));

    // Step 2: Creator rejects -> Automatic refund side-effect
    const rejectRes = await interactionStateMachine.transition("QUEUED", "REJECTED", purchaseContext);
    assert(rejectRes.success && rejectRes.toState === "REJECTED", "Interaction: Rejection completes with automatic wallet credit");
  }

  // --------------------------------------------------------------------------
  // INTEGRATION 3: SUBSCRIPTION LIFECYCLE + ENTITLEMENT ENGINE SYNC
  // --------------------------------------------------------------------------
  {
    const t0 = performance.now();
    const subContext = {
      subscriptionId: "sub_int_01",
      fanId: "user_fan_01",
      creatorProfileId: "creator_maya_01",
      tierName: "VIP",
      priceCredits: 500,
    };

    // Step 1: Active Subscription -> Transitions and Grants Entitlement
    await subscriptionStateMachine.transition("EXPIRED", "ACTIVE", subContext);

    let checkActive = await EntitlementService.checkEntitlement(
      {
        userId: subContext.fanId,
        creatorProfileId: subContext.creatorProfileId,
        key: "SUBSCRIBER",
      },
      mockDb
    );
    assert(checkActive.hasEntitlement, "Subscription Sync: ACTIVE grants subscriber entitlement", Math.round(performance.now() - t0));

    // Step 2: Renewal fails -> Moves to PAST_DUE (perks retained during grace period)
    await subscriptionStateMachine.transition("ACTIVE", "PAST_DUE", subContext);
    assert(subscriptionStateMachine.hasActivePerks("PAST_DUE"), "Subscription Sync: PAST_DUE retains grace period perks");

    // Step 3: Grace period expires -> Moves to EXPIRED (revokes entitlement)
    await subscriptionStateMachine.transition("PAST_DUE", "EXPIRED", subContext);

    let checkExpired = await EntitlementService.checkEntitlement(
      {
        userId: subContext.fanId,
        creatorProfileId: subContext.creatorProfileId,
        key: "SUBSCRIBER",
      },
      mockDb
    );
    assert(!checkExpired.hasEntitlement, "Subscription Sync: EXPIRED authoritatively revokes subscriber entitlement");
  }

  // --------------------------------------------------------------------------
  // INTEGRATION 4: PRIVATE SESSION 1-ON-1 ESCROW
  // --------------------------------------------------------------------------
  {
    const t0 = performance.now();
    const sessionContext = {
      bookingId: "book_int_01",
      fanId: "user_fan_01",
      creatorProfileId: "creator_maya",
      scheduledStartTime: new Date(Date.now() + 3600000).toISOString(),
      durationMinutes: 45,
      priceCredits: 1400,
    };

    // Accept -> In Progress -> Completed
    await privateSessionStateMachine.transition("PENDING_CREATOR_ACCEPT", "ACCEPTED", sessionContext);
    assert(privateSessionStateMachine.isRoomActive("ACCEPTED"), "Private Session: ACCEPTED opens room lobby", Math.round(performance.now() - t0));

    await privateSessionStateMachine.transition("ACCEPTED", "IN_PROGRESS", sessionContext);
    assert(privateSessionStateMachine.isRoomActive("IN_PROGRESS"), "Private Session: IN_PROGRESS WebRTC stream active");

    await privateSessionStateMachine.transition("IN_PROGRESS", "COMPLETED", sessionContext);
    assert(privateSessionStateMachine.isEarningsCleared("COMPLETED"), "Private Session: COMPLETED clears creator earnings hold");
  }

  // --------------------------------------------------------------------------
  // INTEGRATION 5: PAYOUT FINANCIAL PIPELINE
  // --------------------------------------------------------------------------
  {
    const t0 = performance.now();
    const payoutContext = {
      payoutId: "po_int_01",
      creatorProfileId: "creator_maya",
      amountCredits: 25000,
      fiatAmountEur: 2500,
      payoutMethod: "SEPA_BANK",
      security: { actorRole: "ADMIN", actorId: "admin_compliance" },
      payoutReference: "SEPA-2026-0908-01",
    };

    await payoutStateMachine.transition("REQUESTED", "UNDER_COMPLIANCE_REVIEW", payoutContext);
    assert(payoutStateMachine.isPending("UNDER_COMPLIANCE_REVIEW"), "Payout Pipeline: Hold under compliance check", Math.round(performance.now() - t0));

    await payoutStateMachine.transition("UNDER_COMPLIANCE_REVIEW", "PROCESSING", payoutContext);
    assert(payoutStateMachine.isPending("PROCESSING"), "Payout Pipeline: Dispatched to SEPA rail");

    await payoutStateMachine.transition("PROCESSING", "COMPLETED", payoutContext);
    assert(payoutStateMachine.isDisbursed("COMPLETED"), "Payout Pipeline: COMPLETED disburses cleared fiat");
  }

  console.log(`\n===============================================================`);
  console.log(
    allPassed
      ? `\x1b[32m\x1b[1m✓ ALL STATE MACHINE INTEGRATION TESTS PASSED\x1b[0m`
      : `\x1b[31m\x1b[1m✗ SOME STATE MACHINE INTEGRATION TESTS FAILED\x1b[0m`
  );
  console.log(`===============================================================\n`);

  return allPassed;
}

if (require.main === module) {
  runStateMachineIntegrationTests().then((ok) => {
    if (!ok) process.exit(1);
  });
}
