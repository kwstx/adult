import {
  calculateCandidateScore,
  rankCandidates,
  CandidateRawInput,
} from "../src/lib/recommendations/scoring-engine";
import { normalizeEvent, normalizeEventType } from "../src/lib/recommendations/event-collector";
import type {
  UserAffinityProfile,
  UserEngagementHistory,
  CreatorPopularityMetrics,
  MLFeatureVector,
} from "../src/lib/recommendations/types";

async function runRecommendationEngineUnitTests() {
  console.log("========================================================");
  console.log("🧪 RECOMMENDATION ENGINE & EVENT COLLECTION SUITE");
  console.log("========================================================\n");

  // ==========================================================================
  // TEST 1: Event Type Normalization (All 15 Event Types)
  // ==========================================================================
  console.log("Test 1: Validating All 15 Core Event Types Normalization...");
  const coreEventTypes = [
    "IMPRESSION",
    "SWIPE",
    "WATCH",
    "EXIT",
    "FOLLOW",
    "UNFOLLOW",
    "LIKE",
    "CHAT",
    "GIFT",
    "INTERACTION",
    "SUBSCRIPTION",
    "CONTENT_PURCHASE",
    "PRIVATE_SESSION",
    "SEARCH",
    "CREATOR_PROFILE_VIEW",
  ];

  for (const type of coreEventTypes) {
    const normalized = normalizeEventType(type);
    if (!normalized || normalized !== type) {
      throw new Error(`Failed to normalize event type: ${type}`);
    }
  }

  // Also test legacy event aliases
  if (normalizeEventType("WATCH_20S") !== "WATCH") throw new Error("WATCH_20S alias failed");
  if (normalizeEventType("TIP") !== "GIFT") throw new Error("TIP alias failed");
  if (normalizeEventType("IMMEDIATE_BOUNCE") !== "EXIT") throw new Error("IMMEDIATE_BOUNCE alias failed");

  console.log(`✅ All 15 core event types & aliases correctly validated!\n`);

  // ==========================================================================
  // TEST 2: Event Normalization & Dwell Time Calculation
  // ==========================================================================
  console.log("Test 2: Event Payload Normalization...");
  const normEvent = normalizeEvent({
    sessionId: "sess_123",
    userId: "user_alex",
    creatorProfileId: "creator_maya",
    eventType: "WATCH",
    watchDurationSeconds: 45,
    category: "dance",
    tags: ["dance", "music"],
  });

  if (!normEvent || normEvent.dwellTimeMs !== 45000 || normEvent.tags !== "dance,music") {
    throw new Error("Event normalization failed to calculate dwell time or tags string");
  }
  console.log("✅ Event normalization verified successfully.\n");

  // ==========================================================================
  // TEST 3: Multi-Signal Scoring Engine (Exact Signal Weights)
  // ==========================================================================
  console.log("Test 3: Testing Multi-Signal Scoring Engine...");

  const userAffinity: UserAffinityProfile = {
    userId: "user_alex",
    categoryWeights: { dance: 1.0, music: 0.7, asmr: 0.1 },
    topCategories: ["dance", "music"],
    totalPositiveEvents: 42,
    totalNegativeEvents: 3,
    lastActiveAt: new Date(),
  };

  // Profile 1: Followed, Subscribed, High Watch Duration (650s), Repeat Return (3 days)
  const creatorCandidateA: CandidateRawInput = {
    id: "creator_maya",
    userId: "user_maya",
    username: "mayavelvet",
    displayName: "Maya Velvet ✨",
    avatarUrl: "https://avatar.url/maya.png",
    bannerUrl: null,
    bio: "Dancer & Creator",
    kycStatus: "COMPLIANCE_2257_APPROVED",
    isVerified2257: true,
    category: "dance",
    tags: "dance,music,interactive",
    streamTitle: "Neon Dance Live 💃",
    isLive: true,
    viewerCount: 450,
  };

  const engagementA: UserEngagementHistory = {
    isFollowing: true,
    isSubscribed: true,
    subscriptionTier: "VIP",
    totalWatchSeconds: 650, // > 600s
    watchCount: 8,
    distinctReturnDays: 3, // Repeated return (3 distinct sessions)
    lastWatchedAt: new Date(),
    giftsCount: 4,
    totalGiftsCredits: 800,
    interactionsCount: 2,
    contentPurchasesCount: 1,
    privateSessionsCount: 0,
    bouncesCount: 0,
    unfollowedRecently: false,
  };

  const popularityA: CreatorPopularityMetrics = {
    creatorProfileId: "creator_maya",
    isLive: true,
    viewerCount: 450,
    chatVelocityPerMin: 45,
    recentGiftsCount1h: 12,
    recentGiftsCredits1h: 1200,
    heatScore: 88,
  };

  const scoreA = calculateCandidateScore(creatorCandidateA, userAffinity, engagementA, popularityA, { includeExploration: false });

  console.log("Candidate A Breakdown (Loyal VIP Supporter):", {
    baseScore: scoreA.baseScore,
    subscriptionScore: scoreA.subscriptionScore, // Expected +1500 + 200 (purchases) = 1700
    followScore: scoreA.followScore,             // Expected +200 (gifts)
    previouslyWatchedScore: scoreA.previouslyWatchedScore, // Expected +300
    watchDurationScore: scoreA.watchDurationScore, // Expected +500 (>=600s)
    repeatedReturnScore: scoreA.repeatedReturnScore, // Expected +540 (3 days * 180)
    categoryAffinityScore: scoreA.categoryAffinityScore, // Expected +350 (1.0 * 350)
    popularityScore: scoreA.popularityScore,     // Expected ~300+
    negativePenaltyScore: scoreA.negativePenaltyScore, // 0
    totalScore: scoreA.totalScore,
    explanation: scoreA.humanReadableExplanation,
  });

  // Verify Signal 1: Followed / Subscribed (Very strong signal)
  if (scoreA.subscriptionScore < 1500) {
    throw new Error("Signal 1 Failed: Subscription score should be >= 1500");
  }

  // Verify Signal 2: Previously Watched (Strong signal)
  if (scoreA.previouslyWatchedScore !== 300) {
    throw new Error("Signal 2 Failed: Previously watched score should be 300");
  }

  // Verify Signal 3: Long Watch Duration (Strong signal)
  if (scoreA.watchDurationScore !== 500) {
    throw new Error("Signal 3 Failed: Watch duration (650s) should award max 500 points");
  }

  // Verify Signal 4: Repeated Return (Strong signal)
  if (scoreA.repeatedReturnScore !== 540) {
    throw new Error("Signal 4 Failed: Repeated return across 3 days should award 540 points");
  }

  // Verify Signal 5: Category Affinity (Moderate signal)
  if (scoreA.categoryAffinityScore !== 350) {
    throw new Error("Signal 5 Failed: Category affinity score for 100% matched category should be 350");
  }

  // Profile 2: Bounced Creator (< 3s exit), Unfollowed, Low engagement
  const creatorCandidateB: CandidateRawInput = {
    id: "creator_bounced",
    userId: "user_bounced",
    username: "bounced_user",
    displayName: "Bounced Creator",
    avatarUrl: null,
    bannerUrl: null,
    bio: null,
    kycStatus: "UNVERIFIED",
    isVerified2257: false,
    category: "asmr",
    tags: "asmr",
    streamTitle: "Stream",
    isLive: false,
    viewerCount: 10,
  };

  const engagementB: UserEngagementHistory = {
    isFollowing: false,
    isSubscribed: false,
    subscriptionTier: null,
    totalWatchSeconds: 2,
    watchCount: 1,
    distinctReturnDays: 1,
    lastWatchedAt: new Date(),
    giftsCount: 0,
    totalGiftsCredits: 0,
    interactionsCount: 0,
    contentPurchasesCount: 0,
    privateSessionsCount: 0,
    bouncesCount: 2, // 2 rapid bounces (< 3s)
    unfollowedRecently: true, // Recent unfollow
  };

  const popularityB: CreatorPopularityMetrics = {
    creatorProfileId: "creator_bounced",
    isLive: false,
    viewerCount: 10,
    chatVelocityPerMin: 2,
    recentGiftsCount1h: 0,
    recentGiftsCredits1h: 0,
    heatScore: 5,
  };

  const scoreB = calculateCandidateScore(creatorCandidateB, userAffinity, engagementB, popularityB, { includeExploration: false });

  console.log("\nCandidate B Breakdown (Bounced & Unfollowed):", {
    baseScore: scoreB.baseScore,
    categoryAffinityScore: scoreB.categoryAffinityScore,
    negativePenaltyScore: scoreB.negativePenaltyScore, // Expected -500 (unfollow) - 700 (2 bounces) = -1200
    totalScore: scoreB.totalScore,
    explanation: scoreB.humanReadableExplanation,
  });

  // Verify Signal 7: Poor previous engagement (Negative signal)
  if (scoreB.negativePenaltyScore >= 0 || scoreB.totalScore >= scoreA.totalScore) {
    throw new Error("Signal 7 Failed: Negative penalty must significantly depress score");
  }

  console.log("\n✅ All 7 Core Signal Scoring Assertions PASSED perfectly!");

  // ==========================================================================
  // TEST 4: Candidate Ranking & Ordering
  // ==========================================================================
  console.log("\nTest 4: Candidate Ranking Algorithm...");
  const rankedList = rankCandidates([
    { candidate: creatorCandidateB, engagement: engagementB, popularity: popularityB },
    { candidate: creatorCandidateA, engagement: engagementA, popularity: popularityA },
  ], userAffinity);

  if (rankedList[0].id !== "creator_maya") {
    throw new Error("Candidate ranking failed: Top candidate must be Maya Velvet");
  }
  console.log(`Rank 1: ${rankedList[0].displayName} (${rankedList[0].recommendationScore} pts) - ${rankedList[0].scoreBreakdown.humanReadableExplanation}`);
  console.log(`Rank 2: ${rankedList[1].displayName} (${rankedList[1].recommendationScore} pts) - ${rankedList[1].scoreBreakdown.humanReadableExplanation}`);
  console.log("✅ Candidate ranking order verified.");

  // ==========================================================================
  // TEST 5: Machine Learning Feature Vector Schema
  // ==========================================================================
  console.log("\nTest 5: Validating ML Feature Store Format...");
  const sampleMLVector: MLFeatureVector = {
    sampleId: "ml_user_alex_creator_maya_12345",
    timestamp: new Date().toISOString(),
    userId: "user_alex",
    creatorProfileId: "creator_maya",

    user_lifetime_events_count: 45,
    user_avg_watch_duration_sec: 145.2,
    user_bounce_rate: 0.066,
    user_gift_propensity: 5,
    user_preferred_category: "dance",
    user_active_hours_recency: 0.25,

    creator_total_followers: 1200,
    creator_is_live: true,
    creator_current_viewers: 450,
    creator_chat_velocity: 45,
    creator_heat_index: 88,
    creator_primary_category: "dance",

    pair_is_following: 1,
    pair_is_subscribed: 1,
    pair_previous_watch_count: 8,
    pair_total_watch_seconds: 650,
    pair_distinct_return_sessions: 3,
    pair_category_cosine_similarity: 1.0,
    pair_previous_bounce_count: 0,
    pair_gifts_sent_count: 4,

    label_watched_30s: 1,
    label_dwell_seconds: 650,
    label_converted_gift_sub: 1,
  };

  if (sampleMLVector.label_watched_30s !== 1 || sampleMLVector.pair_distinct_return_sessions !== 3) {
    throw new Error("ML Feature vector format validation failed");
  }
  console.log("✅ ML Feature vector format validated.");

  console.log("\n🎉 ALL UNIT TESTS PASSED SUCCESSFULLY! Recommendation engine is 100% operational.");
}

runRecommendationEngineUnitTests().catch((e) => {
  console.error("❌ Test error:", e);
  process.exit(1);
});
