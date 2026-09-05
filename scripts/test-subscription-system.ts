/**
 * Comprehensive End-to-End Verification Test Script
 * for the Authoritative Subscriptions & Entitlement System
 */

import {
  SubscriptionProductService,
  SubscriptionPaymentService,
  SubscriptionService,
  EntitlementService,
  SubscriptionTier,
  SubscriptionStatus,
  PaymentGateway,
} from "../src/modules/subscription";

/**
 * In-Memory Database Store simulating Prisma PostgreSQL operations
 */
class InMemorySubscriptionDatabase {
  users: Map<string, any> = new Map();
  creatorProfiles: Map<string, any> = new Map();
  subscriptionProducts: Map<string, any> = new Map();
  subscriptions: Map<string, any> = new Map();
  subscriptionPayments: Map<string, any> = new Map();
  contents: Map<string, any> = new Map();
  follows: Map<string, any> = new Map();
  contentPurchases: Map<string, any> = new Map();
  creatorEarnings: Map<string, any> = new Map();

  get user() {
    return {
      create: async ({ data }: { data: any }) => {
        const id = data.id || `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const record = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
        this.users.set(id, record);
        return record;
      },
      findUnique: async ({ where }: { where: any }) => {
        if (where.id) return this.users.get(where.id) || null;
        if (where.email) {
          for (const u of this.users.values()) {
            if (u.email === where.email) return u;
          }
        }
        return null;
      },
    };
  }

  get creatorProfile() {
    return {
      create: async ({ data }: { data: any }) => {
        const id = data.id || `cp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const record = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
        this.creatorProfiles.set(id, record);
        return record;
      },
      findUnique: async ({ where, select }: { where: any; select?: any }) => {
        let cp = null;
        if (where.id) cp = this.creatorProfiles.get(where.id) || null;
        if (where.userId) {
          for (const c of this.creatorProfiles.values()) {
            if (c.userId === where.userId) {
              cp = c;
              break;
            }
          }
        }
        if (!cp) return null;
        if (select) {
          const res: any = {};
          for (const k of Object.keys(select)) {
            res[k] = cp[k];
          }
          return res;
        }
        return cp;
      },
    };
  }

