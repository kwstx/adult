import type {
  UserAffinityProfile,
  UserEngagementHistory,
  CreatorPopularityMetrics,
  RecommendationScoreBreakdown,
  ScoredCandidateCreator,
} from "./types";

export interface CandidateRawInput {
  id: string; // CreatorProfile ID
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  kycStatus: string;
  isVerified2257: boolean;
  category?: string | null;
  tags?: string | null;
  streamTitle?: string | null;
  isLive: boolean;
  viewerCount: number;
  minTipForPrivate?: number;
  streamUrl?: string | null;
  posterUrl?: string | null;
}

export interface CandidateScoringOptions {
  includeExploration?: boolean;
  explorationWeight?: number;
}

/**
 * Calculates multi-signal recommendation score for a single candidate creator
 */
export function calculateCandidateScore(
  candidate: CandidateRawInput,
  userAffinity: UserAffinityProfile | null,
  engagement: UserEngagementHistory,
  popularity: CreatorPopularityMetrics,
  options: CandidateScoringOptions = {}
): RecommendationScoreBreakdown {
  const { includeExploration = true, explorationWeight = 1.0 } = options;

  let baseScore = 100;
  let followScore = 0;
  let subscriptionScore = 0;
  let previouslyWatchedScore = 0;
  let watchDurationScore = 0;
  let repeatedReturnScore = 0;
  let categoryAffinityScore = 0;
  let popularityScore = 0;
  let negativePenaltyScore = 0;
  let freshnessExplorationScore = 0;

  const primaryDrivers: string[] = [];

  // ==========================================================================
  // SIGNAL 1: Followed Creator (VERY STRONG SIGNAL)
  // ==========================================================================
  if (engagement.isSubscribed) {
    subscriptionScore = 1500;
    primaryDrivers.push("💎 Active Subscription");
  } else if (engagement.isFollowing) {
    followScore = 1000;
    primaryDrivers.push("⭐ Followed Creator");
  }

  // ==========================================================================
  // SIGNAL 2: Previously Watched (STRONG SIGNAL)
  // ==========================================================================
  if (engagement.watchCount > 0) {
    previouslyWatchedScore = 300;
    primaryDrivers.push(`👀 Watched ${engagement.watchCount}x previously`);
  }

  // ==========================================================================
  // SIGNAL 3: Long Watch Duration (STRONG SIGNAL)
  // ==========================================================================
  const totalSec = engagement.totalWatchSeconds;
  if (totalSec >= 600) {
    watchDurationScore = 500;
    primaryDrivers.push("⏱️ High watch history (10m+)");
  } else if (totalSec >= 300) {
    watchDurationScore = 400;
    primaryDrivers.push("⏱️ High watch history (5m+)");
  } else if (totalSec >= 120) {
    watchDurationScore = 300;
    primaryDrivers.push("⏱️ Solid engagement");
  } else if (totalSec >= 60) {
    watchDurationScore = 200;
  } else if (totalSec >= 20) {
    watchDurationScore = 100;
  }

  // ==========================================================================
  // SIGNAL 4: Repeated Return (STRONG SIGNAL)
  // ==========================================================================
  if (engagement.distinctReturnDays >= 2) {
    // 180 points per return session up to 540 points max (3+ days)
    repeatedReturnScore = Math.min(540, engagement.distinctReturnDays * 180);
    primaryDrivers.push(`🔄 Frequent return (${engagement.distinctReturnDays} days)`);
  }

  // High-value interactions extra signal (Gifts & Purchases)
  if (engagement.giftsCount > 0) {
    followScore += Math.min(300, engagement.giftsCount * 50);
  }
  if (engagement.contentPurchasesCount > 0 || engagement.privateSessionsCount > 0) {
    subscriptionScore += 200;
  }

  // ==========================================================================
  // SIGNAL 5: Category Affinity (MODERATE SIGNAL)
  // ==========================================================================
  const candidateTags: string[] = [];
  if (candidate.category) candidateTags.push(candidate.category.toLowerCase().trim());
  if (candidate.tags) {
    candidate.tags.split(",").forEach((t) => candidateTags.push(t.toLowerCase().trim()));
  }

  if (userAffinity && Object.keys(userAffinity.categoryWeights).length > 0) {
    let maxAffinity = 0;
    let matchedCategory = "";

    for (const tag of candidateTags) {
      const weight = userAffinity.categoryWeights[tag] || 0;
      if (weight > maxAffinity) {
        maxAffinity = weight;
        matchedCategory = tag;
      }
    }

    if (maxAffinity > 0) {
      categoryAffinityScore = Math.round(maxAffinity * 350);
      primaryDrivers.push(`🎯 High affinity for #${matchedCategory}`);
    }
  }

  // ==========================================================================
  // SIGNAL 6: Current Popularity & Live Momentum (MODERATE SIGNAL)
  // ==========================================================================
  let popPoints = 0;
  if (candidate.isLive) {
    popPoints += 100; // Live streams prioritized over offline
    const viewerPoints = Math.min(150, Math.round((candidate.viewerCount / 500) * 150));
    const heatPoints = Math.min(100, Math.round(popularity.heatScore));
    popPoints += viewerPoints + heatPoints;

    if (popularity.heatScore > 75 || candidate.viewerCount > 300) {
      primaryDrivers.push("🔥 Trending live");
    }
  }
  popularityScore = Math.min(350, popPoints);

  // ==========================================================================
  // SIGNAL 7: Poor Previous Engagement (NEGATIVE SIGNAL)
  // ==========================================================================
  if (engagement.unfollowedRecently) {
    negativePenaltyScore -= 500;
  }
  if (engagement.bouncesCount > 0) {
    // -350 per bounce, capped at -700
    negativePenaltyScore -= Math.min(700, engagement.bouncesCount * 350);
  }

  // ==========================================================================
  // SIGNAL 8: Freshness & Exploration Injection
  // ==========================================================================
  if (includeExploration) {
    // Deterministic pseudo-random jitter based on candidate ID hash to ensure stable order per session
    let hash = 0;
    for (let i = 0; i < candidate.id.length; i++) {
      hash = (hash << 5) - hash + candidate.id.charCodeAt(i);
      hash |= 0;
    }
    const pseudoRandom = Math.abs(hash % 100) / 100; // 0.0 - 1.0
    freshnessExplorationScore = Math.round((50 + pseudoRandom * 100) * explorationWeight);
  }

  // Calculate total final recommendation score
  const totalScore = Math.max(
    0,
    baseScore +
      followScore +
      subscriptionScore +
      previouslyWatchedScore +
      watchDurationScore +
      repeatedReturnScore +
      categoryAffinityScore +
      popularityScore +
      negativePenaltyScore +
      freshnessExplorationScore
  );

  // Determine explanation string
  const explanation =
    primaryDrivers.length > 0
      ? primaryDrivers.slice(0, 2).join(" • ")
      : candidate.isLive
      ? "✨ Recommended for you"
      : "🌟 Discover creator";

  const confidence = Math.min(
    1.0,
    +(
      (Boolean(userAffinity) ? 0.4 : 0.1) +
      (engagement.watchCount > 0 ? 0.3 : 0.0) +
      (engagement.isFollowing ? 0.3 : 0.0)
    ).toFixed(2)
  );

  return {
    baseScore,
    followScore,
    subscriptionScore,
    previouslyWatchedScore,
    watchDurationScore,
    repeatedReturnScore,
    categoryAffinityScore,
    popularityScore,
    negativePenaltyScore,
    freshnessExplorationScore,
    totalScore,
    confidence,
    primaryDrivers,
    humanReadableExplanation: explanation,
  };
}

