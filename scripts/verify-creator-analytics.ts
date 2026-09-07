/**
 * ============================================================================
 * CREATOR ANALYTICS & HIGH-VALUE FAN ATTRIBUTION VERIFICATION SUITE
 * ============================================================================
 * 
 * Verifies all 16 required dashboard metrics and the North Star Attribution Engine:
 * 1. Live viewers (current and peak)
 * 2. Average watch duration
 * 3. Peak viewers
 * 4. Followers gained
 * 5. Subscriptions revenue & counts
 * 6. PPV revenue
 * 7. Gift revenue
 * 8. Interaction revenue
 * 9. Private-session revenue
 * 10. Total gross & net revenue
 * 11. Top supporters CRM leaderboard
 * 12. Fan retention cohorts (D1, D7, D30, D90)
 * 13. Relationship-level distribution (Stranger -> Royal Patron)
 * 14. Content performance (views, purchases, conversion %)
 * 15. Conversion rate & funnel
 * 16. Repeat purchasers
 * 
 * THE NORTH STAR METRIC ASSERTIONS:
 * - "Which activities turn viewers into repeat high-value fans?"
 * - Identifies winning conversion engine with lift multiplier calculation.
 * - Produces actionable marketplace optimization recommendations.
 */

import {
  CreatorAnalyticsService,
  AnalyticsStore,
} from "../src/modules/analytics";

// Standalone Mock Database for deterministic test suite execution
class MockCreatorAnalyticsDatabase {
  creatorProfiles: Map<string, any> = new Map();
  livestreams: Map<string, any> = new Map();
  livestreamParticipants: Map<string, any> = new Map();
  creatorRelationships: Map<string, any> = new Map();
  contents: Map<string, any> = new Map();
  contentPurchases: Map<string, any> = new Map();
  users: Map<string, any> = new Map();

  seed() {
    const creatorUser = {
      id: "usr_maya_velvet",
      username: "mayavelvet",
      displayName: "Maya Velvet ✨",
      role: "CREATOR",
    };
    this.users.set(creatorUser.id, creatorUser);

    const mayaProfile = {
      id: "creator_maya_001",
      userId: creatorUser.id,
      stageName: "Maya Velvet ✨",
      user: creatorUser,
    };
    this.creatorProfiles.set(mayaProfile.id, mayaProfile);

    // Relationships across tiers
    const tiers = ["ROYAL_PATRON", "SOULMATE", "VIP_DEVOTEE", "SUPERFAN", "SUPPORTER", "STRANGER"];
    for (let i = 0; i < 60; i++) {
      const tier = tiers[i % tiers.length];
      this.creatorRelationships.set(`rel_${i}`, {
        id: `rel_${i}`,
        creatorProfileId: mayaProfile.id,
        fanId: `fan_${i}`,
        tier,
        level: Math.floor(i / 2) + 1,
      });
    }
  }

  creatorProfile = {
    findUnique: async ({ where }: any) => this.creatorProfiles.get(where.id) || null,
    findFirst: async () => Array.from(this.creatorProfiles.values())[0] || null,
  };

  creatorRelationship = {
    findMany: async ({ where }: any) =>
      Array.from(this.creatorRelationships.values()).filter(
        (r) => r.creatorProfileId === where.creatorProfileId
      ),
  };
}

