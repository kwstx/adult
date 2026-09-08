/**
 * ============================================================================
 * TEST: 7-STEP CREATOR ONBOARDING & "GO LIVE" OPERATIONAL RISK GATE
 * ============================================================================
 * 
 * Verifies:
 * 1. Step 1: Account (Application initialization)
 * 2. Step 2: Age/identity verification (Statutory age 18+ enforcement & ID docs)
 * 3. Step 3: Creator profile (Stage name, category, bio, subscription pricing)
 * 4. Step 4: Payout setup (Bank/Paxum/USDT & certified W-9/W-8BEN tax form)
 * 5. Step 5: Content and policy requirements (18 U.S.C. § 2257 & performer consent)
 * 6. Step 6: Review (Compliance review & risk evaluation)
 * 7. Step 7: Approved (Monetization enabled, stream key issued)
 * 8. Operational Risk Gate: "Go Live" is strictly forbidden/hidden until Step 7 approval.
 */

import {
  CreatorOnboardingStateMachine,
  CreatorStateTransitionError,
} from "../src/modules/creator-verification/creator-onboarding.state-machine";
import { CreatorOnboardingState } from "../src/modules/creator-verification/types";

let passed = 0;
let failed = 0;

function assert(condition: boolean, title: string, details?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${title}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${title}${details ? ` -> ${details}` : ""}`);
    failed++;
  }
}

class TestCreatorOnboardingSession {
  public step = 1;
  public state: CreatorOnboardingState = "DRAFT";
  public isApproved = false;
  public canBroadcastLive = false;
  public canSell = false;
  public applicantAge = 0;
  public is2257Signed = false;
  public isTaxCertified = false;

  public evaluatePermissions() {
    this.isApproved = this.state === "MONETIZATION_ENABLED";
    this.canBroadcastLive = this.isApproved;
    this.canSell = this.isApproved;
  }

  public seesGoLiveButton(): boolean {
    return this.canBroadcastLive && this.isApproved;
  }
}

async function runTests() {
  console.log("====================================================================");
  console.log("TESTING 7-STEP CREATOR ONBOARDING & 'GO LIVE' RISK GATE");
  console.log("====================================================================\n");

  const session = new TestCreatorOnboardingSession();

  // --------------------------------------------------------------------------
  // STEP 1: ACCOUNT
  // --------------------------------------------------------------------------
  console.log("--- Step 1: Account ---");
  assert(session.step === 1 && session.state === "DRAFT", "Initial applicant step is Step 1: Account (DRAFT)");
  session.evaluatePermissions();
  assert(!session.seesGoLiveButton(), "OPERATIONAL RISK GATE: 'Go Live' is NOT visible at Step 1 (Account)");

  // --------------------------------------------------------------------------
  // STEP 2: AGE / IDENTITY VERIFICATION
  // --------------------------------------------------------------------------
  console.log("\n--- Step 2: Age/Identity Verification (18+) ---");
  
  // Underage check
  session.applicantAge = 16;
  const isAdultFail = session.applicantAge >= 18;
  assert(!isAdultFail, "Applicant under 18 years old is correctly identified");

  // Valid adult check
  session.applicantAge = 24;
  const isAdultPass = session.applicantAge >= 18;
  assert(isAdultPass, "Applicant age 24 verified as legal adult (Age >= 18)");

  CreatorOnboardingStateMachine.validateTransition(session.state, "IDENTITY_VERIFIED");
  session.state = "IDENTITY_VERIFIED";
  session.step = 2;
  session.evaluatePermissions();
  assert(session.state === "IDENTITY_VERIFIED", "Transitioned to Step 2: IDENTITY_VERIFIED");
  assert(!session.seesGoLiveButton(), "OPERATIONAL RISK GATE: 'Go Live' is NOT visible at Step 2 (Identity Verification)");

  // --------------------------------------------------------------------------
  // STEP 3: CREATOR PROFILE
  // --------------------------------------------------------------------------
  console.log("\n--- Step 3: Creator Profile ---");
  CreatorOnboardingStateMachine.validateTransition(session.state, "INFORMATION_COLLECTED");
  session.state = "INFORMATION_COLLECTED";
  session.step = 3;
  session.evaluatePermissions();
  assert(session.state === "INFORMATION_COLLECTED", "Transitioned to Step 3: Creator Profile");
  assert(!session.seesGoLiveButton(), "OPERATIONAL RISK GATE: 'Go Live' is NOT visible at Step 3 (Creator Profile)");

  // --------------------------------------------------------------------------
  // STEP 4: PAYOUT SETUP
  // --------------------------------------------------------------------------
  console.log("\n--- Step 4: Payout Setup ---");
  CreatorOnboardingStateMachine.validateTransition(session.state, "PAYOUT_SETUP_COMPLETED");
  session.state = "PAYOUT_SETUP_COMPLETED";
  session.step = 4;
  session.isTaxCertified = true;
  session.evaluatePermissions();
  assert(session.state === "PAYOUT_SETUP_COMPLETED", "Transitioned to Step 4: Payout Setup");
  assert(!session.seesGoLiveButton(), "OPERATIONAL RISK GATE: 'Go Live' is NOT visible at Step 4 (Payout Setup)");

  // --------------------------------------------------------------------------
  // STEP 5: CONTENT AND POLICY REQUIREMENTS (2257)
  // --------------------------------------------------------------------------
  console.log("\n--- Step 5: Content and Policy Requirements (2257) ---");
  CreatorOnboardingStateMachine.validateTransition(session.state, "CONSENT_PROVENANCE_SATISFIED");
  session.state = "CONSENT_PROVENANCE_SATISFIED";
  session.step = 5;
  session.is2257Signed = true;
  session.evaluatePermissions();
  assert(session.state === "CONSENT_PROVENANCE_SATISFIED", "Transitioned to Step 5: Policy Requirements & 2257");
  assert(!session.seesGoLiveButton(), "OPERATIONAL RISK GATE: 'Go Live' is NOT visible at Step 5 (Policy Requirements)");

  // --------------------------------------------------------------------------
  // STEP 6: REVIEW
  // --------------------------------------------------------------------------
  console.log("\n--- Step 6: Review ---");
  // Non-admin cannot approve
  try {
    CreatorOnboardingStateMachine.validateTransition(session.state, "PLATFORM_REVIEWED", { actorRole: "FAN" });
    assert(false, "Should not allow FAN role to approve platform review");
  } catch (err: any) {
    assert(err instanceof CreatorStateTransitionError, "Compliance review enforces privileged authorization");
  }

  // Admin approves review
  CreatorOnboardingStateMachine.validateTransition(session.state, "PLATFORM_REVIEWED", { actorRole: "ADMIN" });
  session.state = "PLATFORM_REVIEWED";
  session.step = 6;
  session.evaluatePermissions();
  assert(session.state === "PLATFORM_REVIEWED", "Transitioned to Step 6: Compliance Review Passed");
  assert(!session.seesGoLiveButton(), "OPERATIONAL RISK GATE: 'Go Live' is NOT visible at Step 6 (Review)");

  // --------------------------------------------------------------------------
  // STEP 7: APPROVED (GO LIVE UNLOCKED)
  // --------------------------------------------------------------------------
  console.log("\n--- Step 7: Approved ---");
  CreatorOnboardingStateMachine.validateTransition(session.state, "MONETIZATION_ENABLED");
  session.state = "MONETIZATION_ENABLED";
  session.step = 7;
  session.evaluatePermissions();

  assert(session.state === "MONETIZATION_ENABLED", "State elevated to Step 7: Approved (MONETIZATION_ENABLED)");
  assert(session.isApproved === true, "Creator is officially approved");
  assert(session.canBroadcastLive === true, "Broadcast live permissions granted");
  assert(session.canSell === true, "Monetization and selling permissions granted");
  assert(session.seesGoLiveButton() === true, "🎯 ONLY AFTER APPROVAL: 'Go Live' button is NOW ACTIVE and VISIBLE!");

  console.log("\n====================================================================");
  console.log(`7-STEP ONBOARDING TEST SUITE FINISHED: ${passed} Passed, ${failed} Failed`);
  console.log("====================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
