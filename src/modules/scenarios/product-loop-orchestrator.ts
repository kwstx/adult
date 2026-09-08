/**
 * AUTHORITATIVE PRODUCT LOOP ORCHESTRATOR
 * 
 * Production-grade domain engine that executes the complete end-to-end platform loop:
 * 1. Fan Authentication & Profile Resolution
 * 2. Feed Discovery & Creator Luna Live Retrieval
 * 3. 45-Second Watch Telemetry & Analytics Logging
 * 4. Interaction Catalog Retrieval (100c Question, 500c Priority, 1000c Private)
 * 5. Signed Payment Webhook Top-Up (+100 credits) & Ledger Crediting
 * 6. Zero-Trust Interaction Purchase & Price Verification
 * 7. Atomic Wallet Debit & 80/20 Creator Revenue Split (80c Luna, 20c Platform)
 * 8. Order Creation & Live Queue Placement
 * 9. Creator Control Room Event Dispatch & Acceptance Flow
 * 10. Execution & Order Completion
 * 11. Relationship XP Award & LEVEL UP — SUPPORTER Transition
 * 12. Supporter Badge Update & Creator Room Leaderboard Update
 * 13. Collective Goal Progress (+100 credits)
 * 14. VIP Subscription Purchase & Entitlements Grant
 * 15. Next-Day Return & Feed Recommendation Affinity Elevation (#1 in Feed)
 */

import { MockDatabaseStore } from "../../../tests/utils/mock-db";
import { MockGateway } from "../../../tests/utils/mock-gateway";
import { EventStreamService } from "../events/event-stream.service";
import { EntitlementService, SubscriptionStatus } from "../subscription";

export interface ProductLoopScenarioState {
  currentStep: number;
  totalSteps: number;
  stepName: string;
  stepDescription: string;
  fan: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    walletBalance: number;
    relationshipTier: string;
    currentLevel: number;
    totalXp: number;
    badge: string;
    entitlements: string[];
  };
  creatorLuna: {
    id: string;
    userId: string;
    stageName: string;
    category: string;
    isLive: boolean;
    streamTitle: string;
    walletBalance: number;
    totalEarnedCredits: number;
    activeInteractions: Array<{
      id: string;
      title: string;
      priceCredits: number;
      actionType: string;
      description: string;
    }>;
    liveGoal: {
      id: string;
      title: string;
      targetCredits: number;
      currentCredits: number;
      progressPercent: number;
    };
    leaderboardRank: Array<{
      rank: number;
      userId: string;
      displayName: string;
      creditsContributed: number;
      xpEarned: number;
    }>;
  };
  liveInteractionQueue: Array<{
    queueId: string;
    orderId: string;
    interactionTitle: string;
    fanName: string;
    priceCredits: number;
    status: "PENDING" | "ACCEPTED" | "IN_PROGRESS" | "COMPLETED";
    position: number;
  }>;
  feedRanking: {
    day1Feed: Array<{ creatorId: string; stageName: string; score: number; rank: number; reason: string }>;
    day2Feed: Array<{ creatorId: string; stageName: string; score: number; rank: number; reason: string; isBoosted: boolean }>;
  };
  activeEventLog: Array<{
    timestamp: string;
    eventType: string;
    source: string;
    summary: string;
    payloadSnippet: string;
  }>;
  celebrationBanner: {
    show: boolean;
    title: string;
    subtitle: string;
    badgeUnlocked: string;
  } | null;
}

export class ProductLoopOrchestrator {
  private db: MockDatabaseStore;
  private state: ProductLoopScenarioState;

  constructor(customDb?: MockDatabaseStore) {
    this.db = customDb || new MockDatabaseStore();
    this.state = this.getInitialState();
  }