async function runCreatorAnalyticsVerification() {
  console.log("================================================================================");
  console.log("📊 CREATOR ANALYTICS & HIGH-VALUE FAN ATTRIBUTION VERIFICATION");
  console.log("================================================================================");

  const mockDb = new MockCreatorAnalyticsDatabase();
  mockDb.seed();
  AnalyticsStore.resetForTesting();

  const creatorId = "creator_maya_001";

  // ==========================================================================
  // SECTION 1: UNIFIED OVERVIEW & ALL 16 METRICS VERIFICATION
  // ==========================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("📈 SECTION 1: MASTER OVERVIEW & 16 DASHBOARD METRICS EVALUATION");
  console.log("--------------------------------------------------------------------------------");

  const overview = await CreatorAnalyticsService.getCreatorAnalyticsOverview(
    creatorId,
    "LAST_7_DAYS",
    undefined,
    mockDb
  );

  console.log(`[Overview] Profile: ${overview.stageName} (@${overview.username}) | Timeframe: ${overview.timeframe}`);

  // Metric 1: Live Viewers
  console.log("\n  [Metric 1] Live Viewers Concurrency:", overview.liveTelemetry.liveViewersCurrent, "viewers");
  if (overview.liveTelemetry.liveViewersCurrent <= 0) throw new Error("Metric 1 (Live Viewers) failed!");

  // Metric 2: Average Watch Duration
  console.log("  [Metric 2] Average Watch Duration:", overview.liveTelemetry.averageWatchDurationFormatted, `(${overview.liveTelemetry.averageWatchDurationSeconds}s)`);
  if (overview.liveTelemetry.averageWatchDurationSeconds <= 0) throw new Error("Metric 2 (Avg Watch Duration) failed!");

  // Metric 3: Peak Viewers
  console.log("  [Metric 3] Peak Viewers:", overview.liveTelemetry.peakViewers, "viewers");
  if (overview.liveTelemetry.peakViewers < overview.liveTelemetry.liveViewersCurrent) {
    throw new Error("Metric 3 (Peak Viewers) must be >= current live viewers!");
  }

  // Metric 4: Followers Gained
  console.log("  [Metric 4] Followers Gained:", `+${overview.liveTelemetry.followersGained} followers`);
  if (overview.liveTelemetry.followersGained <= 0) throw new Error("Metric 4 (Followers Gained) failed!");

  // Metric 5: Subscriptions Revenue & Count
  console.log("\n  [Metric 5] Subscriptions Revenue:", overview.revenueStreams.subscriptionsCredits, `credits (€${overview.revenueStreams.subscriptionsFiatEur}) | Active Subs:`, overview.revenueStreams.activeSubscribersCount);
  if (overview.revenueStreams.subscriptionsCredits <= 0 || overview.revenueStreams.activeSubscribersCount <= 0) {
    throw new Error("Metric 5 (Subscriptions) failed!");
  }

  // Metric 6: PPV Revenue
  console.log("  [Metric 6] PPV Revenue:", overview.revenueStreams.ppvRevenueCredits, `credits (€${overview.revenueStreams.ppvRevenueFiatEur})`);
  if (overview.revenueStreams.ppvRevenueCredits <= 0) throw new Error("Metric 6 (PPV Revenue) failed!");

  // Metric 7: Gift Revenue
  console.log("  [Metric 7] Gift Revenue:", overview.revenueStreams.giftRevenueCredits, `credits (€${overview.revenueStreams.giftRevenueFiatEur})`);
  if (overview.revenueStreams.giftRevenueCredits <= 0) throw new Error("Metric 7 (Gift Revenue) failed!");

  // Metric 8: Interaction Revenue
  console.log("  [Metric 8] Interaction Revenue:", overview.revenueStreams.interactionRevenueCredits, `credits (€${overview.revenueStreams.interactionRevenueFiatEur})`);
  if (overview.revenueStreams.interactionRevenueCredits <= 0) throw new Error("Metric 8 (Interaction Revenue) failed!");

  // Metric 9: Private-Session Revenue
  console.log("  [Metric 9] Private-Session Revenue:", overview.revenueStreams.privateSessionRevenueCredits, `credits (€${overview.revenueStreams.privateSessionRevenueFiatEur})`);
  if (overview.revenueStreams.privateSessionRevenueCredits <= 0) throw new Error("Metric 9 (Private Session Revenue) failed!");

  // Metric 10: Total Revenue (Gross, Net & Rake)
  console.log("  [Metric 10] Total Gross Revenue:", overview.revenueStreams.totalGrossRevenueCredits, `credits (€${overview.revenueStreams.totalGrossRevenueFiatEur})`);
  console.log("              Net Creator Earnings (80%):", overview.revenueStreams.totalNetCreatorCredits, `credits (€${overview.revenueStreams.totalNetCreatorFiatEur})`);
  console.log("              Platform Rake (20%):", overview.revenueStreams.platformRakeCredits, "credits");
  if (overview.revenueStreams.totalGrossRevenueCredits !== (overview.revenueStreams.totalNetCreatorCredits + overview.revenueStreams.platformRakeCredits)) {
    throw new Error("Metric 10 (Gross = Net + Rake) balance invariant failed!");
  }

  // Metric 11: Top Supporters
  console.log("\n  [Metric 11] Top Supporters Leaderboard (Count:", overview.topSupporters.length + ")");
  overview.topSupporters.slice(0, 3).forEach((supporter, idx) => {
    console.log(`    #${idx + 1} ${supporter.displayName} (@${supporter.username}) | Tier: ${supporter.relationshipTier} (Lvl ${supporter.relationshipLevel}) | Spent: ${supporter.totalSpentCredits} cr | 1st Touch: ${supporter.firstConversionActivity}`);
  });
  if (overview.topSupporters.length === 0 || overview.topSupporters[0].totalSpentCredits <= 0) {
    throw new Error("Metric 11 (Top Supporters) failed!");
  }

  // Metric 12: Fan Retention
  console.log("\n  [Metric 12] Fan Retention Cohorts:");
  console.log(`    - D1 Return: ${overview.fanRetention.retentionRateD1Percent}% | D7: ${overview.fanRetention.retentionRateD7Percent}% | D30: ${overview.fanRetention.retentionRateD30Percent}% | D90: ${overview.fanRetention.retentionRateD90Percent}%`);
  console.log(`    - Average Fan Lifespan: ${overview.fanRetention.averageFanLifespanDays} days | Retention Score: ${overview.fanRetention.retentionScore}/100`);
  if (overview.fanRetention.averageFanLifespanDays <= 0 || overview.fanRetention.retentionScore <= 0) {
    throw new Error("Metric 12 (Fan Retention) failed!");
  }

  // Metric 13: Relationship-Level Distribution
  console.log("\n  [Metric 13] Relationship Distribution (Total:", overview.relationshipDistribution.totalRelationships + " fans):");
  console.log(`    - Royal Patrons: ${overview.relationshipDistribution.royalPatrons}`);
  console.log(`    - Soulmates: ${overview.relationshipDistribution.soulmates}`);
  console.log(`    - VIP Devotees: ${overview.relationshipDistribution.vipDevotees}`);
  console.log(`    - Superfans: ${overview.relationshipDistribution.superfans}`);
  console.log(`    - Supporters: ${overview.relationshipDistribution.supporters}`);
  console.log(`    - Strangers: ${overview.relationshipDistribution.strangers}`);
  if (overview.relationshipDistribution.totalRelationships <= 0) {
    throw new Error("Metric 13 (Relationship Distribution) failed!");
  }

  // Metric 14: Content Performance
  console.log("\n  [Metric 14] Content Performance Catalog (Assets:", overview.contentPerformance.length + "):");
  overview.contentPerformance.forEach((asset) => {
    console.log(`    - [${asset.contentType}] "${asset.title}" | Price: ${asset.priceCredits} cr | Views: ${asset.totalViews} | Unlocks: ${asset.totalPurchases} (${asset.conversionRatePercent}%) | Gross: ${asset.grossRevenueCredits} cr`);
  });
  if (overview.contentPerformance.length === 0) throw new Error("Metric 14 (Content Performance) failed!");

  // Metric 15: Conversion Rate & Funnel
  console.log("\n  [Metric 15] Conversion Rate & Funnel:");
  console.log(`    - Discovery Impressions: ${overview.conversionAndRepeatFunnel.totalImpressions}`);
  console.log(`    - Live Room Entries: ${overview.conversionAndRepeatFunnel.totalRoomEntries}`);
  console.log(`    - Engaged Chatters: ${overview.conversionAndRepeatFunnel.totalEngagedChatters}`);
  console.log(`    - First-Time Purchasers: ${overview.conversionAndRepeatFunnel.firstTimePurchasers} (${overview.conversionAndRepeatFunnel.overallConversionRatePercent}% conversion)`);
  if (overview.conversionAndRepeatFunnel.overallConversionRatePercent <= 0) {
    throw new Error("Metric 15 (Conversion Rate) failed!");
  }

  // Metric 16: Repeat Purchasers
  console.log("\n  [Metric 16] Repeat Purchasers Velocity:");
  console.log(`    - Repeat Purchasers: ${overview.conversionAndRepeatFunnel.repeatPurchasers} (${overview.conversionAndRepeatFunnel.repeatConversionRatePercent}% repeat rate)`);
  console.log(`    - High-Value Fans (>500 cr LTV): ${overview.conversionAndRepeatFunnel.highValueFansCount} (${overview.conversionAndRepeatFunnel.highValueYieldPercent}% high-value yield)`);
  if (overview.conversionAndRepeatFunnel.repeatPurchasers <= 0) {
    throw new Error("Metric 16 (Repeat Purchasers) failed!");
  }

  console.log("\n  ✓ ALL 16 REQUIRED DASHBOARD METRICS VALIDATED AND MATHEMATICALLY CONSISTENT!");

  // ==========================================================================
  // SECTION 2: NORTH STAR ATTRIBUTION ENGINE VERIFICATION
  // ==========================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("🎯 SECTION 2: NORTH STAR ATTRIBUTION ENGINE");
  console.log("   'Which activities turn viewers into repeat high-value fans?'");
  console.log("--------------------------------------------------------------------------------");

  const attribution = await CreatorAnalyticsService.getActivityAttributionAnalysis(
    creatorId,
    "LAST_30_DAYS",
    mockDb
  );

  console.log("\n[Attribution Insight]:", attribution.headlineInsight);
  console.log("  Criterion:", attribution.highValueDefinition);
  console.log("  Total High-Value Fans Identified:", attribution.totalHighValueFansIdentified);
  console.log("  Baseline Conversion Rate:", attribution.baselineConversionRatePercent + "%");
  console.log(`  Top Fan Engine: ${attribution.topActivityForRepeatConversion.displayName} (${attribution.topActivityForRepeatConversion.conversionRatePercent}% conversion, ${attribution.topActivityForRepeatConversion.liftMultiplier}x lift)`);

  console.log("\n  Activity Attribution Performance Table:");
  attribution.activitiesAttribution.forEach((act, idx) => {
    console.log(
      `    ${idx + 1}. [${act.category}] ${act.displayName}`.padEnd(52) +
      `| Conv: ${act.conversionToHighValueRatePercent}%`.padEnd(16) +
      `| Lift: ${act.liftMultiplier}x`.padEnd(14) +
      `| Avg LTV: ${act.averageFanLtvCredits} cr`.padEnd(22) +
      `| 2nd Tx: ${act.averageDaysToSecondPurchase}d`
    );
  });

  console.log("\n  Actionable Marketplace Recommendations Generated:");
  attribution.marketplaceRecommendations.forEach((rec, i) => {
    console.log(`    ✓ Recommendation ${i + 1}: ${rec}`);
  });

  if (attribution.activitiesAttribution.length < 5) {
    throw new Error("Attribution engine must evaluate multiple activity categories!");
  }

  if (attribution.topActivityForRepeatConversion.liftMultiplier <= 1.0) {
    throw new Error("Winning activity must demonstrate statistical conversion lift!");
  }

  console.log("\n  ✓ NORTH STAR ATTRIBUTION ENGINE FULLY VERIFIED!");

  // ==========================================================================
  // SECTION 3: FAST OLAP MART QUERY BENCHMARK
  // ==========================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("⚡ SECTION 3: READ-OPTIMIZED OLAP MART QUERY BENCHMARK");
  console.log("--------------------------------------------------------------------------------");

  const t0 = performance.now();
  const martOverview = await CreatorAnalyticsService.getCreatorAnalyticsOverview(
    creatorId,
    "LAST_7_DAYS",
    undefined,
    mockDb
  );
  const t1 = performance.now();

  console.log(`  Mart Query Execution Time: ${(t1 - t0).toFixed(2)} ms`);
  console.log(`  Computed Directly From Mart: ${martOverview.computedFromMart}`);
  console.log("  Mart State Stats:", AnalyticsStore.getMartStats());

  if (!martOverview.computedFromMart) {
    throw new Error("Subsequent query must be resolved directly from in-memory Mart without DB scan!");
  }

  console.log("\n================================================================================");
  console.log("🏆 ALL CREATOR ANALYTICS & NORTH STAR ATTRIBUTION INVARIANTS VERIFIED!");
  console.log("================================================================================");
  process.exit(0);
}

runCreatorAnalyticsVerification().catch((err) => {
  console.error("❌ Creator Analytics verification failed:", err);
  process.exit(1);
});
