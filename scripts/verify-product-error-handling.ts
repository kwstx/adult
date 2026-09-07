/**
 * ============================================================================
 * VERIFICATION SUITE: ERRORS AS PRODUCT STATES
 * ============================================================================
 * Verifies that all platform and financial errors are treated as first-class product states:
 * 1. 500 Internal Server Errors -> "Something went wrong. Your credits were not charged. Try again."
 * 2. Payment failures -> "Payment failed — your wallet was not charged."
 * 3. Payment pending -> "Payment pending"
 * 4. Insufficient credits -> "Insufficient credits — your wallet was not charged." (Action: TOP_UP)
 * 5. Duplicate transaction -> "Transaction already processed — no duplicate charge"
 * 6. Client error parser -> Standardized product error model with resilient fallbacks
 * 7. Backend logger -> Secure technical error logging with requestId and sensitive PII redaction
 */

import { NextRequest, NextResponse } from "next/server";
import { apiHandler, ApiError } from "../src/lib/api-handler";
import {
  ProductError,
  PaymentFailedError,
  PaymentPendingError,
  InsufficientCreditsProductError,
  WalletSuspendedProductError,
  DuplicateTransactionProductError,
  SystemProductError,
} from "../src/lib/errors/product-error";
import { parseProductError } from "../src/lib/errors/client-error";
import { Logger } from "../src/lib/logger";
import { InsufficientFundsError, WalletSuspendedError, DuplicateTransactionError } from "../src/modules/economic/wallet-ledger.service";

function createMockRequest(url: string = "http://localhost:3000/api/test", method: string = "POST"): NextRequest {
  return new NextRequest(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "127.0.0.1",
      "user-agent": "AntigravityTestClient/1.0",
    },
  });
}

