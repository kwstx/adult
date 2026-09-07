/**
 * ============================================================================
 * CREATOR ONBOARDING & BACKEND PERMISSION ENFORCEMENT END-TO-END TEST
 * ============================================================================
 * 
 * Demonstrates and verifies:
 * 1. Step 1: Creator applies (DRAFT)
 * 2. Attempt to sell/earn -> STRICTLY BLOCKED by backend permission guard (403)
 * 3. Step 2: System collects required information (INFORMATION_COLLECTED)
 * 4. Attempt to sell/earn -> STILL BLOCKED (403)
 * 5. Step 3: Identity verification occurs (KYC / Age 18+ verified -> IDENTITY_VERIFIED)
 * 6. Attempt to sell/earn -> STILL BLOCKED (403)
 * 7. Step 4: Consent & 2257 provenance satisfied (CONSENT_PROVENANCE_SATISFIED)
 * 8. Attempt to sell/earn -> STILL BLOCKED (403)
 * 9. Step 5: Platform compliance review (PLATFORM_REVIEWED)
 * 10. Attempt to sell/earn -> STILL BLOCKED (403)
 * 11. Step 6: Payout setup & Tax W-9/W-8BEN completed (PAYOUT_SETUP_COMPLETED)
 * 12. Attempt to sell/earn -> STILL BLOCKED (403)
 * 13. Step 7: Final monetization activation (MONETIZATION_ENABLED)
 * 14. Creator sells item & receives earnings -> AUTHORIZED & CLEARED!
 * 15. Frontend button bypass test: Direct API/Ledger calls with forged requests fail if not verified.
 */

import prisma from "../src/lib/db";
import { CreatorOnboardingService } from "../src/modules/creator-verification/creator-onboarding.service";
import {
  CreatorPermissionsGuard,
  CreatorPermissionDeniedError,
} from "../src/modules/creator-verification/creator-permissions.guard";
import { WalletLedgerService } from "../src/modules/economic/wallet-ledger.service";

let passCount = 0;
let failCount = 0;