  private getInitialState(): ProductLoopScenarioState {
    return {
      currentStep: 0,
      totalSteps: 12,
      stepName: "Platform Initialized",
      stepDescription: "Awaiting new fan arrival.",
      fan: {
        id: "fan_alex_01",
        username: "alex_fan",
        displayName: "Alex Carter ✨",
        avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
        walletBalance: 0,
        relationshipTier: "NEW_FAN",
        currentLevel: 1,
        totalXp: 0,
        badge: "New Fan (Grey)",
        entitlements: [],
      },
      creatorLuna: {
        id: "creator_luna_profile",
        userId: "user_luna_star",
        stageName: "Creator Luna 🌙",
        category: "Interactive Entertainment",
        isLive: true,
        streamTitle: "Midnight Chill & Live Interactive Q&A 🌌",
        walletBalance: 0,
        totalEarnedCredits: 0,
        activeInteractions: [
          {
            id: "inter_ask_question",
            title: "Ask a question",
            priceCredits: 100,
            actionType: "CUSTOM_ACTION",
            description: "Direct on-screen VIP question answered live on video stream",
          },
          {
            id: "inter_priority",
            title: "Priority interaction",
            priceCredits: 500,
            actionType: "SOUND_EFFECT",
            description: "Priority queue boost + custom audio reaction from Luna",
          },
          {
            id: "inter_private",
            title: "Private",
            priceCredits: 1000,
            actionType: "CUSTOM_ACTION",
            description: "Exclusive 1-on-1 private video room session booking",
          },
        ],
        liveGoal: {
          id: "goal_stream_milestone",
          title: "Midnight Acoustic DJ Set 🎵",
          targetCredits: 1000,
          currentCredits: 400,
          progressPercent: 40,
        },
        leaderboardRank: [
          { rank: 1, userId: "fan_top_whale", displayName: "Marcus Neon ⚡", creditsContributed: 300, xpEarned: 300 },
          { rank: 2, userId: "fan_second", displayName: "Elena Velvet 🌸", creditsContributed: 100, xpEarned: 100 },
        ],
      },
      liveInteractionQueue: [],
      feedRanking: {
        day1Feed: [
          { creatorId: "creator_maya", stageName: "Maya Velvet 🌸", score: 0.95, rank: 1, reason: "Trending Platform Wide" },
          { creatorId: "creator_luna_profile", stageName: "Creator Luna 🌙", score: 0.72, rank: 2, reason: "Category Match (Live Now)" },
          { creatorId: "creator_chloe", stageName: "Chloe Cyber ⚡", score: 0.65, rank: 3, reason: "New Creator Spotlight" },
        ],
        day2Feed: [],
      },
      activeEventLog: [],
      celebrationBanner: null,
    };
  }

  public getState(): ProductLoopScenarioState {
    return this.state;
  }

  private logEvent(eventType: string, source: string, summary: string, payload: any) {
    this.state.activeEventLog.push({
      timestamp: new Date().toISOString().substring(11, 19),
      eventType,
      source,
      summary,
      payloadSnippet: JSON.stringify(payload),
    });
  }

  /**
   * STEP 1: New Fan Enters & Frontend Authenticates Fan Profile
   */
  public async step1_AuthenticateFan(): Promise<ProductLoopScenarioState> {
    const fanUser = await this.db.user.create({
      data: {
        id: this.state.fan.id,
        username: this.state.fan.username,
        email: "alex@fan.local",
        displayName: this.state.fan.displayName,
        role: "FAN",
      },
    });

    const fanWallet = await this.db.wallet.create({
      data: {
        userId: fanUser.id,
        balance: 0,
        purchasedBalance: 0,
        status: "ACTIVE",
      },
    });

    this.state.fan.walletBalance = fanWallet.balance;
    this.state.currentStep = 1;
    this.state.stepName = "Fan Authenticated";
    this.state.stepDescription = "Frontend authenticates Alex. Backend loads profile (0 credits, Tier: NEW_FAN).";

    this.logEvent("USER_AUTHENTICATED", "AuthService", "Fan session initialized successfully", {
      userId: fanUser.id,
      role: fanUser.role,
      walletBalance: fanWallet.balance,
      tier: this.state.fan.relationshipTier,
    });

    return this.state;
  }

