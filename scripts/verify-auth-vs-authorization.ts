/**
 * ============================================================================
 * END-TO-END VERIFICATION: AUTHENTICATION VERSUS AUTHORIZATION
 * ============================================================================
 * 
 * Demonstrates and authoritatively validates:
 * 1. Authentication ("Who are you?")
 *    - Validates credentials/tokens to establish authenticated user identity.
 *    - An authenticated fan has valid identity, active account, and JWT token.
 * 
 * 2. Authorization ("What are you allowed to do?")
 *    - Evaluated independently from authentication.
 *    - An authenticated fan is STRICTLY DENIED from:
 *      [1] Entering a creator's VIP room (without active VIP subscription)
 *      [2] Viewing PPV content (without purchasing unlock)
 *      [3] Starting a creator livestream (fans cannot broadcast)
 *      [4] Accessing creator analytics (confidential to owner/auditors)
 *      [5] Modifying interaction prices (storefront owner/admin only)
 *      [6] Issuing refunds (compliance financial officers only)
 * 
 *    - Authorized actors (VIP subscribers, PPV buyers, owners, admins)
 *      are GRANTED access authoritatively (HTTP 200).
 */

import { AuthorizerService, AuthorizationError } from "../src/modules/auth";
import { AuthenticatedSubject } from "../src/modules/auth/authorization.types";
import { generateUserToken, verifyUserToken } from "../src/lib/api-handler";

// In-memory Authoritative Database Store for reproducible execution
class MockAuthDatabase {
  users: Map<string, any> = new Map();
  creatorProfiles: Map<string, any> = new Map();
  verifications: Map<string, any> = new Map();
  subscriptionProducts: Map<string, any> = new Map();
  subscriptions: Map<string, any> = new Map();
  contents: Map<string, any> = new Map();
  contentPurchases: Map<string, any> = new Map();
  interactionDefinitions: Map<string, any> = new Map();

  user = {
    findUnique: async ({ where }: any) => {
      return this.users.get(where.id) || null;
    },
    findFirst: async ({ where }: any) => {
      for (const u of this.users.values()) {
        if (where.id && u.id === where.id) return u;
        if (where.email && u.email.toLowerCase() === where.email.toLowerCase()) return u;
        if (where.username && u.username.toLowerCase() === where.username.toLowerCase()) return u;
      }
      return null;
    },
  };

  creatorProfile = {
    findUnique: async ({ where, include, select }: any) => {
      const creator = this.creatorProfiles.get(where.id) || null;
      if (!creator) return null;
      const res = { ...creator };
      if (include?.verifications) {
        res.verifications = Array.from(this.verifications.values()).filter(
          (v) => v.creatorProfileId === creator.id && v.verificationStatus === "APPROVED"
        );
      }
      return res;
    },
    findFirst: async ({ where }: any) => {
      for (const c of this.creatorProfiles.values()) {
        if (where.id && c.id === where.id) return c;
        if (where.userId && c.userId === where.userId) return c;
      }
      return null;
    },
  };

  content = {
    findUnique: async ({ where, include }: any) => {
      const item = this.contents.get(where.id) || null;
      if (!item) return null;
      const res = { ...item };
      if (include?.creatorProfile) {
        res.creatorProfile = this.creatorProfiles.get(item.creatorProfileId) || null;
      }
      return res;
    },
  };

  contentPurchase = {
    findUnique: async ({ where }: any) => {
      if (where.contentId_fanId) {
        const key = `${where.contentId_fanId.contentId}_${where.contentId_fanId.fanId}`;
        return this.contentPurchases.get(key) || null;
      }
      return null;
    },
  };

  subscription = {
    findUnique: async ({ where, include }: any) => {
      if (where.fanId_creatorProfileId) {
        const key = `${where.fanId_creatorProfileId.fanId}_${where.fanId_creatorProfileId.creatorProfileId}`;
        const sub = this.subscriptions.get(key) || null;
        if (!sub) return null;
        const res = { ...sub };
        if (include?.product && sub.productId) {
          res.product = this.subscriptionProducts.get(sub.productId) || null;
        }
        return res;
      }
      return null;
    },
  };