function check(condition: boolean, description: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${description}`);
    passCount++;
  } else {
    console.error(`  ❌ [FAIL] ${description}`);
    failCount++;
  }
}

async function runE2E() {
  console.log("====================================================================");
  console.log("END-TO-END VERIFICATION: 7-STEP CREATOR ONBOARDING & PERMISSION GUARDS");
  console.log("====================================================================\n");

  const testId = `e2e_test_${Date.now()}`;
  const fanId = `fan_${testId}`;
  const creatorUserId = `creator_${testId}`;

  try {
    // 0. Setup test fan & initial applicant in database
    console.log("--- Initializing test actors ---");
    const fanUser = await prisma.user.create({
      data: {
        id: fanId,
        username: `fan_${testId}`,
        email: `fan_${testId}@example.com`,
        displayName: "Test Fan Patron",
        role: "FAN",
      },
    });

    const creatorUser = await prisma.user.create({
      data: {
        id: creatorUserId,
        username: `creator_${testId}`,
        email: `creator_${testId}@example.com`,
        displayName: "E2E Test Creator",
        role: "FAN",
        kycStatus: "UNVERIFIED",
      },
    });

    // Give fan 5000 credits to test tipping/purchases
    await WalletLedgerService.getOrCreateWallet(fanId);
    await WalletLedgerService.processDeposit({
      userId: fanId,
      amountFiatCents: 5000,
      currency: "EUR",
      creditsPurchased: 5000,
      gateway: "STRIPE",
      gatewayTransactionId: `gw_deposit_${testId}`,
      idempotencyKey: `dep_${testId}`,
    });

    // ------------------------------------------------------------------------
    // STEP 1: CREATOR APPLIES
    // ------------------------------------------------------------------------
    console.log("\n--- STEP 1: Creator Applies (DRAFT) ---");
    const step1Result = await CreatorOnboardingService.startApplication(creatorUserId, {
      stageName: "Aurora Velvet 💎",
      category: "Interactive Art & Live Shows",
      bio: "Bespoke performances and interactive live streams.",
    });

    const creatorProfileId = step1Result.creatorProfileId;
    check(step1Result.success, "Step 1: Application started successfully");
    check(step1Result.currentState === "DRAFT", "Step 1: Initial state is DRAFT");

    // TEST BACKEND PERMISSION AT STEP 1:
    console.log("  🔒 Testing backend permission guard at Step 1 (DRAFT)...");
    try {
      await CreatorPermissionsGuard.assertCanSell(creatorProfileId, "TEST_SELL");
      check(false, "Should NOT allow selling in DRAFT state");
    } catch (e: any) {
      check(
        e instanceof CreatorPermissionDeniedError && e.statusCode === 403,
        "Backend guard rejected selling with 403 Forbidden in DRAFT state"
      );
    }

    try {
      await WalletLedgerService.processLiveTip({
        fanUserId: fanId,
        creatorProfileId,
        credits: 100,
        customMessage: "Unauthorized tip attempt",
        idempotencyKey: `tip_step1_${testId}`,
      });
      check(false, "Ledger should NOT credit unverified creator in Step 1");
    } catch (e: any) {
      check(
        e instanceof CreatorPermissionDeniedError,
        "Ledger rejected incoming tip because creator is not monetization-enabled"
      );
    }

    // ------------------------------------------------------------------------
    // STEP 2: SYSTEM COLLECTS REQUIRED INFORMATION
    // ------------------------------------------------------------------------
    console.log("\n--- STEP 2: System Collects Required Information ---");
    const step2Result = await CreatorOnboardingService.submitRequiredInformation(
      creatorProfileId,
      {
        stageName: "Aurora Velvet 💎",
        legalFirstName: "Aurora",
        legalLastName: "Vanderbilt",
        category: "Interactive Art & Live Shows",
        countryOfResidence: "US",
        residentialAddress: "742 Evergreen Terrace",
        city: "Springfield",
        postalCode: "97477",
        contactEmail: `aurora_${testId}@creator.test`,
        contactPhone: "+15550199283",
      }
    );

    check(step2Result.success, "Step 2: Information submitted successfully");
    check(
      step2Result.currentState === "INFORMATION_COLLECTED",
      "Step 2: State transitioned to INFORMATION_COLLECTED"
    );

    // TEST BACKEND PERMISSION AT STEP 2:
    console.log("  🔒 Testing backend permission guard at Step 2...");
    try {
      await CreatorPermissionsGuard.assertCanSell(creatorProfileId, "TEST_SELL");
      check(false, "Should NOT allow selling in INFORMATION_COLLECTED state");
    } catch (e: any) {
      check(
        e instanceof CreatorPermissionDeniedError && e.statusCode === 403,
        "Backend guard rejected selling in INFORMATION_COLLECTED state (403)"
      );
    }

    // ------------------------------------------------------------------------
    // STEP 3: IDENTITY VERIFICATION OCCURS (KYC / AGE >= 18)
    // ------------------------------------------------------------------------
    console.log("\n--- STEP 3: Identity Verification (KYC + Age 18+) ---");
    const step3Result = await CreatorOnboardingService.submitIdentityVerification(
      creatorProfileId,
      {
        idType: "PASSPORT",
        idNumber: "P992817462",
        idDocumentFrontUrl: "https://vault.platform.local/secure/docs/passport_front.enc",
        selfieWithIdUrl: "https://vault.platform.local/secure/docs/selfie_liveness.enc",
        dateOfBirth: "1998-05-14", // 28 years old (>= 18)
        issuingCountry: "US",
        livenessConfidenceScore: 0.99,
      }
    );

    check(step3Result.success, "Step 3: Identity verification submitted successfully");
    check(
      step3Result.currentState === "IDENTITY_VERIFIED",
      "Step 3: State transitioned to IDENTITY_VERIFIED"
    );

    // TEST BACKEND PERMISSION AT STEP 3:
    console.log("  🔒 Testing backend permission guard at Step 3...");
    try {
      await CreatorPermissionsGuard.assertCanSell(creatorProfileId, "TEST_SELL");
      check(false, "Should NOT allow selling in IDENTITY_VERIFIED state");
    } catch (e: any) {
      check(
        e instanceof CreatorPermissionDeniedError && e.statusCode === 403,
        "Backend guard rejected selling in IDENTITY_VERIFIED state (403)"
      );
    }

    // ------------------------------------------------------------------------
    // STEP 4: CONSENT / 2257 PROVENANCE REQUIREMENTS SATISFIED
    // ------------------------------------------------------------------------
    console.log("\n--- STEP 4: Consent & Provenance Requirements Satisfied (18 U.S.C. § 2257) ---");
    const step4Result = await CreatorOnboardingService.satisfyConsentAndProvenance(
      creatorProfileId,
      {
        statutory2257Acknowledged: true,
        legalFullNameSignature: "Aurora Vanderbilt",
        signatureTimestamp: new Date().toISOString(),
        primaryCustodianName: "Aurora Vanderbilt Records Custody",
        primaryCustodianAddress: "742 Evergreen Terrace, Springfield, OR 97477",
        secondaryCustodianName: "Platform Legal Compliance Vault",
        secondaryCustodianAddress: "100 Compliance Way, Suite 400, Wilmington, DE",
        performerConsentAgreementSigned: true,
        allowsThirdPartyCollaborators: false,
        provenanceAttestation: {
          soleCopyrightHolder: true,
          allPerformersAge18Plus: true,
          noNonConsensualMedia: true,
          noProhibitedContentCategories: true,
        },
      }
    );

    check(step4Result.success, "Step 4: Consent and 2257 provenance submitted");
    check(
      step4Result.currentState === "CONSENT_PROVENANCE_SATISFIED",
      "Step 4: State transitioned to CONSENT_PROVENANCE_SATISFIED"
    );

    // TEST BACKEND PERMISSION AT STEP 4:
    console.log("  🔒 Testing backend permission guard at Step 4...");
    try {
      await CreatorPermissionsGuard.assertCanSell(creatorProfileId, "TEST_SELL");
      check(false, "Should NOT allow selling in CONSENT_PROVENANCE_SATISFIED state");
    } catch (e: any) {
      check(
        e instanceof CreatorPermissionDeniedError && e.statusCode === 403,
        "Backend guard rejected selling in CONSENT_PROVENANCE_SATISFIED state (403)"
      );
    }

    // ------------------------------------------------------------------------
    // STEP 5: THE PLATFORM REVIEWS THE CREATOR
    // ------------------------------------------------------------------------
    console.log("\n--- STEP 5: The Platform Reviews the Creator (Compliance Review) ---");
    const step5Result = await CreatorOnboardingService.reviewCreatorApplication(
      creatorProfileId,
      {
        reviewerId: "compliance_officer_sarah",
        decision: "APPROVED",
        complianceNotes: "Government passport verified, facial liveness matches, 2257 records valid, sanctions clear.",
        riskScore: 2,
        sanctionsCheckPassed: true,
        pepCheckPassed: true,
      },
      { actorId: "compliance_officer_sarah", actorRole: "ADMIN" }
    );

    check(step5Result.success, "Step 5: Platform review completed and approved");
    check(
      step5Result.currentState === "PLATFORM_REVIEWED",
      "Step 5: State transitioned to PLATFORM_REVIEWED"
    );

    // TEST BACKEND PERMISSION AT STEP 5:
    console.log("  🔒 Testing backend permission guard at Step 5...");
    try {
      await CreatorPermissionsGuard.assertCanSell(creatorProfileId, "TEST_SELL");
      check(false, "Should NOT allow selling in PLATFORM_REVIEWED state (payout not setup)");
    } catch (e: any) {
      check(
        e instanceof CreatorPermissionDeniedError && e.statusCode === 403,
        "Backend guard rejected selling in PLATFORM_REVIEWED state (403)"
      );
    }

    // ------------------------------------------------------------------------
    // STEP 6: PAYMENT / PAYOUT SETUP IS COMPLETED
    // ------------------------------------------------------------------------
    console.log("\n--- STEP 6: Payment / Payout Setup is Completed ---");
    const step6Result = await CreatorOnboardingService.setupPayoutAndTax(
      creatorProfileId,
      {
        payoutMethod: "PAXUM",
        beneficiaryName: "Aurora Vanderbilt",
        currency: "EUR",
        beneficiaryAccountData: {
          paxumEmail: `payout_aurora_${testId}@paxum.test`,
        },
        taxFormType: "W9",
        taxIdNumberOrSSN: "XXX-XX-4829",
        taxCertificationConfirmed: true,
        taxSignatureName: "Aurora Vanderbilt",
        taxSignatureDate: new Date().toISOString(),
      }
    );

    check(step6Result.success, "Step 6: Payout setup & tax form certified");
    check(
      step6Result.currentState === "PAYOUT_SETUP_COMPLETED",
      "Step 6: State transitioned to PAYOUT_SETUP_COMPLETED"
    );

    // TEST BACKEND PERMISSION AT STEP 6:
    console.log("  🔒 Testing backend permission guard at Step 6...");
    try {
      await CreatorPermissionsGuard.assertCanSell(creatorProfileId, "TEST_SELL");
      check(false, "Should NOT allow selling before final monetization activation");
    } catch (e: any) {
      check(
        e instanceof CreatorPermissionDeniedError && e.statusCode === 403,
        "Backend guard rejected selling in PAYOUT_SETUP_COMPLETED state (403)"
      );
    }

    // ------------------------------------------------------------------------
    // STEP 7: THE CREATOR BECOMES MONETIZATION-ENABLED
    // ------------------------------------------------------------------------
    console.log("\n--- STEP 7: Creator Becomes Monetization-Enabled ---");
    const step7Result = await CreatorOnboardingService.enableMonetization(
      creatorProfileId,
      {
        activationNotes: "Creator fully cleared through 7-step onboarding state machine.",
        agreedToTermsVersion: "v2.4",
      }
    );

    check(step7Result.success, "Step 7: Monetization enabled successfully");
    check(
      step7Result.currentState === "MONETIZATION_ENABLED",
      "Step 7: State is now MONETIZATION_ENABLED"
    );
    check(step7Result.permissions.canSell === true, "Step 7: canSell permission unlocked");
    check(
      step7Result.permissions.canReceiveEarnings === true,
      "Step 7: canReceiveEarnings permission unlocked"
    );

    // ------------------------------------------------------------------------
    // AUTHORITATIVE BACKEND PERMISSION VERIFICATION: ONLY THEN CAN THEY SELL OR EARN
    // ------------------------------------------------------------------------
    console.log("\n--- Authoritative Backend Permission Verification (Post-Enablement) ---");

    // 1. Permission Guard Check
    const guardAuth = await CreatorPermissionsGuard.assertCanSell(creatorProfileId, "SELL_ITEM");
    check(guardAuth.authorized === true, "CreatorPermissionsGuard.assertCanSell passed");

    // 2. Financial Ledger Live Tip Execution Check
    const tipResult = await WalletLedgerService.processLiveTip({
      fanUserId: fanId,
      creatorProfileId,
      credits: 250,
      customMessage: "Congrats on becoming verified!",
      idempotencyKey: `tip_verified_${testId}`,
    });

    check(tipResult.success, "Fan tip of 250 credits processed successfully by Ledger");
    check(tipResult.amountCredits === 250, "Ledger deducted 250 credits from fan");
    check(tipResult.creatorNetCredits === 200, "Creator received 200 net credits (after 20% rake)");

    // 3. Status Reporting & Progress Inspection Check
    const progress = await CreatorOnboardingService.getOnboardingProgress(creatorProfileId);
    check(progress.isMonetizationEnabled === true, "getOnboardingProgress reflects isMonetizationEnabled: true");
    check(progress.completionPercentage === 100, "Completion percentage is 100%");
    check(progress.blockers.length === 0, "No remaining compliance blockers");

    // ------------------------------------------------------------------------
    // CLEANUP TEST ENTITIES
    // ------------------------------------------------------------------------
    console.log("\n--- Cleaning up test records ---");
    await prisma.walletTransaction.deleteMany({ where: { destinationWalletId: { in: [fanId, creatorUserId] } } });
    await prisma.creatorEarning.deleteMany({ where: { creatorProfileId } });
    await prisma.creatorVerification.deleteMany({ where: { creatorProfileId } });
    await prisma.ageAssuranceRecord.deleteMany({ where: { userId: creatorUserId } });
    await prisma.creatorProfile.delete({ where: { id: creatorProfileId } });
    await prisma.wallet.deleteMany({ where: { userId: { in: [fanId, creatorUserId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [fanId, creatorUserId] } } });
    console.log("  Cleaned up test data.");

  } catch (error: any) {
    console.error("E2E Test Failure:", error);
    failCount++;
  }

  console.log("\n====================================================================");
  console.log(`E2E TEST SUMMARY: ${passCount} Passed, ${failCount} Failed`);
  console.log("====================================================================");

  if (failCount > 0) {
    process.exit(1);
  }
}

runE2E().catch((err) => {
  console.error("Fatal E2E runner error:", err);
  process.exit(1);
});