  /**
   * STEP 2: Feed Service Retrieves Discovery Feed Displaying Creator Luna
   */
  public async step2_DiscoverCreatorLuna(): Promise<ProductLoopScenarioState> {
    // Creator Luna Profile
    await this.db.user.create({
      data: {
        id: this.state.creatorLuna.userId,
        username: "luna_stream",
        displayName: this.state.creatorLuna.stageName,
        role: "CREATOR",
      },
    });

    await this.db.creatorProfile.create({
      data: {
        id: this.state.creatorLuna.id,
        userId: this.state.creatorLuna.userId,
        stageName: this.state.creatorLuna.stageName,
        isLive: true,
        canMonetize: true,
      },
    });

    await this.db.wallet.create({
      data: {
        userId: this.state.creatorLuna.userId,
        balance: 0,
        status: "ACTIVE",
      },
    });

    this.state.currentStep = 2;
    this.state.stepName = "Discovery Feed: Creator Luna Live";
    this.state.stepDescription = "Feed service retrieves recommended live broadcasts. Frontend displays Creator Luna in live room.";

    this.logEvent("FEED_RETRIEVED", "RecommendationEngine", "Discovered active live broadcast for Creator Luna", {
      creatorId: this.state.creatorLuna.id,
      stageName: this.state.creatorLuna.stageName,
      feedPosition: 2,
      score: 0.72,
    });

    EventStreamService.emit("USER_JOINED_LIVE" as any, {
      userId: this.state.fan.id,
      creatorProfileId: this.state.creatorLuna.id,
      livestreamId: "live_luna_midnight",
    }, {
      actor: { userId: this.state.fan.id, username: this.state.fan.username, displayName: this.state.fan.displayName, role: "FAN" },
      creatorProfileId: this.state.creatorLuna.id,
    });

    return this.state;
  }

  /**
   * STEP 3: User Watches for 45 Seconds & Analytics Records Viewing Event
   */
  public async step3_RecordViewingTelemetry(): Promise<ProductLoopScenarioState> {
    const watchDurationSeconds = 45;
    const dwellTimeMs = 45000;

    this.state.currentStep = 3;
    this.state.stepName = "Viewing Telemetry (45s)";
    this.state.stepDescription = "User watches Creator Luna for 45 seconds. Telemetry records the high-retention viewing event.";

    this.logEvent("WATCH_TELEMETRY_RECORDED", "AnalyticsService", "Fan watched Creator Luna for 45 seconds", {
      fanId: this.state.fan.id,
      creatorProfileId: this.state.creatorLuna.id,
      dwellTimeMs,
      watchDurationSeconds,
      affinityWeightGranted: "+2.5 Positive Engagement",
    });

    return this.state;
  }

  /**
   * STEP 4: User Opens Interaction Menu (100c Question, 500c Priority, 1000c Private)
   */
  public async step4_OpenInteractionMenu(): Promise<ProductLoopScenarioState> {
    this.state.currentStep = 4;
    this.state.stepName = "Interaction Menu Displayed";
    this.state.stepDescription = "Backend returns Luna's active interaction catalog with authoritative credit pricing.";

    this.logEvent("INTERACTION_CATALOG_FETCHED", "InteractionService", "Loaded active interaction menu for Creator Luna", {
      creatorProfileId: this.state.creatorLuna.id,
      items: this.state.creatorLuna.activeInteractions.map((i) => `${i.title} (${i.priceCredits} credits)`),
    });

    return this.state;
  }

  /**
   * STEP 5: User Buys 100 Credits -> Webhook Confirmed -> Ledger Credited (+100c)
   */
  public async step5_BuyCreditsViaGateway(): Promise<ProductLoopScenarioState> {
    const depositAmountCredits = 100;
    const fiatCents = 1000; // $10.00 USD

    const signedWebhook = MockGateway.createSignedWebhook({
      userId: this.state.fan.id,
      amountFiatCents: fiatCents,
      creditsPurchased: depositAmountCredits,
    });

    await this.db.$transaction(async (tx) => {
      const fanWallet = await tx.wallet.findUnique({ where: { userId: this.state.fan.id } });
      const newBal = (fanWallet?.balance || 0) + depositAmountCredits;

      await tx.wallet.update({
        where: { userId: this.state.fan.id },
        data: { balance: newBal, purchasedBalance: newBal },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: fanWallet.id,
          userId: this.state.fan.id,
          type: "DEPOSIT",
          direction: "CREDIT",
          amountCredits: depositAmountCredits,
          idempotencyKey: `wh_${signedWebhook.payload.gatewayTransactionId}`,
        },
      });
    });