  get subscriptionProduct() {
    return {
      create: async ({ data }: { data: any }) => {
        const id = data.id || `prod_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const record = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
        this.subscriptionProducts.set(id, record);
        return record;
      },
      findUnique: async ({ where }: { where: any }) => {
        return this.subscriptionProducts.get(where.id) || null;
      },
      findFirst: async ({ where }: { where: any }) => {
        for (const p of this.subscriptionProducts.values()) {
          let match = true;
          if (where.id && p.id !== where.id) match = false;
          if (where.creatorProfileId && p.creatorProfileId !== where.creatorProfileId) match = false;
          if (where.isActive !== undefined && p.isActive !== where.isActive) match = false;
          if (where.isArchived !== undefined && p.isArchived !== where.isArchived) match = false;
          if (match) return p;
        }
        return null;
      },
      findMany: async ({ where }: { where?: any } = {}) => {
        const list: any[] = [];
        for (const p of this.subscriptionProducts.values()) {
          let match = true;
          if (where?.creatorProfileId && p.creatorProfileId !== where.creatorProfileId) match = false;
          if (where?.isArchived !== undefined && p.isArchived !== where.isArchived) match = false;
          if (match) list.push(p);
        }
        return list;
      },
      update: async ({ where, data }: { where: any; data: any }) => {
        const existing = this.subscriptionProducts.get(where.id);
        if (!existing) throw new Error("Product not found");
        const updated = { ...existing, ...data, updatedAt: new Date() };
        this.subscriptionProducts.set(where.id, updated);
        return updated;
      },
    };
  }

  get subscription() {
    return {
      create: async ({ data }: { data: any }) => {
        const id = data.id || `sub_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const record = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
        this.subscriptions.set(id, record);
        return record;
      },
      findUnique: async ({ where, include }: { where: any; include?: any }) => {
        let sub = null;
        if (where.id) sub = this.subscriptions.get(where.id) || null;
        if (where.fanId_creatorProfileId) {
          const { fanId, creatorProfileId } = where.fanId_creatorProfileId;
          for (const s of this.subscriptions.values()) {
            if (s.fanId === fanId && s.creatorProfileId === creatorProfileId) {
              sub = s;
              break;
            }
          }
        }
        if (!sub) return null;
        const res = { ...sub };
        if (include?.product && sub.productId) {
          res.product = this.subscriptionProducts.get(sub.productId) || null;
        }
        return res;
      },
      findMany: async ({ where, include }: { where?: any; include?: any } = {}) => {
        const list: any[] = [];
        for (const s of this.subscriptions.values()) {
          let match = true;
          if (where?.productId && s.productId !== where.productId) match = false;
          if (where?.fanId && s.fanId !== where.fanId) match = false;
          if (where?.status?.in && !where.status.in.includes(s.status)) match = false;
          if (match) {
            const res = { ...s };
            if (include?.product && s.productId) {
              res.product = this.subscriptionProducts.get(s.productId) || null;
            }
            list.push(res);
          }
        }
        return list;
      },
      update: async ({ where, data }: { where: any; data: any }) => {
        const existing = this.subscriptions.get(where.id);
        if (!existing) throw new Error("Subscription not found");
        const updated = { ...existing, ...data, updatedAt: new Date() };
        this.subscriptions.set(where.id, updated);
        return updated;
      },
      updateMany: async ({ where, data }: { where: any; data: any }) => {
        let count = 0;
        for (const s of this.subscriptions.values()) {
          let match = true;
          if (where.productId && s.productId !== where.productId) match = false;
          if (where.status?.in && !where.status.in.includes(s.status)) match = false;
          if (match) {
            const updated = { ...s, ...data, updatedAt: new Date() };
            this.subscriptions.set(s.id, updated);
            count++;
          }
        }
        return { count };
      },
    };
  }

  get subscriptionPayment() {
    return {
      create: async ({ data }: { data: any }) => {
        const id = data.id || `pay_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const record = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
        this.subscriptionPayments.set(id, record);
        return record;
      },
      findUnique: async ({ where }: { where: any }) => {
        if (where.id) return this.subscriptionPayments.get(where.id) || null;
        if (where.idempotencyKey) {
          for (const p of this.subscriptionPayments.values()) {
            if (p.idempotencyKey === where.idempotencyKey) return p;
          }
        }
        return null;
      },
      count: async ({ where }: { where: any }) => {
        let c = 0;
        for (const p of this.subscriptionPayments.values()) {
          if (where.subscriptionId && p.subscriptionId === where.subscriptionId) c++;
        }
        return c;
      },
      findMany: async ({ where }: { where: any }) => {
        const list: any[] = [];
        for (const p of this.subscriptionPayments.values()) {
          if (where.subscriptionId && p.subscriptionId === where.subscriptionId) list.push(p);
        }
        return list;
      },
    };
  }

  get creatorEarning() {
    return {
      create: async ({ data }: { data: any }) => {
        const id = data.id || `earn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const record = { ...data, id, createdAt: new Date() };
        this.creatorEarnings.set(id, record);
        return record;
      },
    };
  }

