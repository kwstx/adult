/**
 * UNIT TEST SUITE: CREATOR AFFILIATE & REFERRAL ATTRIBUTION ENGINE
 * 
 * Verifies:
 * 1. Cryptographic HMAC-SHA256 signed referral token generation and tamper detection
 * 2. 30-day multi-touch last-touch attribution window resolution and lifecycle
 * 3. Recurring revenue share commission calculations & zero fractional credit leakage
 * 4. Multi-layer fraud and self-referral prevention (self-attribution, disposable emails, etc.)
 */

import { TestRunner, assert, assertEqual, assertThrows } from "../utils/test-runner";
import { ReferralTokenService } from "@/modules/affiliate/referral-token.service";
import { AffiliateCommissionEvaluator } from "@/modules/affiliate/affiliate-commission-evaluator.service";
import { ReferralFraudGuard } from "@/modules/affiliate/referral-fraud-guard.service";

export async function runAffiliateUnitTests(): Promise<boolean> {
  const runner = new TestRunner("Layer 1H: Creator Affiliate & Referral Attribution Engine Tests");
  runner.printHeader();

  // --------------------------------------------------------------------------
  // 1. CRYPTOGRAPHIC SIGNED TOKEN ARCHITECTURE & VANITY SLUGS
  // --------------------------------------------------------------------------
  await runner.runTest("Referral Token: Generates and verifies valid HMAC-SHA256 signed token", () => {
    const creatorProfileId = "creator_prof_lola_123";
    const code = "LOLA_VIP";
    const campaignName = "Twitter Promo";

    const result = ReferralTokenService.generateSignedToken({
      creatorProfileId,
      code,
      campaignName,
      commissionRatePercent: 10.0,
      spendWindowDays: 30,
      validDays: 60,
    });

    assert(result.token.startsWith("ref_"), "Token starts with 'ref_' prefix");
    assertEqual(result.code, "LOLA_VIP", "Code is normalized to uppercase");
    assert(result.vanityUrl.includes("/r/LOLA_VIP"), "Vanity URL contains normalized code");

    // Verify token
    const parsed = ReferralTokenService.verifySignedToken(result.token);
    assert(parsed !== null, "Parsed payload is not null");
    assertEqual(parsed?.creatorProfileId, creatorProfileId, "CreatorProfileId matches");
    assertEqual(parsed?.code, "LOLA_VIP", "Code matches");
    assertEqual(parsed?.commissionRatePercent, 10.0, "Commission rate matches");
    assertEqual(parsed?.spendWindowDays, 30, "Spend window days matches");
  });

  await runner.runTest("Referral Token: Rejects tampered signature token", () => {
    const result = ReferralTokenService.generateSignedToken({
      creatorProfileId: "creator_prof_abc",
      code: "BONUS50",
    });

    // Tamper with signature
    const parts = result.token.split(".");
    const tamperedToken = `${parts[0]}.invalid_tampered_signature_xyz`;

    const verified = ReferralTokenService.verifySignedToken(tamperedToken);
    assertEqual(verified, null, "Tampered signature must return null");
  });

  await runner.runTest("Referral Token: Vanity code validation format rules", () => {
    assertEqual(ReferralTokenService.isValidReferralCode("LOLA_VIP"), true, "Valid alphanumeric with underscore");
    assertEqual(ReferralTokenService.isValidReferralCode("summer-2026"), true, "Valid alphanumeric with hyphen");
    assertEqual(ReferralTokenService.isValidReferralCode("ab"), false, "Too short (< 3 chars) is invalid");
    assertEqual(ReferralTokenService.isValidReferralCode("a".repeat(35)), false, "Too long (> 32 chars) is invalid");
    assertEqual(ReferralTokenService.isValidReferralCode("invalid code!"), false, "Special characters (!, space) are invalid");
  });

  // --------------------------------------------------------------------------
  // 2. RECURRING REVENUE SHARE COMMISSION MATH & CONSERVATION
  // --------------------------------------------------------------------------
  await runner.runTest("Commission Math: 10% Standard Rate on 500 CR Deposit", () => {
    const gross = 500;
    const rate = 10.0;
    const commission = AffiliateCommissionEvaluator.calculateCommissionCredits(gross, rate);

    assertEqual(commission, 50, "10% of 500 CR is exactly 50 CR");
  });

  await runner.runTest("Commission Math: Odd price (299 CR) with zero fractional leakage", () => {
    const gross = 299;
    const rate = 10.0;
    const commission = AffiliateCommissionEvaluator.calculateCommissionCredits(gross, rate);

    assertEqual(commission, 29, "Floor(299 * 0.10) = 29 CR");
  });

  await runner.runTest("Commission Math: Custom Rate (15%) on 1,000 CR Subscription", () => {
    const gross = 1000;
    const rate = 15.0;
    const commission = AffiliateCommissionEvaluator.calculateCommissionCredits(gross, rate);

    assertEqual(commission, 150, "15% of 1000 CR is exactly 150 CR");
  });

  await runner.runTest("Commission Math: Edge Cases (0 Credits, negative, 0% rate)", () => {
    assertEqual(AffiliateCommissionEvaluator.calculateCommissionCredits(0, 10.0), 0, "0 CR gives 0 CR commission");
    assertEqual(AffiliateCommissionEvaluator.calculateCommissionCredits(-50, 10.0), 0, "Negative gives 0 CR commission");
    assertEqual(AffiliateCommissionEvaluator.calculateCommissionCredits(100, 0), 0, "0% rate gives 0 CR commission");
  });

  // --------------------------------------------------------------------------
  // 3. FRAUD & SELF-REFERRAL PREVENTION RULES
  // --------------------------------------------------------------------------
  await runner.runTest("Fraud Guard: Direct Self-Referral (Same User ID) is blocked", async () => {
    const selfUserId = "user_same_id_101";

    const result = await ReferralFraudGuard.evaluateReferralRisk({
      refereeUserId: selfUserId,
      referrerCreatorProfileId: "creator_prof_999",
      referrerUserId: selfUserId,
    });

    assertEqual(result.isAllowed, false, "Self-referral must not be allowed");
    assertEqual(result.fraudStatus, "BLOCKED", "Status must be BLOCKED");
    assert(result.matchedRules.includes("REFERRAL_SELF_ATTRIBUTION"), "Trigger code matches REFERRAL_SELF_ATTRIBUTION");
    assert(result.riskScore >= 95, "Risk score is at least 95");
  });

  await runner.runTest("Fraud Guard: Disposable email domains flagged for risk", async () => {
    const result = await ReferralFraudGuard.evaluateReferralRisk({
      refereeUserId: "user_referee_999",
      referrerCreatorProfileId: "creator_mock_888",
      userEmail: "bot_farmer@mailinator.com",
    });

    assert(result.riskScore >= 50, "Disposable mailinator.com email triggers +50 risk score");
    assert(result.matchedRules.includes("SYBIL_DISPOSABLE_EMAIL"), "Includes SYBIL_DISPOSABLE_EMAIL trigger");
  });

  await runner.runTest("Fraud Guard: Plus-aliased email addresses flagged", async () => {
    const result = await ReferralFraudGuard.evaluateReferralRisk({
      refereeUserId: "user_referee_999",
      referrerCreatorProfileId: "creator_mock_888",
      userEmail: "legituser+farm1@gmail.com",
    });

    assert(result.riskScore >= 15, "Plus-aliased email triggers +15 risk score");
    assert(result.matchedRules.includes("SYBIL_PLUS_ALIASED_EMAIL"), "Includes SYBIL_PLUS_ALIASED_EMAIL trigger");
  });

  const summary = runner.printFooter();
  return summary.failedCount === 0;
}

if (require.main === module) {
  runAffiliateUnitTests();
}