/**
 * Ranks an array of candidates using the recommendation scoring engine
 */
export function rankCandidates(
  candidates: Array<{
    candidate: CandidateRawInput;
    engagement: UserEngagementHistory;
    popularity: CreatorPopularityMetrics;
  }>,
  userAffinity: UserAffinityProfile | null,
  options: CandidateScoringOptions = {}
): ScoredCandidateCreator[] {
  const scoredList: ScoredCandidateCreator[] = candidates.map(({ candidate, engagement, popularity }) => {
    const scoreBreakdown = calculateCandidateScore(
      candidate,
      userAffinity,
      engagement,
      popularity,
      options
    );

    const tagsList = (candidate.tags || "interactive,live")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    return {
      id: candidate.id,
      userId: candidate.userId,
      username: candidate.username,
      displayName: candidate.displayName,
      avatarUrl: candidate.avatarUrl,
      bannerUrl: candidate.bannerUrl,
      bio: candidate.bio,
      kycStatus: candidate.kycStatus,
      isVerified2257: candidate.isVerified2257,
      stream: {
        title: candidate.streamTitle || `${candidate.displayName}'s Stream`,
        isLive: candidate.isLive,
        viewerCount: candidate.viewerCount,
        category: candidate.category || tagsList[0] || "Entertainment",
        tags: tagsList,
        posterUrl: candidate.posterUrl || candidate.avatarUrl || candidate.bannerUrl,
        streamUrl: candidate.streamUrl || "rtmp://live.platform.local/app",
        minTipForPrivate: candidate.minTipForPrivate || 0,
      },
      recommendationScore: scoreBreakdown.totalScore,
      scoreBreakdown,
      relationship: {
        isFollowing: engagement.isFollowing,
        isSubscribed: engagement.isSubscribed,
        subscriptionTier: engagement.subscriptionTier || null,
        watchHistorySeconds: engagement.totalWatchSeconds,
        returnSessionsCount: engagement.distinctReturnDays,
      },
    };
  });

  // Sort candidates by total recommendation score descending
  scoredList.sort((a, b) => b.recommendationScore - a.recommendationScore);

  return scoredList;
}