  get content() {
    return {
      create: async ({ data }: { data: any }) => {
        const id = data.id || `content_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const record = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
        this.contents.set(id, record);
        return record;
      },
      findUnique: async ({ where, include }: { where: any; include?: any }) => {
        const c = this.contents.get(where.id);
        if (!c) return null;
        const res = { ...c };
        if (include?.creatorProfile && c.creatorProfileId) {
          res.creatorProfile = this.creatorProfiles.get(c.creatorProfileId) || null;
        }
        return res;
      },
    };
  }

  get follow() {
    return {
      findUnique: async ({ where }: { where: any }) => {
        if (where.followerId_creatorProfileId) {
          const { followerId, creatorProfileId } = where.followerId_creatorProfileId;
          return this.follows.get(`${followerId}_${creatorProfileId}`) || null;
        }
        return null;
      },
    };
  }

  get contentPurchase() {
    return {
      findUnique: async ({ where }: { where: any }) => {
        if (where.contentId_fanId) {
          const { contentId, fanId } = where.contentId_fanId;
          return this.contentPurchases.get(`${contentId}_${fanId}`) || null;
        }
        return null;
      },
    };
  }

  async $transaction(cb: (tx: any) => Promise<any>) {
    return await cb(this);
  }
}

async function runSubscriptionVerification() {
  console.log("================================================================================");
  console.log("🚀 STARTING SUBSCRIPTION & ENTITLEMENT SYSTEM VERIFICATION SUITE");
  console.log("================================================================================\n");

  const db = new InMemorySubscriptionDatabase();
  const testSuffix = Date.now().toString().slice(-6);

  try {
    // ----------------------------------------------------------------------------
    // SETUP: Create Creator and Fan test accounts
    // ----------------------------------------------------------------------------
    console.log("Step 1: Setting up Test Creator and Fan User Accounts...");

    const creatorUser = await db.user.create({
      data: {
        email: `creator_${testSuffix}@example.com`,
        username: `creator_${testSuffix}`,
        displayName: "Elena Vance (Creator)",
        role: "CREATOR",
        kycStatus: "COMPLIANCE_2257_APPROVED",
      },
    });

    const creatorProfile = await db.creatorProfile.create({
      data: {
        userId: creatorUser.id,
        stageName: "Elena Vance Live",
        category: "Interactive",
      },
    });

    const fan1User = await db.user.create({
      data: {
        email: `fan1_${testSuffix}@example.com`,
        username: `fan1_${testSuffix}`,
        displayName: "Alice Superfan",
        role: "FAN",
        kycStatus: "AGE_VERIFIED",
      },
    });

    const fan2User = await db.user.create({
      data: {
        email: `fan2_${testSuffix}@example.com`,
        username: `fan2_${testSuffix}`,
        displayName: "Bob Latecomer",
        role: "FAN",
        kycStatus: "AGE_VERIFIED",
      },
    });

    console.log(`✅ Created Creator: ${creatorProfile.id} (${creatorUser.displayName})`);
    console.log(`✅ Created Fan 1: ${fan1User.id} (${fan1User.displayName})`);
    console.log(`✅ Created Fan 2: ${fan2User.id} (${fan2User.displayName})\n`);

    // ----------------------------------------------------------------------------
    // CONCEPT 1: Creator's Subscription Products
    // Fan — €9.99/month, VIP — €24.99/month
    // ----------------------------------------------------------------------------
    console.log("--------------------------------------------------------------------------------");
    console.log("CONCEPT 1: Defining Creator's Subscription Products (Fan €9.99 & VIP €24.99)");
    console.log("--------------------------------------------------------------------------------");

    const fanProduct = await SubscriptionProductService.createProduct(
      {
        creatorProfileId: creatorProfile.id,
        name: "Fan",
        tier: SubscriptionTier.BASIC,
        tierLevel: 1,
        description: "Standard fan tier: subscriber chat, badges, and subscriber content.",
        priceFiatCents: 999, // €9.99/month
        currency: "EUR",
        billingInterval: "MONTHLY",
        entitlements: ["SUBSCRIBER_CONTENT", "SUBSCRIBER_CHAT", "CUSTOM_BADGE"],
        badgeColorHex: "#3B82F6",
      },
      db
    );

    const vipProduct = await SubscriptionProductService.createProduct(
      {
        creatorProfileId: creatorProfile.id,
        name: "VIP",
        tier: SubscriptionTier.VIP,
        tierLevel: 2,
        description: "VIP tier: All fan perks + subscriber-only lives, VIP media vault, and DM access.",
        priceFiatCents: 2499, // €24.99/month
        currency: "EUR",
        billingInterval: "MONTHLY",
        entitlements: [
          "SUBSCRIBER_CONTENT",
          "SUBSCRIBER_CHAT",
          "SUBSCRIBER_LIVE",
          "VIP_MEDIA",
          "DIRECT_MESSAGES",
          "CUSTOM_BADGE",
        ],
        badgeColorHex: "#9333EA",
      },
      db
    );

    console.log(`✅ Created Product: "${fanProduct.name}" — €${(fanProduct.priceFiatCents / 100).toFixed(2)}/month (ID: ${fanProduct.id})`);
    console.log(`   Entitlements: ${fanProduct.entitlements}`);
    console.log(`✅ Created Product: "${vipProduct.name}" — €${(vipProduct.priceFiatCents / 100).toFixed(2)}/month (ID: ${vipProduct.id})`);
    console.log(`   Entitlements: ${vipProduct.entitlements}\n`);

    // ----------------------------------------------------------------------------
    // CONCEPT 2 & 3: Customer's Subscription & Payments
    // Fan 1 Subscribes to Fan (€9.99/month)
    // ----------------------------------------------------------------------------
    console.log("--------------------------------------------------------------------------------");
    console.log("CONCEPT 2 & 3: Customer's Subscription & Associated Payment Ledger");
    console.log("--------------------------------------------------------------------------------");

    const sub1Result = await SubscriptionService.subscribe(
      {
        fanId: fan1User.id,
        creatorProfileId: creatorProfile.id,
        productId: fanProduct.id,
        paymentGateway: PaymentGateway.STRIPE,
        paymentMethod: "card_visa_4242",
        idempotencyKey: `init_sub_${fan1User.id}_${Date.now()}`,
      },
      db
    );

    const sub1 = sub1Result.subscription;
    const pay1 = sub1Result.payment;

    console.log(`✅ Fan 1 subscribed successfully:`);
    console.log(`   Subscription ID: ${sub1.id}`);
    console.log(`   Status: ${sub1.status}`);
    console.log(`   Tier: ${sub1.tierName} (Level ${sub1.tierLevel})`);
    console.log(`   Locked Price: €${(sub1.billingPriceCents / 100).toFixed(2)} ${sub1.billingCurrency}`);
    console.log(`   Period: ${sub1.currentPeriodStart.toISOString()} -> ${sub1.currentPeriodEnd.toISOString()}`);
    console.log(`   Renewal Date: ${sub1.renewalDate.toISOString()}`);
    console.log(`   Auto Renew: ${sub1.autoRenew}`);

    console.log(`✅ Associated Initial Payment Recorded:`);
    console.log(`   Payment ID: ${pay1.id}`);
    console.log(`   Amount: €${(pay1.amountCents / 100).toFixed(2)} ${pay1.currency}`);
    console.log(`   Platform Fee (20%): €${(pay1.platformFeeCents / 100).toFixed(2)}`);
    console.log(`   Creator Net (80%): €${(pay1.creatorNetCents / 100).toFixed(2)}`);
    console.log(`   Status: ${pay1.status}\n`);

    // ----------------------------------------------------------------------------
    // PRICE GRANDFATHERING GUARANTEE VERIFICATION
    // "The creator cannot simply modify an active customer’s current price without your subscription rules handling it correctly."
    // ----------------------------------------------------------------------------
    console.log("--------------------------------------------------------------------------------");
    console.log("PRICE GRANDFATHERING RULE: Creator raises Fan price from €9.99 to €14.99");
    console.log("--------------------------------------------------------------------------------");

    const updateResult = await SubscriptionProductService.updateProduct(
      {
        productId: fanProduct.id,
        creatorProfileId: creatorProfile.id,
        priceFiatCents: 1499, // €14.99/month
        pricePolicy: {
          grandfatherExisting: true, // Existing subscribers keep locked €9.99 price
        },
      },
      db
    );

    console.log(`✅ Product updated from €${(updateResult.previousPriceCents / 100).toFixed(2)} to €${(updateResult.newPriceCents / 100).toFixed(2)}`);
    console.log(`   Active subscribers grandfathered: ${updateResult.activeSubscribersGrandfatheredCount}`);

    // Verify Fan 1's subscription in DB: Must retain €9.99 locked price!
    const fan1SubRefetched = await SubscriptionService.getSubscription(fan1User.id, creatorProfile.id, db);
    if (!fan1SubRefetched) throw new Error("Fan 1 subscription not found");

    console.log(`\n🔍 Verifying Fan 1 Grandfathered Price:`);
    console.log(`   Fan 1 Locked Price: €${(fan1SubRefetched.billingPriceCents / 100).toFixed(2)} (Expected: €9.99)`);
    console.log(`   Is Price Grandfathered: ${fan1SubRefetched.isPriceGrandfathered} (Expected: true)`);
    console.log(`   Original Price: €${((fan1SubRefetched.grandfatheredOriginalPriceCents || 0) / 100).toFixed(2)}`);

    if (fan1SubRefetched.billingPriceCents !== 999 || !fan1SubRefetched.isPriceGrandfathered) {
      throw new Error(`❌ Price grandfathering failed! Expected €9.99, got €${fan1SubRefetched.billingPriceCents / 100}`);
    }
    console.log("✅ Price Grandfathering Guarantee PASSED: Fan 1 retains locked €9.99/mo rate!\n");

    // Fan 2 subscribes after price increase: Must pay new €14.99 price
    const sub2Result = await SubscriptionService.subscribe(
      {
        fanId: fan2User.id,
        creatorProfileId: creatorProfile.id,
        productId: fanProduct.id,
        idempotencyKey: `init_sub_${fan2User.id}_${Date.now()}`,
      },
      db
    );
    const sub2 = sub2Result.subscription;

    console.log(`🔍 Verifying New Fan 2 Subscription Price:`);
    console.log(`   Fan 2 Price: €${(sub2.billingPriceCents / 100).toFixed(2)} (Expected: €14.99)`);
    console.log(`   Is Grandfathered: ${sub2.isPriceGrandfathered} (Expected: false)`);

    if (sub2.billingPriceCents !== 1499) {
      throw new Error(`❌ New subscriber pricing failed! Expected €14.99, got €${sub2.billingPriceCents / 100}`);
    }
    console.log("✅ New Subscriber Pricing PASSED: Fan 2 pays new €14.99/mo rate!\n");

    // ----------------------------------------------------------------------------
    // RECURRING RENEWAL WITH GRANDFATHERED PRICE
    // ----------------------------------------------------------------------------
    console.log("--------------------------------------------------------------------------------");
    console.log("RENEWAL EXECUTION: Renewing Fan 1 subscription at grandfathered €9.99 price");
    console.log("--------------------------------------------------------------------------------");

    const renewResult = await SubscriptionService.renew(
      {
        subscriptionId: fan1SubRefetched.id,
        idempotencyKey: `renew_test_${fan1SubRefetched.id}_${Date.now()}`,
      },
      db
    );

    console.log(`✅ Renewal Success: ${renewResult.success}`);
    console.log(`   New Period End: ${renewResult.subscription.currentPeriodEnd.toISOString()}`);
    console.log(`   Charged Amount: €${(renewResult.payment.amountCents / 100).toFixed(2)} (Expected: €9.99)`);

    if (renewResult.payment.amountCents !== 999) {
      throw new Error(`❌ Grandfathered renewal charged wrong price: €${renewResult.payment.amountCents / 100}`);
    }
    console.log("✅ Grandfathered Renewal PASSED!\n");

    // ----------------------------------------------------------------------------
    // AUTHORITATIVE ENTITLEMENT SYSTEM VERIFICATION
    // “Does this fan currently possess entitlement X?”
    // ----------------------------------------------------------------------------
    console.log("--------------------------------------------------------------------------------");
    console.log("ENTITLEMENT SYSTEM: “Does this fan currently possess entitlement X?”");
    console.log("--------------------------------------------------------------------------------");

    const checkSubContent = await EntitlementService.hasEntitlement(
      {
        fanId: fan1User.id,
        creatorProfileId: creatorProfile.id,
        entitlement: "SUBSCRIBER_CONTENT",
      },
      db
    );
    console.log(`1. Fan 1 -> "SUBSCRIBER_CONTENT": Allowed = ${checkSubContent.hasEntitlement} (${checkSubContent.reason})`);
    if (!checkSubContent.hasEntitlement) throw new Error("Fan 1 should have SUBSCRIBER_CONTENT");

    const checkSubChat = await EntitlementService.hasEntitlement(
      {
        fanId: fan1User.id,
        creatorProfileId: creatorProfile.id,
        entitlement: "SUBSCRIBER_CHAT",
      },
      db
    );
    console.log(`2. Fan 1 -> "SUBSCRIBER_CHAT": Allowed = ${checkSubChat.hasEntitlement} (${checkSubChat.reason})`);
    if (!checkSubChat.hasEntitlement) throw new Error("Fan 1 should have SUBSCRIBER_CHAT");

    const checkSubLive = await EntitlementService.hasEntitlement(
      {
        fanId: fan1User.id,
        creatorProfileId: creatorProfile.id,
        entitlement: "SUBSCRIBER_LIVE",
      },
      db
    );
    console.log(`3. Fan 1 -> "SUBSCRIBER_LIVE" (VIP perk): Allowed = ${checkSubLive.hasEntitlement} (${checkSubLive.reason})`);
    if (checkSubLive.hasEntitlement) throw new Error("Fan 1 on standard Fan tier should NOT have SUBSCRIBER_LIVE");

    // Check Creator Authority Bypass:
    const checkCreatorBypass = await EntitlementService.hasEntitlement(
      {
        fanId: creatorUser.id,
        creatorProfileId: creatorProfile.id,
        entitlement: "SUBSCRIBER_LIVE",
      },
      db
    );
    console.log(`4. Creator Self -> "SUBSCRIBER_LIVE": Allowed = ${checkCreatorBypass.hasEntitlement} (${checkCreatorBypass.reason})`);
    if (!checkCreatorBypass.hasEntitlement || !checkCreatorBypass.isBypassed) {
      throw new Error("Creator must have full authority bypass for own content");
    }

    // Check Unsubscribed User
    const nonSubUser = await db.user.create({
      data: {
        email: `nonsub_${testSuffix}@example.com`,
        username: `nonsub_${testSuffix}`,
        displayName: "Charlie Stranger",
        role: "FAN",
      },
    });

    const checkNonSub = await EntitlementService.hasEntitlement(
      {
        fanId: nonSubUser.id,
        creatorProfileId: creatorProfile.id,
        entitlement: "SUBSCRIBER_CONTENT",
      },
      db
    );
    console.log(`5. Non-Subscriber -> "SUBSCRIBER_CONTENT": Allowed = ${checkNonSub.hasEntitlement} (${checkNonSub.reason})`);
    if (checkNonSub.hasEntitlement) throw new Error("Non-subscriber should NOT have SUBSCRIBER_CONTENT");

    console.log("✅ Entitlement Checks PASSED!\n");

    // ----------------------------------------------------------------------------
    // SUBSCRIBER-ONLY CONTENT, CHAT & LIVE GATES
    // ----------------------------------------------------------------------------
    console.log("--------------------------------------------------------------------------------");
    console.log("AUTHORIZATION GATES: Content, Chat, and Livestream Access Control");
    console.log("--------------------------------------------------------------------------------");

    // 1. Subscriber-Only Content
    const subOnlyContent = await db.content.create({
      data: {
        creatorProfileId: creatorProfile.id,
        title: "Exclusive Backstage Photoset",
        contentType: "PHOTO",
        accessLevel: "SUBSCRIBERS_ONLY",
        mediaUrl: "https://media.platform.local/photos/exclusive1.jpg",
      },
    });

    const contentAccessFan1 = await EntitlementService.authorizeContentAccess(
      {
        fanId: fan1User.id,
        contentId: subOnlyContent.id,
      },
      db
    );
    console.log(`1. Content Access (Fan 1 Subscriber): Allowed = ${contentAccessFan1.allowed} (${contentAccessFan1.reason})`);
    if (!contentAccessFan1.allowed) throw new Error("Fan 1 should be allowed to view subscriber content");

    const contentAccessNonSub = await EntitlementService.authorizeContentAccess(
      {
        fanId: nonSubUser.id,
        contentId: subOnlyContent.id,
      },
      db
    );
    console.log(`2. Content Access (Non-Subscriber): Allowed = ${contentAccessNonSub.allowed} (${contentAccessNonSub.reason})`);
    if (contentAccessNonSub.allowed) throw new Error("Non-subscriber should NOT access subscriber content");

    // 2. Subscriber-Only Chat
    const chatAccessFan1 = await EntitlementService.authorizeChatAccess(
      {
        fanId: fan1User.id,
        creatorProfileId: creatorProfile.id,
        isSubscribersOnlyChat: true,
      },
      db
    );
    console.log(`3. Chat Access (Fan 1 Subscriber): Allowed = ${chatAccessFan1.allowed} (${chatAccessFan1.reason})`);
    if (!chatAccessFan1.allowed) throw new Error("Fan 1 should be allowed to chat in subscriber chat");

    const chatAccessNonSub = await EntitlementService.authorizeChatAccess(
      {
        fanId: nonSubUser.id,
        creatorProfileId: creatorProfile.id,
        isSubscribersOnlyChat: true,
      },
      db
    );
    console.log(`4. Chat Access (Non-Subscriber): Allowed = ${chatAccessNonSub.allowed} (${chatAccessNonSub.reason})`);
    if (chatAccessNonSub.allowed) throw new Error("Non-subscriber should NOT access subscriber chat");

    // 3. Subscriber-Only Livestream Broadcast
    const liveAccessFan1 = await EntitlementService.authorizeLiveStreamAccess(
      {
        fanId: fan1User.id,
        creatorProfileId: creatorProfile.id,
        streamMode: "SUBSCRIBERS_ONLY",
      },
      db
    );
    console.log(`5. Livestream Access (Fan 1 on standard Fan tier): Allowed = ${liveAccessFan1.allowed}`);

    // Upgrade Fan 1 to VIP to test VIP Live access
    console.log("\nUpgrading Fan 1 to VIP Tier (€24.99/mo)...");
    const upgradeResult = await SubscriptionService.upgradeOrDowngrade(
      {
        subscriptionId: fan1SubRefetched.id,
        fanId: fan1User.id,
        newProductId: vipProduct.id,
        idempotencyKey: `upgrade_${fan1User.id}_${Date.now()}`,
      },
      db
    );
    console.log(`✅ Upgraded to Tier: ${upgradeResult.tierName} (Level ${upgradeResult.tierLevel})`);

    const liveAccessFan1AfterUpgrade = await EntitlementService.authorizeLiveStreamAccess(
      {
        fanId: fan1User.id,
        creatorProfileId: creatorProfile.id,
        streamMode: "SUBSCRIBERS_ONLY",
      },
      db
    );
    console.log(`6. Livestream Access (Fan 1 after VIP upgrade): Allowed = ${liveAccessFan1AfterUpgrade.allowed} (${liveAccessFan1AfterUpgrade.reason})`);
    if (!liveAccessFan1AfterUpgrade.allowed) throw new Error("Fan 1 should access subscriber live after VIP upgrade");

    console.log("✅ Content, Chat, and Livestream Gates PASSED!\n");

    // ----------------------------------------------------------------------------
    // SUBSCRIPTION LIFECYCLE STATES: PAUSED, RESUMED, CANCELLED, PAST_DUE
    // ----------------------------------------------------------------------------
    console.log("--------------------------------------------------------------------------------");
    console.log("LIFECYCLE STATES: Paused, Resumed, Cancelled, and Past Due Handling");
    console.log("--------------------------------------------------------------------------------");

    // 1. Pause
    const pausedSub = await SubscriptionService.pause(
      {
        subscriptionId: upgradeResult.id,
        fanId: fan1User.id,
        reason: "Going on vacation",
      },
      db
    );
    console.log(`1. Paused: Status = ${pausedSub.status}, isPaused = ${pausedSub.isPaused}`);

    // Verify entitlements suspended while paused
    const checkWhilePaused = await EntitlementService.hasEntitlement(
      {
        fanId: fan1User.id,
        creatorProfileId: creatorProfile.id,
        entitlement: "SUBSCRIBER_CONTENT",
      },
      db
    );
    console.log(`   Entitlement check during pause: Allowed = ${checkWhilePaused.hasEntitlement} (${checkWhilePaused.reason})`);
    if (checkWhilePaused.hasEntitlement) throw new Error("Entitlements must be suspended during pause");

    // 2. Resume
    const resumedSub = await SubscriptionService.resume(
      {
        subscriptionId: upgradeResult.id,
        fanId: fan1User.id,
      },
      db
    );
    console.log(`2. Resumed: Status = ${resumedSub.status}, isPaused = ${resumedSub.isPaused}`);

    const checkAfterResume = await EntitlementService.hasEntitlement(
      {
        fanId: fan1User.id,
        creatorProfileId: creatorProfile.id,
        entitlement: "SUBSCRIBER_CONTENT",
      },
      db
    );
    console.log(`   Entitlement check after resume: Allowed = ${checkAfterResume.hasEntitlement}`);
    if (!checkAfterResume.hasEntitlement) throw new Error("Entitlements must be restored after resume");

    // 3. Cancel at period end
    const cancelSub = await SubscriptionService.cancel(
      {
        subscriptionId: upgradeResult.id,
        fanId: fan1User.id,
        reason: "No longer needed",
        cancelImmediately: false,
      },
      db
    );
    console.log(`3. Cancel at period end: autoRenew = ${cancelSub.autoRenew}, cancelAtPeriodEnd = ${cancelSub.cancelAtPeriodEnd}`);

    // Fan retains access until currentPeriodEnd!
    const checkDuringCancelGrace = await EntitlementService.hasEntitlement(
      {
        fanId: fan1User.id,
        creatorProfileId: creatorProfile.id,
        entitlement: "SUBSCRIBER_CONTENT",
      },
      db
    );
    console.log(`   Entitlement check before period expires: Allowed = ${checkDuringCancelGrace.hasEntitlement}`);
    if (!checkDuringCancelGrace.hasEntitlement) throw new Error("User must retain access until period end");

    // 4. Past Due & Dunning Retries Simulation
    console.log("4. Simulating renewal payment failure -> Past Due Transition...");
    const failedSub = await SubscriptionService.handleRenewalFailure({
      subscription: cancelSub,
      error: "Card expired or insufficient balance",
      billingCycleIndex: 3,
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      amountCents: 2499,
      currency: "EUR",
      tx: db,
    });
    console.log(`   Status = ${failedSub.status}, Failed Attempts = ${failedSub.failedPaymentAttempts}`);
    console.log(`   Grace Period Ends At = ${failedSub.gracePeriodEndsAt?.toISOString()}`);
    console.log(`   Last Error = ${failedSub.lastPaymentError}`);

    // Verify access maintained within grace period
    const checkPastDueInGrace = await EntitlementService.hasEntitlement(
      {
        fanId: fan1User.id,
        creatorProfileId: creatorProfile.id,
        entitlement: "SUBSCRIBER_CONTENT",
      },
      db
    );
    console.log(`   Entitlement check in 3-day grace period: Allowed = ${checkPastDueInGrace.hasEntitlement}`);
    if (!checkPastDueInGrace.hasEntitlement) throw new Error("User should retain grace access during past due");

    console.log("\n================================================================================");
    console.log("🎉 ALL SUBSCRIPTION & ENTITLEMENT SYSTEM TESTS PASSED SUCCESSFULLY!");
    console.log("================================================================================\n");
  } catch (error: any) {
    console.error("❌ TEST RUNNER FAILED:", error);
    process.exit(1);
  }
}

runSubscriptionVerification();