async function runVerification() {
  console.log("================================================================================");
  console.log("🛡️ STARTING ERROR-AS-PRODUCT-STATE VERIFICATION SUITE");
  console.log("================================================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: any) {
    totalTests++;
    if (condition) {
      console.log(`   ✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`   ❌ [FAIL] ${testName}`, details || "");
      throw new Error(`Assertion failed for: ${testName}`);
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: UNEXPECTED 500 RUNTIME EXCEPTION SANITIZATION
  // --------------------------------------------------------------------------
  console.log("🔹 [1/7] Testing Unexpected 500 Crash -> Product Error State...");

  const crashingHandler = apiHandler(async () => {
    // Simulate a crash (e.g. database timeout or null pointer)
    throw new TypeError("Cannot read properties of undefined (reading 'critical_record') at QueryEngine.execute");
  });

  const crashReq = createMockRequest("http://localhost:3000/api/economic/tip");
  const crashRes: any = await crashingHandler(crashReq);
  const crashData = await crashRes.json();

  assert(crashRes.status === 500, "Response status is 500");
  assert(crashData.success === false, "success is false");
  assert(crashData.userTitle === "Something went wrong", `userTitle is "Something went wrong" (got: "${crashData.userTitle}")`);
  assert(
    crashData.userMessage === "Your credits were not charged. Please try again.",
    `userMessage is "Your credits were not charged. Please try again." (got: "${crashData.userMessage}")`
  );
  assert(crashData.walletCharged === false, "walletCharged is explicitly false");
  assert(crashData.category === "SYSTEM", "category is SYSTEM");
  assert(crashData.code === "INTERNAL_ERROR", "code is INTERNAL_ERROR");
  assert(crashData.action === "RETRY", "action is RETRY");
  assert(crashData.isRetryable === true, "isRetryable is true");
  assert(typeof crashData.requestId === "string" && crashData.requestId.startsWith("ERR-"), "requestId has format ERR-XXXX");
  assert(!JSON.stringify(crashData).includes("critical_record"), "Raw internal stack trace/details not leaked in production envelope");

  // --------------------------------------------------------------------------
  // TEST 2: PAYMENT FAILED PRODUCT STATE
  // --------------------------------------------------------------------------
  console.log("\n🔹 [2/7] Testing Payment Failed Product State...");

  const paymentFailedHandler = apiHandler(async () => {
    throw new PaymentFailedError("Card declined by issuing bank (insufficient funds on card)");
  });

  const payFailReq = createMockRequest("http://localhost:3000/api/economic/checkout");
  const payFailRes: any = await paymentFailedHandler(payFailReq);
  const payFailData = await payFailRes.json();

  assert(payFailRes.status === 402, "Response status is 402");
  assert(
    payFailData.userTitle === "Payment failed — your wallet was not charged.",
    `userTitle is "Payment failed — your wallet was not charged." (got: "${payFailData.userTitle}")`
  );
  assert(payFailData.walletCharged === false, "walletCharged is false");
  assert(payFailData.category === "FINANCIAL", "category is FINANCIAL");
  assert(payFailData.code === "PAYMENT_FAILED", "code is PAYMENT_FAILED");
  assert(payFailData.action === "RETRY", "action is RETRY");
  assert(payFailData.isRetryable === true, "isRetryable is true");

  // --------------------------------------------------------------------------
  // TEST 3: PAYMENT PENDING PRODUCT STATE
  // --------------------------------------------------------------------------
  console.log("\n🔹 [3/7] Testing Payment Pending Product State...");

  const paymentPendingHandler = apiHandler(async () => {
    throw new PaymentPendingError("pur_998877");
  });

  const payPendReq = createMockRequest("http://localhost:3000/api/economic/purchase/status");
  const payPendRes: any = await paymentPendingHandler(payPendReq);
  const payPendData = await payPendRes.json();

  assert(payPendRes.status === 202, "Response status is 202 Accepted");
  assert(payPendData.userTitle === "Payment pending", `userTitle is "Payment pending" (got: "${payPendData.userTitle}")`);
  assert(payPendData.walletCharged === false, "walletCharged is false (awaiting minting)");
  assert(payPendData.category === "FINANCIAL", "category is FINANCIAL");
  assert(payPendData.code === "PAYMENT_PENDING", "code is PAYMENT_PENDING");
  assert(payPendData.action === "WAIT", "action is WAIT");
  assert(payPendData.isRetryable === false, "isRetryable is false");

  // --------------------------------------------------------------------------
  // TEST 4: INSUFFICIENT FUNDS / BALANCE PRODUCT STATE
  // --------------------------------------------------------------------------
  console.log("\n🔹 [4/7] Testing Insufficient Funds Exception Mapping...");

  const insufficientFundsHandler = apiHandler(async () => {
    throw new InsufficientFundsError(1000, 350);
  });

  const insReq = createMockRequest("http://localhost:3000/api/economic/ppv/unlock");
  const insRes: any = await insufficientFundsHandler(insReq);
  const insData = await insRes.json();

  assert(insRes.status === 400, "Response status is 400");
  assert(insData.userTitle === "Insufficient credits", `userTitle is "Insufficient credits" (got: "${insData.userTitle}")`);
  assert(
    insData.userMessage.includes("This requires 1,000 credits, but your current balance is 350 credits. Your wallet was not charged."),
    `userMessage explains deficit and wallet reassurance (got: "${insData.userMessage}")`
  );
  assert(insData.walletCharged === false, "walletCharged is false");
  assert(insData.action === "TOP_UP", "action is TOP_UP");
  assert(insData.code === "INSUFFICIENT_FUNDS", "code is INSUFFICIENT_FUNDS");

  // --------------------------------------------------------------------------
  // TEST 5: DUPLICATE TRANSACTION PRODUCT STATE
  // --------------------------------------------------------------------------
  console.log("\n🔹 [5/7] Testing Duplicate Transaction Mapping...");

  const duplicateHandler = apiHandler(async () => {
    throw new DuplicateTransactionError("idempotency_key_live_tip_123");
  });

  const dupReq = createMockRequest("http://localhost:3000/api/economic/tip");
  const dupRes: any = await duplicateHandler(dupReq);
  const dupData = await dupRes.json();

  assert(dupRes.status === 409, "Response status is 409 Conflict");
  assert(
    dupData.userTitle === "Transaction already processed",
    `userTitle is "Transaction already processed" (got: "${dupData.userTitle}")`
  );
  assert(
    dupData.userMessage.includes("No duplicate charge was made to your wallet."),
    `userMessage confirms no extra charge (got: "${dupData.userMessage}")`
  );
  assert(dupData.walletCharged === false, "walletCharged is false");
  assert(dupData.action === "DISMISS", "action is DISMISS");

  // --------------------------------------------------------------------------
  // TEST 6: CLIENT ERROR PARSER RESILIENCE
  // --------------------------------------------------------------------------
  console.log("\n🔹 [6/7] Testing Client Error Parser...");

  // Subtest 6A: Structured ProductErrorResponse JSON
  const parsedStructured = await parseProductError({
    userTitle: "Payment failed — your wallet was not charged.",
    userMessage: "Credit card 3DS authentication failed.",
    walletCharged: false,
    category: "FINANCIAL",
    code: "PAYMENT_FAILED",
    action: "RETRY",
    isRetryable: true,
    requestId: "ERR-TEST-1234",
  });
  assert(parsedStructured.userTitle === "Payment failed — your wallet was not charged.", "Parsed structured title matches");
  assert(parsedStructured.walletCharged === false, "Parsed structured walletCharged is false");

  // Subtest 6B: Network / Offline failure
  const networkError = new TypeError("Failed to fetch");
  const parsedNetwork = await parseProductError(networkError);
  assert(parsedNetwork.userTitle === "Connection lost", "Network error maps to 'Connection lost'");
  assert(parsedNetwork.walletCharged === false, "Network error guarantees credits not charged");

  // Subtest 6C: Raw payment exception
  const rawJsPaymentError = new Error("Payment gateway rejected authorization token");
  const parsedJsPayment = await parseProductError(rawJsPaymentError);
  assert(
    parsedJsPayment.userTitle === "Payment failed — your wallet was not charged.",
    "Raw payment error maps to reassuring payment title"
  );
  assert(parsedJsPayment.walletCharged === false, "Raw payment error guarantees wallet not charged");

  // --------------------------------------------------------------------------
  // TEST 7: SECURE BACKEND LOGGING & SENSITIVE DATA REDACTION
  // --------------------------------------------------------------------------
  console.log("\n🔹 [7/7] Testing Secure Backend Logging & Redaction...");

  // Capture console output
  let capturedLog = "";
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    capturedLog += args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
  };

  try {
    Logger.error("Failed transaction test", new Error("Signature mismatch"), {
      requestId: "ERR-SAFE-9999",
      userId: "usr_alex_123",
      path: "/api/economic/checkout",
      method: "POST",
      metadata: {
        authorization: "Bearer secret_jwt_token_1234567890",
        creditCard: "4111-2222-3333-4444",
        cvv: "999",
        amountCredits: 1000,
      },
    });
  } finally {
    console.error = originalConsoleError;
  }

  assert(capturedLog.includes("ERR-SAFE-9999"), "Logger includes requestId in output");
  assert(capturedLog.includes("[REDACTED]"), "Logger redacts sensitive fields (authorization, creditCard, cvv)");
  assert(!capturedLog.includes("4111-2222-3333-4444"), "Card number is never printed in logs");
  assert(!capturedLog.includes("secret_jwt_token_1234567890"), "JWT token is never printed in logs");

  console.log("\n================================================================================");
  console.log(`🎉 ALL ${passedTests}/${totalTests} ERROR HANDLING TESTS PASSED SUCCESSFULLY!`);
  console.log("================================================================================\n");

  process.exit(0);
}

runVerification().catch((err) => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
