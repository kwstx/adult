/**
 * ============================================================================
 * ZERO-TRUST AUTHORITATIVE VALIDATION & SECURITY ENGINE VERIFICATION
 * ============================================================================
 *
 * Verifies that the server is the SINGLE SOURCE OF TRUTH and NEVER trusts:
 *  1. Price (Client sends 1 credit -> Creator configured 1,000 credits -> Server determines 1,000)
 *  2. User ID (Client claims user B -> Server uses authenticated session user A)
 *  3. Creator ID (Client sends mismatched creatorId -> Server verifies entity binding)
 *  4. Balance (Client claims 999,999 credits -> Server checks database ledger)
 *  5. Permissions (Unverified creator claims canSell=true -> Server rejects via 2257 guard)
 *  6. Subscription Status (Client claims isSubscribed=true -> Server checks Subscription table)
 *  7. Ownership (Client claims ownsContent=true -> Server verifies ContentPurchase table)
 *  8. XP (Client claims 100,000 XP -> Server queries XP ledger)
 *  9. Level (Level 1 fan claims Level 10 -> Server checks authoritative progression)
 * 10. Role (Regular FAN claims role="ADMIN" -> Server checks User.role in database)
 */

import { AuthoritativeContextService } from "../src/modules/validation/authoritative-context.service";
import { InteractionPurchaseService } from "../src/modules/interaction/interaction-purchase.service";
import { InteractionService } from "../src/modules/interaction/interaction.service";
import { ContentService } from "../src/modules/content/content.service";
import { CreatorPermissionsGuard } from "../src/modules/creator-verification/creator-permissions.guard";
import {
  AuthoritativeSecurityError,
  IneligibleAccessError,
  InsufficientAuthoritativeBalanceError,
  ResourceNotFoundError,
  ResourceMismatchError,
} from "../src/modules/validation/types";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}${details ? ` -> ${details}` : ""}`);
    failedCount++;
  }
}

async function runZeroTrustValidationSuite() {
  console.log("====================================================================");
  console.log("🛡️  STARTING ZERO-TRUST AUTHORITATIVE VALIDATION TEST SUITE");
  console.log("====================================================================\n");

  const creatorId = "creator_maya";

  // --------------------------------------------------------------------------
  // TEST 1: NEVER TRUST PRICE
  // --------------------------------------------------------------------------
  console.log("--- 1. NEVER TRUST PRICE: Server Ignores Browser Price ---");
  console.log("  Scenario: Frontend sends Price = 1 credit for an interaction configured at 100 credits.");
  console.log("  Backend looks up interaction and determines actual price = 100 credits.");

  // Setup: Reset Alex wallet to 1,250 credits
  AuthoritativeContextService.setMockWalletBalance("fan_alex", 1250);
  InteractionPurchaseService.setMockWalletBalance("fan_alex", 1250);

  // Client attempts to pay 1 credit for interaction "int_seed_ama" (configured at 100 credits)
  const clientPayloadWithTamperedPrice = {
    interactionId: "int_seed_ama",
    price: 1, // MALICIOUS CLIENT TAMPERING: Claims price is 1 credit
    creditCost: 1,
    amountCredits: 1,
    customMessage: "What is your best advice?",
  };

  // Sanitization strips client-provided price
  const sanitizedPayload = AuthoritativeContextService.sanitizeUntrustedPayload<any>(
    clientPayloadWithTamperedPrice
  );

  // Server authoritatively looks up interaction 123 / int_seed_ama
  const priceResolution = await AuthoritativeContextService.resolvePrice({
    resourceType: "INTERACTION",
    resourceId: sanitizedPayload.interactionId,
    creatorProfileId: creatorId,
  });

  console.log(`  Authoritative Entity Resolved: "${priceResolution.title}"`);
  console.log(`  Client Submitted Price: ${clientPayloadWithTamperedPrice.price} credit`);
  console.log(`  Server Determined Price: ${priceResolution.authoritativePriceCredits} credits`);

  assert(
    priceResolution.authoritativePriceCredits === 100,
    "Price Rule: Server authoritatively determined price is 100 credits (ignored client's 1 credit)"
  );

  // Execute purchase with ignoreClientPrice = true
  const receipt = await InteractionPurchaseService.purchaseInteraction({
    creatorId,
    interactionId: clientPayloadWithTamperedPrice.interactionId,
    ignoreClientPrice: true, // Zero-trust mode: ignore browser's price
    clientSubmittedPrice: clientPayloadWithTamperedPrice.price,
    fanUserId: "fan_alex",
    customMessage: clientPayloadWithTamperedPrice.customMessage,
    idempotencyKey: `zero_trust_test_price_${Date.now()}`,
  });

  assert(
    receipt.priceCredits === 100 && receipt.fanRemainingBalance === 1150,
    "Price Rule: Wallet was charged 100 credits, balance decreased from 1,250 to 1,150 credits"
  );

  // --------------------------------------------------------------------------
  // TEST 2: NEVER TRUST USER ID
  // --------------------------------------------------------------------------
  console.log("\n--- 2. NEVER TRUST USER ID: Identity Derived Strictly from Session ---");
  console.log("  Scenario: Client claims userId = 'admin_user' or 'victim_user' in body.");

  const untrustedBodyWithSpoofedUser = {
    interactionId: "int_seed_ama",
    userId: "admin_user", // SPOOFED
    fanUserId: "victim_user_999", // SPOOFED
    buyerId: "system_root", // SPOOFED
  };

  // Sanitizer removes untrusted user IDs from body
  const sanitizedUserBody = AuthoritativeContextService.sanitizeUntrustedPayload<any>(
    untrustedBodyWithSpoofedUser
  );

  assert(
    sanitizedUserBody.userId === undefined &&
      sanitizedUserBody.fanUserId === undefined &&
      sanitizedUserBody.buyerId === undefined,
    "User ID Rule: Untrusted userId/fanUserId/buyerId stripped from client payload"
  );

  // Authenticated user is resolved from server session
  const serverResolvedUser = await AuthoritativeContextService.resolveUser("fan_alex");
  assert(
    serverResolvedUser.userId === "fan_alex" && serverResolvedUser.username === "alex_patron",
    "User ID Rule: Server strictly bound execution to authenticated session user 'fan_alex'"
  );

  // --------------------------------------------------------------------------
  // TEST 3: NEVER TRUST CREATOR ID (BINDING INTEGRITY)
  // --------------------------------------------------------------------------
  console.log("\n--- 3. NEVER TRUST CREATOR ID: Resource Binding Integrity ---");
  console.log("  Scenario: Client sends interaction 'int_seed_ama' with mismatched creator 'impostor_creator'.");

  try {
    await AuthoritativeContextService.resolveCreator("impostor_creator", {
      entityType: "INTERACTION",
      entityId: "int_seed_ama",
    });
    assert(false, "Creator ID Rule: Should reject mismatched creator");
  } catch (err: any) {
    assert(
      err instanceof ResourceMismatchError || err.name === "CreatorPermissionDeniedError" || err instanceof ResourceNotFoundError,
      "Creator ID Rule: Server rejected mismatched creator binding"
    );
  }

  // --------------------------------------------------------------------------
  // TEST 4: NEVER TRUST BALANCE
  // --------------------------------------------------------------------------
  console.log("\n--- 4. NEVER TRUST WALLET BALANCE: Authoritative Ledger Query ---");
  console.log("  Scenario: Broke user (25 credits) claims availableBalance = 999,999 credits.");

  AuthoritativeContextService.setMockWalletBalance("fan_broke", 25);
  InteractionPurchaseService.setMockWalletBalance("fan_broke", 25);

  const untrustedBalanceClaim = {
    balance: 999999,
    availableCredits: 999999,
  };

  const strippedBalance = AuthoritativeContextService.sanitizeUntrustedPayload<any>(untrustedBalanceClaim);
  assert(
    strippedBalance.balance === undefined && strippedBalance.availableCredits === undefined,
    "Balance Rule: Untrusted balance claims stripped from client payload"
  );

  try {
    await AuthoritativeContextService.assertSufficientBalance("fan_broke", 100);
    assert(false, "Balance Rule: Should reject transaction due to insufficient balance");
  } catch (err: any) {
    assert(
      err instanceof InsufficientAuthoritativeBalanceError,
      "Balance Rule: Server queried ledger (25 credits) and threw InsufficientAuthoritativeBalanceError (402)"
    );
  }

  // --------------------------------------------------------------------------
  // TEST 5: NEVER TRUST PERMISSIONS (2257 / MONETIZATION GUARDS)
  // --------------------------------------------------------------------------
  console.log("\n--- 5. NEVER TRUST PERMISSIONS: Server Evaluates 2257/KYC State ---");
  console.log("  Scenario: Unverified creator claims canSell = true.");

  try {
    await CreatorPermissionsGuard.assertCanSell("creator_unverified_999", "SELL_ITEM");
    assert(false, "Permissions Rule: Should reject unverified creator");
  } catch (err: any) {
    assert(
      err.statusCode === 404 || err.statusCode === 403,
      "Permissions Rule: Server denied monetization for unverified creator (403/404)"
    );
  }

  // --------------------------------------------------------------------------
  // TEST 6: NEVER TRUST SUBSCRIPTION STATUS
  // --------------------------------------------------------------------------
  console.log("\n--- 6. NEVER TRUST SUBSCRIPTION STATUS: Checked in Database ---");
  console.log("  Scenario: Unsubscribed fan claims isSubscribed = true for SUBSCRIBERS_ONLY interaction.");

  // fan_unsub is NOT subscribed to creator_maya
  AuthoritativeContextService.setMockSubscription("fan_unsub", "creator_maya", false);

  const untrustedSubClaim = {
    isSubscribed: true,
    subscriptionTier: "VIP",
    isVIP: true,
  };

  const strippedSub = AuthoritativeContextService.sanitizeUntrustedPayload<any>(untrustedSubClaim);
  assert(
    strippedSub.isSubscribed === undefined && strippedSub.isVIP === undefined,
    "Subscription Rule: Client subscription claims stripped"
  );

  try {
    await AuthoritativeContextService.assertEligibility("fan_unsub", "creator_maya", "SUBSCRIBERS_ONLY");
    assert(false, "Subscription Rule: Should reject unsubscribed fan");
  } catch (err: any) {
    assert(
      err instanceof IneligibleAccessError,
      "Subscription Rule: Server checked database and threw IneligibleAccessError (403)"
    );
  }

  // --------------------------------------------------------------------------
  // TEST 7: NEVER TRUST OWNERSHIP / ENTITLEMENTS
  // --------------------------------------------------------------------------
  console.log("\n--- 7. NEVER TRUST OWNERSHIP: Checked in Entitlement Records ---");
  console.log("  Scenario: Non-buyer claims ownsContent = true for exclusive PPV video.");

  const untrustedOwnershipClaim = {
    ownsContent: true,
    isUnlocked: true,
    hasAccess: true,
  };

  const strippedOwnership = AuthoritativeContextService.sanitizeUntrustedPayload<any>(untrustedOwnershipClaim);
  assert(
    strippedOwnership.ownsContent === undefined && strippedOwnership.isUnlocked === undefined,
    "Ownership Rule: Client ownership claims stripped"
  );

  const ownershipCheck = await AuthoritativeContextService.resolveOwnership(
    "fan_unsub",
    "CONTENT",
    "content_exclusive_video_1"
  );

  assert(
    ownershipCheck.isOwned === false,
    "Ownership Rule: Server determined fan does NOT own PPV video (isOwned: false)"
  );

  // --------------------------------------------------------------------------
  // TEST 8: NEVER TRUST XP
  // --------------------------------------------------------------------------
  console.log("\n--- 8. NEVER TRUST XP: Loaded from Authoritative XP Ledger ---");
  console.log("  Scenario: Fan claims xp = 50,000.");

  const untrustedXpClaim = {
    xp: 50000,
    totalXp: 50000,
    currentXp: 50000,
  };

  const strippedXp = AuthoritativeContextService.sanitizeUntrustedPayload<any>(untrustedXpClaim);
  assert(
    strippedXp.xp === undefined && strippedXp.totalXp === undefined,
    "XP Rule: Untrusted XP claims stripped"
  );

  const progression = await AuthoritativeContextService.resolveProgression("fan_alex", "creator_maya");
  assert(
    progression.totalXp === 15400,
    "XP Rule: Server loaded authoritative XP = 15,400 from progression ledger"
  );

  // --------------------------------------------------------------------------
  // TEST 9: NEVER TRUST LEVEL
  // --------------------------------------------------------------------------
  console.log("\n--- 9. NEVER TRUST LEVEL: Evaluated by Progression Engine ---");
  console.log("  Scenario: Level 1 fan claims fanLevel = 10 to purchase MIN_FAN_LEVEL_5 interaction.");

  AuthoritativeContextService.setMockProgression("fan_newbie", "creator_maya", 1, 120);

  const untrustedLevelClaim = {
    level: 10,
    fanLevel: 10,
    relationshipTier: "DIAMOND",
  };

  const strippedLevel = AuthoritativeContextService.sanitizeUntrustedPayload<any>(untrustedLevelClaim);
  assert(
    strippedLevel.level === undefined && strippedLevel.fanLevel === undefined,
    "Level Rule: Untrusted level claims stripped"
  );

  try {
    await AuthoritativeContextService.assertEligibility("fan_newbie", "creator_maya", "MIN_FAN_LEVEL_5");
    assert(false, "Level Rule: Should reject Level 1 fan for Level 5 interaction");
  } catch (err: any) {
    assert(
      err instanceof IneligibleAccessError,
      "Level Rule: Server checked authoritative level (Level 1) and threw IneligibleAccessError (403)"
    );
  }

  // --------------------------------------------------------------------------
  // TEST 10: NEVER TRUST ROLE
  // --------------------------------------------------------------------------
  console.log("\n--- 10. NEVER TRUST ROLE: Loaded from Database User Record ---");
  console.log("  Scenario: Regular FAN claims role = 'ADMIN' or isAdmin = true.");

  const untrustedRoleClaim = {
    role: "ADMIN",
    isAdmin: true,
    isModerator: true,
  };

  const strippedRole = AuthoritativeContextService.sanitizeUntrustedPayload<any>(untrustedRoleClaim);
  assert(
    strippedRole.role === undefined && strippedRole.isAdmin === undefined,
    "Role Rule: Untrusted role claims stripped"
  );

  try {
    await AuthoritativeContextService.assertRole("fan_alex", ["ADMIN"]);
    assert(false, "Role Rule: Should reject non-admin");
  } catch (err: any) {
    assert(
      err instanceof AuthoritativeSecurityError && err.code === "INSUFFICIENT_ROLE_PERMISSIONS",
      "Role Rule: Server queried User.role ('FAN') and rejected admin access with 403 Forbidden"
    );
  }

  // --------------------------------------------------------------------------
  // FINAL SUMMARY
  // --------------------------------------------------------------------------
  console.log("\n====================================================================");
  console.log(`🎯 VERIFICATION COMPLETE: ${passedCount} Passed, ${failedCount} Failed`);
  console.log("====================================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runZeroTrustValidationSuite().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