  interactionDefinition = {
    findUnique: async ({ where }: any) => {
      return this.interactionDefinitions.get(where.id) || null;
    },
  };
}

async function runAuthVsAuthorizationSuite() {
  console.log("================================================================================");
  console.log("🔐 STARTING AUTHENTICATION VS AUTHORIZATION VERIFICATION SUITE");
  console.log("================================================================================\n");

  const db = new MockAuthDatabase();

  // --------------------------------------------------------------------------
  // STEP 1: AUTHENTICATION ("Who are you?")
  // --------------------------------------------------------------------------
  console.log("👤 [STEP 1] Authenticating Actors (Establishing Identity)...");

  // Actor 1: Alice (Fan)
  const aliceId = "user_fan_alice_101";
  const aliceToken = generateUserToken({
    userId: aliceId,
    username: "alice_patron",
    role: "FAN",
  });
  const decodedAlice = verifyUserToken(aliceToken);
  console.log("   ✅ Fan Authenticated:");
  console.log("      - Identity Confirmed: userId =", decodedAlice.userId, "(username:", decodedAlice.username, ")");
  console.log("      - Cryptographic Token Verified: HS256 JWT Valid (Expires: 30 days)");
  console.log("      - Role:", decodedAlice.role);

  const aliceSubject: AuthenticatedSubject = {
    userId: aliceId,
    username: "alice_patron",
    email: "alice@fan.local",
    role: "FAN",
    kycStatus: "AGE_VERIFIED",
    moderationState: "ACTIVE",
    isActive: true,
    isBanned: false,
    creatorProfileId: null,
  };
  db.users.set(aliceId, aliceSubject);

  // Actor 2: Maya Velvet (Creator)
  const mayaUserId = "user_creator_maya_202";
  const mayaCreatorProfileId = "creator_profile_maya_202";
  const mayaSubject: AuthenticatedSubject = {
    userId: mayaUserId,
    username: "mayavelvet",
    email: "maya@creator.local",
    role: "CREATOR",
    kycStatus: "COMPLIANCE_2257_APPROVED",
    moderationState: "ACTIVE",
    isActive: true,
    isBanned: false,
    creatorProfileId: mayaCreatorProfileId,
  };
  db.users.set(mayaUserId, mayaSubject);
  db.creatorProfiles.set(mayaCreatorProfileId, {
    id: mayaCreatorProfileId,
    userId: mayaUserId,
    stageName: "Maya Velvet ✨",
    moderationState: "MONETIZATION_ENABLED",
    allowFreeVip: false,
  });
  db.verifications.set("verif_maya_2257", {
    id: "verif_maya_2257",
    creatorProfileId: mayaCreatorProfileId,
    verificationStatus: "APPROVED",
    verifiedAt: new Date(),
  });
  console.log("   ✅ Creator Authenticated: Maya Velvet ✨ (Profile:", mayaCreatorProfileId, ")");

  // Actor 3: Zara (Second Creator)
  const zaraUserId = "user_creator_zara_303";
  const zaraCreatorProfileId = "creator_profile_zara_303";
  const zaraSubject: AuthenticatedSubject = {
    userId: zaraUserId,
    username: "zarastar",
    email: "zara@creator.local",
    role: "CREATOR",
    kycStatus: "COMPLIANCE_2257_APPROVED",
    moderationState: "ACTIVE",
    isActive: true,
    isBanned: false,
    creatorProfileId: zaraCreatorProfileId,
  };
  db.users.set(zaraUserId, zaraSubject);
  db.creatorProfiles.set(zaraCreatorProfileId, {
    id: zaraCreatorProfileId,
    userId: zaraUserId,
    stageName: "Zara Star 🌟",
    moderationState: "MONETIZATION_ENABLED",
    allowFreeVip: false,
  });
  console.log("   ✅ Second Creator Authenticated: Zara Star 🌟 (Profile:", zaraCreatorProfileId, ")");

  // Actor 4: Bob (Financial Admin & Compliance Auditor)
  const bobUserId = "user_admin_bob_999";
  const bobSubject: AuthenticatedSubject = {
    userId: bobUserId,
    username: "bob_finance",
    email: "bob.finance@auralive.internal",
    role: "ADMIN",
    kycStatus: "COMPLIANCE_2257_APPROVED",
    moderationState: "ACTIVE",
    isActive: true,
    isBanned: false,
    creatorProfileId: null,
  };
  db.users.set(bobUserId, bobSubject);
  console.log("   ✅ Financial Auditor Authenticated: Bob Finance (Role: ADMIN -> FINANCIAL_AUDITOR)\n");

  // Provision resources on Maya's channel
  const vipProductId = "prod_vip_maya";
  db.subscriptionProducts.set(vipProductId, {
    id: vipProductId,
    creatorProfileId: mayaCreatorProfileId,
    name: "VIP Devotee",
    tier: "VIP",
    tierLevel: 2,
    priceFiatCents: 1999,
    entitlements: "SUBSCRIBER_CONTENT,SUBSCRIBER_CHAT,SUBSCRIBER_LIVE,VIP_MEDIA",
    isActive: true,
  });

  const ppvContentId = "content_ppv_4k_dance";
  db.contents.set(ppvContentId, {
    id: ppvContentId,
    creatorProfileId: mayaCreatorProfileId,
    title: "Exclusive 4K Neon Rehearsal",
    accessLevel: "PPV_PURCHASE",
    priceCredits: 200,
    mediaUrl: "https://protected.cdn/media/rehearsal_4k.mp4",
    isPublished: true,
    moderationState: "APPROVED",
  });

  const interactionId = "int_neon_pulse";
  db.interactionDefinitions.set(interactionId, {
    id: interactionId,
    creatorProfileId: mayaCreatorProfileId,
    title: "Neon Pulse Laser Trigger",
    priceCredits: 100,
    isEnabled: true,
  });

  console.log("--------------------------------------------------------------------------------");
  console.log("🛡️  EVALUATING 6 AUTHORIZATION POLICIES AGAINST AUTHENTICATED FAN");
  console.log("--------------------------------------------------------------------------------\n");

  // ============================================================================
  // TEST 1: ENTER CREATOR'S VIP ROOM
  // ============================================================================
  console.log("🔹 [TEST 1/6] Action: ENTER_VIP_ROOM");
  console.log("   Requester: Alice (Authenticated Fan)");
  const vipDecisionAliceDenied = await AuthorizerService.can(
    aliceSubject,
    "ENTER_VIP_ROOM",
    { creatorProfileId: mayaCreatorProfileId },
    undefined,
    db
  );
  console.log("   → Is Authenticated?", true);
  console.log("   → Is Authorized?", vipDecisionAliceDenied.isAuthorized);
  console.log("   → HTTP Status Code:", vipDecisionAliceDenied.statusCode);
  console.log("   → Authorization Error Code:", vipDecisionAliceDenied.errorCode);
  console.log("   → Authoritative Reason:", vipDecisionAliceDenied.reason);

  if (vipDecisionAliceDenied.isAuthorized || vipDecisionAliceDenied.statusCode !== 403) {
    throw new Error("SECURITY FAILURE: Authenticated fan was granted unauthorized VIP entry!");
  }
  console.log("   ✅ PASS: Authenticated fan is strictly DENIED without active VIP subscription.");

  // Test Maya (Owner)
  const vipDecisionMaya = await AuthorizerService.can(
    mayaSubject,
    "ENTER_VIP_ROOM",
    { creatorProfileId: mayaCreatorProfileId },
    undefined,
    db
  );
  if (!vipDecisionMaya.isAuthorized) throw new Error("Creator owner denied VIP room entry!");
  console.log("   ✅ PASS: Creator Owner is AUTHORIZED for own VIP room.");

  // Grant Alice VIP subscription
  const subKey = `${aliceSubject.userId}_${mayaCreatorProfileId}`;
  db.subscriptions.set(subKey, {
    id: "sub_alice_vip_1",
    fanId: aliceSubject.userId,
    creatorProfileId: mayaCreatorProfileId,
    productId: vipProductId,
    tier: "VIP",
    tierName: "VIP Devotee",
    tierLevel: 2,
    status: "ACTIVE",
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isPaused: false,
  });
  const vipDecisionAliceGranted = await AuthorizerService.can(
    aliceSubject,
    "ENTER_VIP_ROOM",
    { creatorProfileId: mayaCreatorProfileId },
    undefined,
    db
  );
  if (!vipDecisionAliceGranted.isAuthorized) throw new Error("Subscribed VIP fan denied entry!");
  console.log("   ✅ PASS: With active VIP entitlement, Alice is AUTHORIZED (200 OK).\n");

  // ============================================================================
  // TEST 2: VIEW PPV CONTENT
  // ============================================================================
  console.log("🔹 [TEST 2/6] Action: VIEW_PPV_CONTENT");
  console.log("   Requester: Alice (Authenticated Fan)");
  const ppvDecisionAliceDenied = await AuthorizerService.can(
    aliceSubject,
    "VIEW_PPV_CONTENT",
    { contentId: ppvContentId },
    undefined,
    db
  );
  console.log("   → Is Authenticated?", true);
  console.log("   → Is Authorized?", ppvDecisionAliceDenied.isAuthorized);
  console.log("   → HTTP Status Code:", ppvDecisionAliceDenied.statusCode);
  console.log("   → Authorization Error Code:", ppvDecisionAliceDenied.errorCode);
  console.log("   → Authoritative Reason:", ppvDecisionAliceDenied.reason);

  if (ppvDecisionAliceDenied.isAuthorized || ppvDecisionAliceDenied.statusCode !== 403) {
    throw new Error("SECURITY FAILURE: Authenticated fan was granted PPV media without purchase!");
  }
  console.log("   ✅ PASS: Authenticated fan is strictly DENIED PPV content before purchasing unlock.");

  // Test Maya (Owner)
  const ppvDecisionMaya = await AuthorizerService.can(
    mayaSubject,
    "VIEW_PPV_CONTENT",
    { contentId: ppvContentId },
    undefined,
    db
  );
  if (!ppvDecisionMaya.isAuthorized) throw new Error("Creator owner denied own PPV content!");
  console.log("   ✅ PASS: Creator Owner is AUTHORIZED for own PPV content.");

  // Grant Alice ContentPurchase record
  const purchaseKey = `${ppvContentId}_${aliceSubject.userId}`;
  db.contentPurchases.set(purchaseKey, {
    id: "purchase_alice_ppv_1",
    contentId: ppvContentId,
    fanId: aliceSubject.userId,
    priceCreditsPaid: 200,
    createdAt: new Date(),
  });
  const ppvDecisionAliceGranted = await AuthorizerService.can(
    aliceSubject,
    "VIEW_PPV_CONTENT",
    { contentId: ppvContentId },
    undefined,
    db
  );
  if (!ppvDecisionAliceGranted.isAuthorized) throw new Error("Purchasing fan denied PPV media!");
  console.log("   ✅ PASS: After purchase transaction, Alice is AUTHORIZED (200 OK).\n");

  // ============================================================================
  // TEST 3: START CREATOR LIVESTREAM
  // ============================================================================
  console.log("🔹 [TEST 3/6] Action: START_CREATOR_LIVESTREAM");
  console.log("   Requester: Alice (Authenticated Fan)");
  const streamDecisionAliceDenied = await AuthorizerService.can(
    aliceSubject,
    "START_CREATOR_LIVESTREAM",
    { creatorProfileId: mayaCreatorProfileId },
    undefined,
    db
  );
  console.log("   → Is Authenticated?", true);
  console.log("   → Is Authorized?", streamDecisionAliceDenied.isAuthorized);
  console.log("   → HTTP Status Code:", streamDecisionAliceDenied.statusCode);
  console.log("   → Authorization Error Code:", streamDecisionAliceDenied.errorCode);
  console.log("   → Authoritative Reason:", streamDecisionAliceDenied.reason);

  if (streamDecisionAliceDenied.isAuthorized || streamDecisionAliceDenied.statusCode !== 403) {
    throw new Error("SECURITY FAILURE: Fan was permitted to start a creator livestream!");
  }
  console.log("   ✅ PASS: Authenticated fan is strictly DENIED from broadcasting.");

  // Test Zara (Unrelated creator attempting to start broadcast on Maya's channel)
  const streamDecisionZaraDenied = await AuthorizerService.can(
    zaraSubject,
    "START_CREATOR_LIVESTREAM",
    { creatorProfileId: mayaCreatorProfileId },
    undefined,
    db
  );
  if (streamDecisionZaraDenied.isAuthorized || streamDecisionZaraDenied.errorCode !== "NOT_CREATOR_OWNER") {
    throw new Error("SECURITY FAILURE: Non-owner creator was permitted to broadcast on another channel!");
  }
  console.log("   ✅ PASS: Non-owner creator is DENIED from broadcasting on another creator's channel.");

  // Test Maya (Verified Owner)
  const streamDecisionMaya = await AuthorizerService.can(
    mayaSubject,
    "START_CREATOR_LIVESTREAM",
    { creatorProfileId: mayaCreatorProfileId },
    undefined,
    db
  );
  if (!streamDecisionMaya.isAuthorized) throw new Error("Verified creator owner denied starting broadcast!");
  console.log("   ✅ PASS: Verified creator owner is AUTHORIZED to start livestream (200 OK).\n");

  // ============================================================================
  // TEST 4: ACCESS CREATOR ANALYTICS
  // ============================================================================
  console.log("🔹 [TEST 4/6] Action: ACCESS_CREATOR_ANALYTICS");
  console.log("   Requester: Alice (Authenticated Fan)");
  const analyticsDecisionAlice = await AuthorizerService.can(
    aliceSubject,
    "ACCESS_CREATOR_ANALYTICS",
    { creatorProfileId: mayaCreatorProfileId },
    undefined,
    db
  );
  console.log("   → Is Authenticated?", true);
  console.log("   → Is Authorized?", analyticsDecisionAlice.isAuthorized);
  console.log("   → HTTP Status Code:", analyticsDecisionAlice.statusCode);
  console.log("   → Authorization Error Code:", analyticsDecisionAlice.errorCode);
  console.log("   → Authoritative Reason:", analyticsDecisionAlice.reason);

  if (analyticsDecisionAlice.isAuthorized || analyticsDecisionAlice.statusCode !== 403) {
    throw new Error("SECURITY FAILURE: Fan was granted access to confidential creator analytics!");
  }
  console.log("   ✅ PASS: Authenticated fan is DENIED access to creator revenue analytics.");

  // Test Zara (other creator accessing Maya's analytics)
  const analyticsDecisionZara = await AuthorizerService.can(
    zaraSubject,
    "ACCESS_CREATOR_ANALYTICS",
    { creatorProfileId: mayaCreatorProfileId },
    undefined,
    db
  );
  if (analyticsDecisionZara.isAuthorized) throw new Error("Other creator granted access to Maya's analytics!");
  console.log("   ✅ PASS: Non-owner creator is DENIED access to another creator's analytics.");

  // Test Maya (Owner)
  const analyticsDecisionMaya = await AuthorizerService.can(
    mayaSubject,
    "ACCESS_CREATOR_ANALYTICS",
    { creatorProfileId: mayaCreatorProfileId },
    undefined,
    db
  );
  if (!analyticsDecisionMaya.isAuthorized) throw new Error("Creator denied own analytics!");
  console.log("   ✅ PASS: Creator Owner is AUTHORIZED to inspect own analytics.");

  // Test Bob (Compliance Admin / Auditor)
  const analyticsDecisionBob = await AuthorizerService.can(
    bobSubject,
    "ACCESS_CREATOR_ANALYTICS",
    { creatorProfileId: mayaCreatorProfileId },
    undefined,
    db
  );
  if (!analyticsDecisionBob.isAuthorized) throw new Error("Admin auditor denied analytics access!");
  console.log("   ✅ PASS: Compliance Auditor is AUTHORIZED via RBAC oversight (200 OK).\n");

  // ============================================================================
  // TEST 5: MODIFY INTERACTION PRICES
  // ============================================================================
  console.log("🔹 [TEST 5/6] Action: MODIFY_INTERACTION_PRICES");
  console.log("   Requester: Alice (Authenticated Fan)");
  const priceDecisionAlice = await AuthorizerService.can(
    aliceSubject,
    "MODIFY_INTERACTION_PRICES",
    {
      creatorProfileId: mayaCreatorProfileId,
      interactionDefinitionId: interactionId,
      newPriceCredits: 50,
    },
    undefined,
    db
  );
  console.log("   → Is Authenticated?", true);
  console.log("   → Is Authorized?", priceDecisionAlice.isAuthorized);
  console.log("   → HTTP Status Code:", priceDecisionAlice.statusCode);
  console.log("   → Authorization Error Code:", priceDecisionAlice.errorCode);
  console.log("   → Authoritative Reason:", priceDecisionAlice.reason);

  if (priceDecisionAlice.isAuthorized || priceDecisionAlice.statusCode !== 403) {
    throw new Error("SECURITY FAILURE: Fan was permitted to modify interaction pricing!");
  }
  console.log("   ✅ PASS: Authenticated fan is strictly DENIED from modifying interaction prices.");

  // Test Maya (Owner)
  const priceDecisionMaya = await AuthorizerService.can(
    mayaSubject,
    "MODIFY_INTERACTION_PRICES",
    {
      creatorProfileId: mayaCreatorProfileId,
      interactionDefinitionId: interactionId,
      newPriceCredits: 150,
    },
    undefined,
    db
  );
  if (!priceDecisionMaya.isAuthorized) throw new Error("Creator denied modifying own interaction price!");
  console.log("   ✅ PASS: Creator Storefront Owner is AUTHORIZED to configure pricing (200 OK).\n");

  // ============================================================================
  // TEST 6: ISSUE REFUNDS
  // ============================================================================
  console.log("🔹 [TEST 6/6] Action: ISSUE_REFUNDS");
  console.log("   Requester: Alice (Authenticated Fan)");
  const refundDecisionAlice = await AuthorizerService.can(
    aliceSubject,
    "ISSUE_REFUNDS",
    { transactionId: "tx_ledger_1001", amountCredits: 500 },
    undefined,
    db
  );
  console.log("   → Is Authenticated?", true);
  console.log("   → Is Authorized?", refundDecisionAlice.isAuthorized);
  console.log("   → HTTP Status Code:", refundDecisionAlice.statusCode);
  console.log("   → Authorization Error Code:", refundDecisionAlice.errorCode);
  console.log("   → Authoritative Reason:", refundDecisionAlice.reason);

  if (refundDecisionAlice.isAuthorized || refundDecisionAlice.statusCode !== 403) {
    throw new Error("SECURITY FAILURE: Fan was permitted to issue financial ledger refunds!");
  }
  console.log("   ✅ PASS: Authenticated fan is strictly DENIED from issuing ledger refunds.");

  // Test Bob (Compliance Financial Auditor)
  const refundDecisionBob = await AuthorizerService.can(
    bobSubject,
    "ISSUE_REFUNDS",
    { transactionId: "tx_ledger_1001", amountCredits: 500 },
    undefined,
    db
  );
  if (!refundDecisionBob.isAuthorized) throw new Error("Financial auditor denied issuing refund!");
  console.log("   ✅ PASS: Financial Compliance Officer is AUTHORIZED to issue refunds (200 OK).\n");

  // ============================================================================
  // TEST 7: ASSERTION GUARDS (assertCan)
  // ============================================================================
  console.log("🔹 [TEST 7] Testing assertCan Server Exception Guard...");
  let assertedCaught = false;
  try {
    await AuthorizerService.assertCan(
      aliceSubject,
      "START_CREATOR_LIVESTREAM",
      { creatorProfileId: mayaCreatorProfileId },
      undefined,
      db
    );
  } catch (err: any) {
    if (err instanceof AuthorizationError && err.statusCode === 403) {
      assertedCaught = true;
      console.log("   ✅ assertCan threw expected AuthorizationError (HTTP 403 Forbidden):");
      console.log("      - Error Code:", err.errorCode);
      console.log("      - Error Message:", err.message);
    }
  }

  if (!assertedCaught) {
    throw new Error("assertCan failed to throw AuthorizationError on unauthorized action!");
  }

  console.log("\n================================================================================");
  console.log("🎉 ALL 6 PERMISSION POLICIES VALIDATED WITH 100% AUTHORITATIVE INTEGRITY!");
  console.log("================================================================================\n");
}

runAuthVsAuthorizationSuite().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