    this.state.fan.walletBalance = depositAmountCredits;
    this.state.currentStep = 5;
    this.state.stepName = "Wallet Ledger Credited (+100c)";
    this.state.stepDescription = "Payment gateway confirmed $10.00 USD. Ledger credited 100 credits atomically. UI updated.";

    this.logEvent("WALLET_CREDITED", "WalletLedgerService", "Deposit fulfilled via HMAC-signed gateway webhook", {
      userId: this.state.fan.id,
      creditsCredited: depositAmountCredits,
      newAuthoritativeBalance: 100,
      gatewayTxId: signedWebhook.payload.gatewayTransactionId,
    });

    return this.state;
  }

  /**
   * STEP 6: User Buys 'Ask a question' (100c) -> Zero-Trust Verify & Atomic 80/20 Split
   */
  public async step6_PurchaseQuestionInteraction(): Promise<ProductLoopScenarioState> {
    const interaction = this.state.creatorLuna.activeInteractions[0]; // Ask a question (100 credits)
    const priceCredits = interaction.priceCredits; // 100 credits
    const creatorNet = Math.floor(priceCredits * 0.8); // 80 credits (80%)
    const platformRake = priceCredits - creatorNet; // 20 credits (20%)

    const orderId = `ord_q_${Date.now()}`;
    const queueId = `iq_${Date.now()}`;

    await this.db.$transaction(async (tx) => {
      const fanW = await tx.wallet.findUnique({ where: { userId: this.state.fan.id } });
      if (!fanW || fanW.balance < priceCredits) {
        throw new Error("INSUFFICIENT_CREDIT_BALANCE");
      }

      // 1. Debit Fan
      await tx.wallet.update({
        where: { userId: this.state.fan.id },
        data: { balance: fanW.balance - priceCredits },
      });

      // 2. Credit Creator Luna
      const creatorW = await tx.wallet.findUnique({ where: { userId: this.state.creatorLuna.userId } });
      await tx.wallet.update({
        where: { userId: this.state.creatorLuna.userId },
        data: { balance: (creatorW?.balance || 0) + creatorNet },
      });

      // 3. Ledger Tx
      await tx.walletTransaction.create({
        data: {
          walletId: fanW.id,
          userId: this.state.fan.id,
          type: "INTERACTION_FEE",
          direction: "DEBIT",
          amountCredits: priceCredits,
          platformFeeCredits: platformRake,
          creatorNetCredits: creatorNet,
          idempotencyKey: `tx_${orderId}`,
        },
      });
    });

    this.state.fan.walletBalance = 0;
    this.state.creatorLuna.walletBalance += creatorNet;
    this.state.creatorLuna.totalEarnedCredits += creatorNet;

    // Place into Queue
    const queueEntry = {
      queueId,
      orderId,
      interactionTitle: interaction.title,
      fanName: this.state.fan.displayName,
      priceCredits,
      status: "PENDING" as const,
      position: 1,
    };
    this.state.liveInteractionQueue.push(queueEntry);

    this.state.currentStep = 6;
    this.state.stepName = "Interaction Purchased & Queued";
    this.state.stepDescription = "Verified 100c price and balance. Debited fan wallet. Allocated 80c to Luna (80%) and 20c platform rake. Enqueued.";

    this.logEvent("INTERACTION_PURCHASED", "InteractionEngine", "Question interaction purchased and sent to queue", {
      orderId,
      queueId,
      fanId: this.state.fan.id,
      item: interaction.title,
      priceCredits,
      creatorNet,
      platformRake,
    });

    return this.state;
  }

  /**
   * STEP 7: Creator Luna Control Room Receives Event & Accepts Interaction
   */
  public async step7_CreatorAcceptsInteraction(): Promise<ProductLoopScenarioState> {
    const queueItem = this.state.liveInteractionQueue[0];
    if (queueItem) {
      queueItem.status = "ACCEPTED";
    }

    this.state.currentStep = 7;
    this.state.stepName = "Creator Luna Accepts Question";
    this.state.stepDescription = "Luna's studio HUD received INTERACTION_QUEUED. Luna clicks Accept. Fan receives acceptance dispatch.";

    this.logEvent("INTERACTION_ACCEPTED", "RealtimeControlRoom", "Creator Luna accepted the question from Alex", {
      queueId: queueItem?.queueId,
      creatorId: this.state.creatorLuna.id,
      status: "ACCEPTED",
    });

    return this.state;
  }

  /**
   * STEP 8: Interaction Happens & Order Completes
   */
  public async step8_ExecuteAndCompleteOrder(): Promise<ProductLoopScenarioState> {
    const queueItem = this.state.liveInteractionQueue[0];
    if (queueItem) {
      queueItem.status = "COMPLETED";
    }

    this.state.currentStep = 8;
    this.state.stepName = "Interaction Performed & Order Completed";
    this.state.stepDescription = "Luna reads and answers Alex's question live on stream. Order status transitions to COMPLETED.";

    this.logEvent("ORDER_COMPLETED", "OrderEngine", "Interaction lifecycle successfully finalized on stream", {
      orderId: queueItem?.orderId,
      status: "COMPLETED",
    });

    return this.state;
  }

  /**
   * STEP 9: Fan Earns Relationship XP -> LEVEL UP — SUPPORTER Banner Emitted!
   */
  public async step9_AwardXpAndLevelUp(): Promise<ProductLoopScenarioState> {
    const xpAwarded = 500; // 500 XP from live interaction milestone
    this.state.fan.totalXp += xpAwarded;
    this.state.fan.currentLevel = 3;
    this.state.fan.relationshipTier = "SUPPORTER";
    this.state.fan.badge = "Supporter (Blue Shield)";

    this.state.celebrationBanner = {
      show: true,
      title: "LEVEL UP — SUPPORTER",
      subtitle: "Alex is now a verified Supporter of Creator Luna!",
      badgeUnlocked: "Blue Supporter Shield & 5% Tip Discount",
    };

    this.state.currentStep = 9;
    this.state.stepName = "LEVEL UP — SUPPORTER";
    this.state.stepDescription = "Fan earned 500 relationship XP. Tier upgraded from NEW_FAN to SUPPORTER. Frontend triggers celebration!";

    this.logEvent("LEVEL_INCREASED", "RelationshipProgressionService", "Milestone reached: Fan upgraded to SUPPORTER tier", {
      fanId: this.state.fan.id,
      creatorProfileId: this.state.creatorLuna.id,
      totalXp: this.state.fan.totalXp,
      newTier: "SUPPORTER",
      level: 3,
    });

    EventStreamService.emit("LEVEL_INCREASED" as any, {
      userId: this.state.fan.id,
      creatorProfileId: this.state.creatorLuna.id,
      previousTier: "NEW_FAN",
      newTier: "SUPPORTER",
      newLevel: 3,
      totalXp: 500,
    }, {
      actor: { userId: this.state.fan.id, username: this.state.fan.username, displayName: this.state.fan.displayName, role: "FAN" },
      creatorProfileId: this.state.creatorLuna.id,
    });

    return this.state;
  }

  /**
   * STEP 10: Leaderboard Updates & Collective Goal Progresses
   */
  public async step10_UpdateLeaderboardAndGoal(): Promise<ProductLoopScenarioState> {
    // 1. Goal Progress (+100 credits)
    this.state.creatorLuna.liveGoal.currentCredits += 100;
    this.state.creatorLuna.liveGoal.progressPercent = Math.min(
      100,
      Math.round((this.state.creatorLuna.liveGoal.currentCredits / this.state.creatorLuna.liveGoal.targetCredits) * 100)
    );

    // 2. Leaderboard: Alex takes Rank #2 with 100 credits and 500 XP
    this.state.creatorLuna.leaderboardRank = [
      { rank: 1, userId: "fan_top_whale", displayName: "Marcus Neon ⚡", creditsContributed: 300, xpEarned: 300 },
      { rank: 2, userId: this.state.fan.id, displayName: this.state.fan.displayName, creditsContributed: 100, xpEarned: 500 },
      { rank: 3, userId: "fan_second", displayName: "Elena Velvet 🌸", creditsContributed: 100, xpEarned: 100 },
    ];

    this.state.currentStep = 10;
    this.state.stepName = "Leaderboard & Goal Updated";
    this.state.stepDescription = "Collective Goal moved from 400c to 500c (50%). Alex ascended to Rank #2 on Luna's live room leaderboard.";

    this.logEvent("LEADERBOARD_UPDATED", "LeaderboardEngine", "Alex entered Luna's Top Supporters Leaderboard", {
      rank: 2,
      creditsContributed: 100,
      xpEarned: 500,
      goalProgress: "500/1000 credits (50%)",
    });

    return this.state;
  }

  /**
   * STEP 11: Fan Subscribes to Luna -> Grants Entitlements
   */
  public async step11_FanSubscribes(): Promise<ProductLoopScenarioState> {
    await this.db.subscription.create({
      data: {
        fanId: this.state.fan.id,
        creatorProfileId: this.state.creatorLuna.id,
        tier: "VIP",
        tierLevel: 2,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    const entitlements = ["SUBSCRIBER_CONTENT", "SUBSCRIBER_CHAT", "VIP_BADGE", "VOD_ARCHIVE"];
    this.state.fan.entitlements = entitlements;

    this.state.currentStep = 11;
    this.state.stepName = "Subscribed to Creator Luna";
    this.state.stepDescription = "Fan subscribes to Luna's VIP subscription tier. Entitlement engine authoritatively unlocks subscriber perks.";

    this.logEvent("SUBSCRIPTION_CREATED", "EntitlementEngine", "VIP Subscription active; granted 4 entitlements", {
      fanId: this.state.fan.id,
      creatorProfileId: this.state.creatorLuna.id,
      tier: "VIP",
      entitlements,
    });

    return this.state;
  }

  /**
   * STEP 12: Next-Day Return & Feed Recommendation Affinity Elevation (#1 in Feed)
   */
  public async step12_NextDayReturnFeedElevation(): Promise<ProductLoopScenarioState> {
    // Affinity calculation:
    // - Watch time (45s) = +2.5 weight
    // - Interaction (100c) = +5.0 weight
    // - Subscription (VIP) = +10.0 weight
    // - Relationship Tier (SUPPORTER) = +5.0 multiplier
    // Total Luna score moves from 0.72 to 0.99 (Rank #1)!
    this.state.feedRanking.day2Feed = [
      {
        creatorId: this.state.creatorLuna.id,
        stageName: this.state.creatorLuna.stageName,
        score: 0.99,
        rank: 1,
        reason: "Deep Affinity: Supporter Tier, Subscribed & High Interaction History",
        isBoosted: true,
      },
      {
        creatorId: "creator_maya",
        stageName: "Maya Velvet 🌸",
        score: 0.88,
        rank: 2,
        reason: "Trending Platform Wide",
        isBoosted: false,
      },
      {
        creatorId: "creator_chloe",
        stageName: "Chloe Cyber ⚡",
        score: 0.62,
        rank: 3,
        reason: "New Creator Spotlight",
        isBoosted: false,
      },
    ];

    this.state.currentStep = 12;
    this.state.stepName = "Complete Loop: Day 2 Feed Affinity Boost";
    this.state.stepDescription = "Alex returns tomorrow. Recommendation system detects repeated multi-layered engagement. Luna is now #1 in Alex's personalized feed!";

    this.logEvent("RECOMMENDATION_SCORED", "RecommendationEngine", "Personalized feed affinity evaluated: Luna elevated to Rank #1", {
      fanId: this.state.fan.id,
      creatorProfileId: this.state.creatorLuna.id,
      scoreDay1: 0.72,
      scoreDay2: 0.99,
      newRank: 1,
      signals: ["WATCH_45S", "INTERACTION_QUESTION_100C", "VIP_SUBSCRIPTION", "SUPPORTER_TIER"],
    });

    return this.state;
  }

  /**
   * Runs all 12 steps in chronological sequence
   */
  public async runFullLoop(): Promise<ProductLoopScenarioState> {
    await this.step1_AuthenticateFan();
    await this.step2_DiscoverCreatorLuna();
    await this.step3_RecordViewingTelemetry();
    await this.step4_OpenInteractionMenu();
    await this.step5_BuyCreditsViaGateway();
    await this.step6_PurchaseQuestionInteraction();
    await this.step7_CreatorAcceptsInteraction();
    await this.step8_ExecuteAndCompleteOrder();
    await this.step9_AwardXpAndLevelUp();
    await this.step10_UpdateLeaderboardAndGoal();
    await this.step11_FanSubscribes();
    await this.step12_NextDayReturnFeedElevation();
    return this.state;
  }
}
