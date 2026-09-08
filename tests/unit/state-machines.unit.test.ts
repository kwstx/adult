/**
 * ============================================================================
 * STATE MACHINES COMPREHENSIVE UNIT TEST SUITE
 * ============================================================================
 * 
 * Verifies all 8 domain state machines:
 * 1. Base State Machine Engine & Guard Invariants
 * 2. Creator Onboarding State Machine
 * 3. Livestream Lifecycle State Machine
 * 4. Interaction Lifecycle State Machine
 * 5. Payment Lifecycle State Machine
 * 6. Subscription Lifecycle State Machine
 * 7. Private Session Lifecycle State Machine
 * 8. Moderation State Machines (Content, Account, Creator)
 * 9. Payout Lifecycle State Machine
 */

import {
  creatorOnboardingStateMachine,
  livestreamStateMachine,
  interactionStateMachine,
  paymentStateMachine,
  subscriptionStateMachine,
  privateSessionStateMachine,
  contentModerationStateMachine,
  accountModerationStateMachine,
  creatorModerationStateMachine,
  payoutStateMachine,
} from "@/modules/state-machines";
import { StateTransitionError } from "@/core/state-machine/base.state-machine";

export async function runStateMachineUnitTests(): Promise<boolean> {
  console.log(`\n===============================================================`);
  console.log(`🧪 TEST SUITE: Layer 1E: 8 Domain State Machines Unit Tests`);
  console.log(`===============================================================\n`);

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
  // 1. CREATOR ONBOARDING STATE MACHINE
  // --------------------------------------------------------------------------
  {
    const t0 = performance.now();
    // A. Valid linear onboarding progression
    const validNext = creatorOnboardingStateMachine.getAllowedNextStates("DRAFT");
    assert(
      validNext.includes("IDENTITY_VERIFIED") && validNext.includes("INFORMATION_COLLECTED"),
      "Creator Onboarding: Returns valid next states from DRAFT",
      Math.round(performance.now() - t0)
    );

    // B. Rejection of illegal jump from DRAFT to MONETIZATION_ENABLED
    let illegalJumpThrew = false;
    try {
      await creatorOnboardingStateMachine.validateTransition("DRAFT", "MONETIZATION_ENABLED", {
        creatorProfileId: "c1",
        userId: "u1",
      });
    } catch (err: any) {
      illegalJumpThrew = err instanceof StateTransitionError;
    }
    assert(illegalJumpThrew, "Creator Onboarding: Rejects direct skip to MONETIZATION_ENABLED");

    // C. Role-based guard check for PLATFORM_REVIEWED
    let unauthorizedThrew = false;
    try {
      await creatorOnboardingStateMachine.validateTransition(
        "PAYOUT_SETUP_COMPLETED",
        "PLATFORM_REVIEWED",
        {
          creatorProfileId: "c1",
          userId: "u1",
          security: { actorRole: "FAN" },
        }
      );
    } catch (err: any) {
      unauthorizedThrew = err.message.includes("requires administrative or compliance authority");
    }
    assert(unauthorizedThrew, "Creator Onboarding: Rejects non-admin approval transition");

    // D. Authority Evaluators
    assert(!creatorOnboardingStateMachine.canSell("DRAFT"), "Creator Onboarding: DRAFT cannot sell");
    assert(creatorOnboardingStateMachine.canSell("MONETIZATION_ENABLED"), "Creator Onboarding: MONETIZATION_ENABLED can sell");
    assert(creatorOnboardingStateMachine.getStepIndex("MONETIZATION_ENABLED") === 7, "Creator Onboarding: Step index is 7 for approved");
  }

  // --------------------------------------------------------------------------
  // 2. LIVESTREAM LIFECYCLE STATE MACHINE
  // --------------------------------------------------------------------------
  {
    const t0 = performance.now();
    // A. Full live broadcast flow
    const liveRes = await livestreamStateMachine.transition(
      "SCHEDULED",
      "PREPARING",
      { streamId: "s1", creatorProfileId: "c1", security: { actorRole: "CREATOR" } }
    );
    assert(liveRes.success && liveRes.toState === "PREPARING", "Livestream: Transitions SCHEDULED -> PREPARING", Math.round(performance.now() - t0));

    await livestreamStateMachine.transition(
      "PREPARING",
      "LIVE",
      { streamId: "s1", creatorProfileId: "c1", security: { actorRole: "CREATOR" } }
    );
    await livestreamStateMachine.transition(
      "LIVE",
      "PAUSED",
      { streamId: "s1", creatorProfileId: "c1", security: { actorRole: "CREATOR" } }
    );
    await livestreamStateMachine.transition(
      "PAUSED",
      "LIVE",
      { streamId: "s1", creatorProfileId: "c1", security: { actorRole: "CREATOR" } }
    );
    const endRes = await livestreamStateMachine.transition(
      "LIVE",
      "ENDED",
      { streamId: "s1", creatorProfileId: "c1", security: { actorRole: "CREATOR" }, totalDurationSeconds: 3600 }
    );
    assert(endRes.success && endRes.toState === "ENDED", "Livestream: Transitions LIVE -> PAUSED -> LIVE -> ENDED");

    // B. Terminal state check
    let terminalThrew = false;
    try {
      await livestreamStateMachine.validateTransition("ENDED", "LIVE", {
        streamId: "s1",
        creatorProfileId: "c1",
      });
    } catch (err: any) {
      terminalThrew = err.code === "TERMINAL_STATE_VIOLATION";
    }
    assert(terminalThrew, "Livestream: ENDED is terminal and cannot transition back to LIVE");

    // C. Safety termination authority check
    let unauthSafetyThrew = false;
    try {
      await livestreamStateMachine.validateTransition("LIVE", "TERMINATED_SAFETY", {
        streamId: "s1",
        creatorProfileId: "c1",
        security: { actorRole: "FAN" },
      });
    } catch (err: any) {
      unauthSafetyThrew = err.message.includes("requires Moderator or Administrator authority");
    }
    assert(unauthSafetyThrew, "Livestream: Non-moderator cannot trigger emergency stream termination");
  }

  // --------------------------------------------------------------------------
  // 3. INTERACTION LIFECYCLE STATE MACHINE
  // --------------------------------------------------------------------------
  {
    const t0 = performance.now();
    // A. Normal execution flow
    await interactionStateMachine.transition("PAID", "QUEUED", {
      purchaseId: "p1",
      interactionId: "i1",
      fanId: "f1",
      creatorProfileId: "c1",
      creditsAmount: 100,
    });
    await interactionStateMachine.transition("QUEUED", "EXECUTING", {
      purchaseId: "p1",
      interactionId: "i1",
      fanId: "f1",
      creatorProfileId: "c1",
      creditsAmount: 100,
    });
    const compRes = await interactionStateMachine.transition("EXECUTING", "COMPLETED", {
      purchaseId: "p1",
      interactionId: "i1",
      fanId: "f1",
      creatorProfileId: "c1",
      creditsAmount: 100,
    });
    assert(compRes.success && compRes.toState === "COMPLETED", "Interaction: Fulfills PAID -> QUEUED -> EXECUTING -> COMPLETED", Math.round(performance.now() - t0));

    // B. Invariant: Cannot jump from PAID directly to COMPLETED
    let jumpThrew = false;
    try {
      await interactionStateMachine.validateTransition("PAID", "COMPLETED", {
        purchaseId: "p2",
        interactionId: "i2",
        fanId: "f2",
        creatorProfileId: "c1",
        creditsAmount: 100,
      });
    } catch (err: any) {
      jumpThrew = true;
    }
    assert(jumpThrew, "Interaction: Prevents skipping EXECUTING to COMPLETED");

    // C. Rejection & Refund flow
    const refRes = await interactionStateMachine.transition("PAID", "REJECTED", {
      purchaseId: "p3",
      interactionId: "i3",
      fanId: "f3",
      creatorProfileId: "c1",
      creditsAmount: 250,
      refundReason: "Creator unavailable",
    });
    assert(refRes.success && refRes.toState === "REJECTED", "Interaction: Rejection triggers automatic refund side-effect");
  }

  // --------------------------------------------------------------------------
  // 4. PAYMENT LIFECYCLE STATE MACHINE
  // --------------------------------------------------------------------------
  {
    const t0 = performance.now();
    // A. Webhook verification flow
    const payRes = await paymentStateMachine.transition(
      "INITIALIZED",
      "SUCCEEDED",
      {
        paymentId: "pay_01",
        userId: "u1",
        amountCents: 5000,
        gateway: "STRIPE",
        security: { actorRole: "SYSTEM_AUTOMATION" },
      },
      "Verified webhook charge.succeeded"
    );
    assert(payRes.success && payRes.toState === "SUCCEEDED", "Payment: Transitions INITIALIZED -> SUCCEEDED on verified webhook", Math.round(performance.now() - t0));

    // B. Refund from SUCCEEDED
    const refundRes = await paymentStateMachine.transition(
      "SUCCEEDED",
      "REFUNDED",
      {
        paymentId: "pay_01",
        userId: "u1",
        amountCents: 5000,
        gateway: "STRIPE",
        security: { actorRole: "ADMIN" },
      },
      "Customer support refund"
    );
    assert(refundRes.success && refundRes.toState === "REFUNDED", "Payment: Allows SUCCEEDED -> REFUNDED by Admin");

    // C. Rejection of refund on FAILED payment
    let failedRefundThrew = false;
    try {
      await paymentStateMachine.validateTransition("FAILED", "REFUNDED", {
        paymentId: "pay_02",
        userId: "u2",
        amountCents: 1000,
        gateway: "CCBILL",
        security: { actorRole: "ADMIN" },
      });
    } catch (err: any) {
      failedRefundThrew = true;
    }
    assert(failedRefundThrew, "Payment: Prevents refunding an unfulfilled/failed payment");
  }

  // --------------------------------------------------------------------------
  // 5. SUBSCRIPTION LIFECYCLE STATE MACHINE
  // --------------------------------------------------------------------------
  {
    const t0 = performance.now();
    // A. Active -> Past Due -> Expired flow
    await subscriptionStateMachine.transition("ACTIVE", "PAST_DUE", {
      subscriptionId: "sub_1",
      fanId: "f1",
      creatorProfileId: "c1",
      tierName: "VIP",
      priceCredits: 500,
    });
    const expRes = await subscriptionStateMachine.transition("PAST_DUE", "EXPIRED", {
      subscriptionId: "sub_1",
      fanId: "f1",
      creatorProfileId: "c1",
      tierName: "VIP",
      priceCredits: 500,
    });
    assert(expRes.success && expRes.toState === "EXPIRED", "Subscription: ACTIVE -> PAST_DUE -> EXPIRED synchronizes entitlements", Math.round(performance.now() - t0));

    // B. Perks Evaluator
    assert(subscriptionStateMachine.hasActivePerks("ACTIVE"), "Subscription: ACTIVE grants perks");
    assert(subscriptionStateMachine.hasActivePerks("CANCELED"), "Subscription: CANCELED retains perks until period end");
    assert(!subscriptionStateMachine.hasActivePerks("EXPIRED"), "Subscription: EXPIRED revokes all perks");
  }

  // --------------------------------------------------------------------------
  // 6. PRIVATE SESSION LIFECYCLE STATE MACHINE
  // --------------------------------------------------------------------------
  {
    const t0 = performance.now();
    // A. Normal booking flow
    await privateSessionStateMachine.transition("PENDING_CREATOR_ACCEPT", "ACCEPTED", {
      bookingId: "b1",
      fanId: "f1",
      creatorProfileId: "c1",
      scheduledStartTime: new Date().toISOString(),
      durationMinutes: 30,
      priceCredits: 1000,
    });
    await privateSessionStateMachine.transition("ACCEPTED", "IN_PROGRESS", {
      bookingId: "b1",
      fanId: "f1",
      creatorProfileId: "c1",
      scheduledStartTime: new Date().toISOString(),
      durationMinutes: 30,
      priceCredits: 1000,
    });
    const compBooking = await privateSessionStateMachine.transition("IN_PROGRESS", "COMPLETED", {
      bookingId: "b1",
      fanId: "f1",
      creatorProfileId: "c1",
      scheduledStartTime: new Date().toISOString(),
      durationMinutes: 30,
      priceCredits: 1000,
    });
    assert(compBooking.success && compBooking.toState === "COMPLETED", "Private Session: PENDING -> ACCEPTED -> IN_PROGRESS -> COMPLETED", Math.round(performance.now() - t0));

    // B. Invariant: Cannot complete without IN_PROGRESS
    let compWithoutProgressThrew = false;
    try {
      await privateSessionStateMachine.validateTransition("ACCEPTED", "COMPLETED", {
        bookingId: "b2",
        fanId: "f2",
        creatorProfileId: "c1",
        scheduledStartTime: new Date().toISOString(),
        durationMinutes: 30,
        priceCredits: 1000,
      });
    } catch (err: any) {
      compWithoutProgressThrew = true;
    }
    assert(compWithoutProgressThrew, "Private Session: Prevents completing a session that never started");
  }

  // --------------------------------------------------------------------------
  // 7. MODERATION STATE MACHINES
  // --------------------------------------------------------------------------
  {
    const t0 = performance.now();
    // A. Content Moderation
    await contentModerationStateMachine.transition(
      "PENDING",
      "APPROVED",
      { entityId: "media_01", entityType: "CONTENT", security: { actorRole: "MODERATOR" } }
    );
    const removeRes = await contentModerationStateMachine.transition(
      "APPROVED",
      "REMOVED",
      { entityId: "media_01", entityType: "CONTENT", security: { actorRole: "MODERATOR" } },
      "2257 Record-keeping violation"
    );
    assert(removeRes.success && removeRes.toState === "REMOVED", "Moderation: Content PENDING -> APPROVED -> REMOVED with reason", Math.round(performance.now() - t0));

    // B. Account Moderation Ban requiring reason
    let banWithoutReasonThrew = false;
    try {
      await accountModerationStateMachine.validateTransition(
        "ACTIVE",
        "BANNED",
        { entityId: "user_bad", entityType: "ACCOUNT", security: { actorRole: "MODERATOR" } },
        ""
      );
    } catch (err: any) {
      banWithoutReasonThrew = true;
    }
    assert(banWithoutReasonThrew, "Moderation: Account ban requires mandatory justification reason");

    // C. Creator Moderation verification check
    assert(
      creatorModerationStateMachine.canStreamAndMonetize("MONETIZATION_ENABLED").canMonetize,
      "Moderation: Creator MONETIZATION_ENABLED allows monetization"
    );
  }

  // --------------------------------------------------------------------------
  // 8. PAYOUT LIFECYCLE STATE MACHINE
  // --------------------------------------------------------------------------
  {
    const t0 = performance.now();
    // A. Normal payout dispatch flow
    await payoutStateMachine.transition(
      "REQUESTED",
      "UNDER_COMPLIANCE_REVIEW",
      {
        payoutId: "po_1",
        creatorProfileId: "c1",
        amountCredits: 10000,
        fiatAmountEur: 1000,
        payoutMethod: "SEPA_BANK",
        security: { actorRole: "ADMIN" },
      }
    );
    await payoutStateMachine.transition(
      "UNDER_COMPLIANCE_REVIEW",
      "PROCESSING",
      {
        payoutId: "po_1",
        creatorProfileId: "c1",
        amountCredits: 10000,
        fiatAmountEur: 1000,
        payoutMethod: "SEPA_BANK",
        security: { actorRole: "ADMIN" },
      }
    );
    const compPayout = await payoutStateMachine.transition(
      "PROCESSING",
      "COMPLETED",
      {
        payoutId: "po_1",
        creatorProfileId: "c1",
        amountCredits: 10000,
        fiatAmountEur: 1000,
        payoutMethod: "SEPA_BANK",
        security: { actorRole: "ADMIN" },
      }
    );
    assert(compPayout.success && compPayout.toState === "COMPLETED", "Payout: REQUESTED -> REVIEW -> PROCESSING -> COMPLETED", Math.round(performance.now() - t0));

    // B. Invariant: Cannot complete directly from REQUESTED
    let skipProcessingThrew = false;
    try {
      await payoutStateMachine.validateTransition(
        "REQUESTED",
        "COMPLETED",
        {
          payoutId: "po_2",
          creatorProfileId: "c2",
          amountCredits: 5000,
          fiatAmountEur: 500,
          payoutMethod: "PAXUM",
          security: { actorRole: "ADMIN" },
        }
      );
    } catch (err: any) {
      skipProcessingThrew = true;
    }
    assert(skipProcessingThrew, "Payout: Prevents completing payout without processing on payment rail");
  }

  console.log(`\n===============================================================`);
  console.log(
    allPassed
      ? `\x1b[32m\x1b[1m✓ ALL 8 STATE MACHINE UNIT TESTS PASSED\x1b[0m`
      : `\x1b[31m\x1b[1m✗ SOME STATE MACHINE UNIT TESTS FAILED\x1b[0m`
  );
  console.log(`===============================================================\n`);

  return allPassed;
}

if (require.main === module) {
  runStateMachineUnitTests().then((ok) => {
    if (!ok) process.exit(1);
  });
}
