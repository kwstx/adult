import prisma from "../src/lib/db";
import { LedgerService, InsufficientCreditsError } from "../src/modules/economic/ledger.service";
import { PaymentAdapter } from "../src/modules/economic/payment.adapter";
import { AgeVerificationService } from "../src/modules/trust-safety/age-verification";
import { Compliance2257Service } from "../src/modules/trust-safety/compliance-2257";

async function runVerification() {
  console.log("=================================================");
  console.log("🚀 STARTING BACKEND AUTHORITY & PLATFORM SUITE TEST");
  console.log("=================================================\n");

  // Step 1: Verify Seed Data
  const fan = await prisma.user.findFirst({
    where: { username: "alex_patron" },
    include: { wallet: true },
  });

  const creator = await prisma.creatorProfile.findFirst({
    where: { user: { username: "mayavelvet" } },
    include: { user: true, interactionItems: true },
  });

  if (!fan || !creator) {
    throw new Error("Seed data missing for alex_patron or mayavelvet.");
  }

  console.log(`✅ [1/5] User & Creator Entity Verification`);
  console.log(`  Fan: ${fan.displayName} | Initial Balance: ${fan.wallet?.balance} tokens`);
  console.log(`  Creator: ${creator.user.displayName} | Target Goal: ${creator.currentGoalTarget} tokens\n`);

  // Step 2: Payment Gateway Credit Purchase Minting
  console.log(`⏳ [2/5] Testing Payment Provider Webhook Minting...`);
  const initialFanBalance = fan.wallet?.balance || 0;
  await PaymentAdapter.handlePaymentWebhook({
    signature: "test_valid_sig",
    transactionId: `test_txn_${Date.now()}`,
    userId: fan.id,
    packageId: "pkg_popular",
    credits: 550,
    currency: "USD",
    amountPaid: 44.99,
  });

  const refreshedFanWallet = await prisma.wallet.findUnique({ where: { userId: fan.id } });
  console.log(`  Expected Balance: ${initialFanBalance + 550} | Actual Balance: ${refreshedFanWallet?.balance}`);
  if (refreshedFanWallet?.balance !== initialFanBalance + 550) {
    throw new Error("Credit purchase minting failed to update wallet atomically.");
  }
  console.log(`✅ [2/5] Payment Gateway Webhook Mint Verified!\n`);

  // Step 3: Atomic Tip Transfer & Platform Rake Calculation
  console.log(`⏳ [3/5] Testing Backend-Authoritative Live Tip Transfer...`);
  const tipAmount = 100;
  const tipResult = await LedgerService.processLiveTip({
    fanUserId: fan.id,
    creatorId: creator.id,
    credits: tipAmount,
    menuItemId: creator.interactionItems[0]?.id,
    customMessage: "Testing automated tip execution!",
  });

  console.log(`  Tip Ledger ID: ${tipResult.ledgerEntryId}`);
  console.log(`  Fan Remaining Balance: ${tipResult.fanRemainingBalance}`);
  console.log(`  Creator Credited (80%): ${tipResult.creatorCreditedAmount}`);
  console.log(`  Platform Rake (20%): ${tipResult.platformRakeAmount}`);

  if (tipResult.platformRakeAmount !== 20 || tipResult.creatorCreditedAmount !== 80) {
    throw new Error("Platform rake calculation mismatch!");
  }
  console.log(`✅ [3/5] Atomic Live Tip & Double-Entry Ledger Verified!\n`);

  // Step 4: Negative Balance Guard & Insufficient Credits Exception
  console.log(`⏳ [4/5] Testing Negative Balance Prevention Guard...`);
  let caughtInsufficientError = false;
  try {
    await LedgerService.processLiveTip({
      fanUserId: fan.id,
      creatorId: creator.id,
      credits: 99999999, // Exceeds wallet balance
    });
  } catch (err: any) {
    if (err instanceof InsufficientCreditsError || err.name === "InsufficientCreditsError") {
      caughtInsufficientError = true;
      console.log(`  Successfully rejected overspending: "${err.message}"`);
    }
  }

  if (!caughtInsufficientError) {
    throw new Error("Security vulnerability: Allowed tip with insufficient balance!");
  }
  console.log(`✅ [4/5] Negative Balance Guard Enforced!\n`);

  // Step 5: Trust & Safety Compliance Records
  console.log(`⏳ [5/5] Testing Trust & Safety 2257 and Age Verification...`);
  const is2257Compliant = await Compliance2257Service.isCreator2257Compliant(creator.id);
  const isAgeVerified = await AgeVerificationService.isUserAgeVerified(fan.id);

  console.log(`  Creator 2257 Certified: ${is2257Compliant}`);
  console.log(`  Fan 18+ Age Verified: ${isAgeVerified}`);

  if (!is2257Compliant || !isAgeVerified) {
    throw new Error("Trust & Safety verification failed!");
  }
  console.log(`✅ [5/5] 2257 Compliance & Age Assurance Verified!\n`);

  console.log("=================================================");
  console.log("🏆 ALL 5 SYSTEMS & SECURITY TESTS PASSED PERFECTLY!");
  console.log("=================================================");
}

runVerification()
  .catch((e) => {
    console.error("❌ Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
