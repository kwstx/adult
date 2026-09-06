import prisma from "@/lib/db";
import { getUserAffinityProfile, getUserCreatorEngagementHistory, getCreatorPopularityMetrics } from "./affinity-engine";
import type { MLFeatureVector } from "./types";

/**
 * Extracts a structured machine learning feature vector for a specific (User, Creator) interaction pair.
 * Ready for embedding into two-tower neural architectures or gradient-boosted decision trees.
 */
export async function extractMLFeatureVector(
  userId: string,
  creatorProfileId: string
): Promise<MLFeatureVector | null> {
  const [user, creatorProfile, userAffinity, engagement] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        createdAt: true,
        _count: {
          select: {
            followsGiven: true,
            subscriptionsFan: true,
            contentPurchases: true,
          },
        },
      },
    }),
    prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      include: {
        _count: {
          select: {
            followers: true,
            subscriptions: true,
            contents: true,
          },
        },
      },
    }),
    getUserAffinityProfile(userId),
    getUserCreatorEngagementHistory(userId, creatorProfileId),
  ]);

  if (!user || !creatorProfile) return null;

  const popularity = await getCreatorPopularityMetrics(
    creatorProfileId,
    creatorProfile.totalViews,
    creatorProfile.isLive
  );

  // Compute category cosine / dot-product similarity
  let categorySimilarity = 0.0;
  const creatorTags = (creatorProfile.tags || "").split(",").map((t) => t.trim().toLowerCase());
  if (userAffinity) {
    for (const tag of creatorTags) {
      if (userAffinity.categoryWeights[tag]) {
        categorySimilarity = Math.max(categorySimilarity, userAffinity.categoryWeights[tag]);
      }
    }
  }

  // Aggregate user statistics
  const totalEvents = (userAffinity?.totalPositiveEvents || 0) + (userAffinity?.totalNegativeEvents || 0);
  const bounceRate = totalEvents > 0 ? (userAffinity?.totalNegativeEvents || 0) / totalEvents : 0;
  const avgWatchSec = engagement.watchCount > 0 ? engagement.totalWatchSeconds / engagement.watchCount : 0;

  // Ground truth labels (derived from engagement)
  const label_watched_30s = engagement.totalWatchSeconds >= 30 ? 1 : 0;
  const label_dwell_seconds = engagement.totalWatchSeconds;
  const label_converted_gift_sub = (engagement.giftsCount > 0 || engagement.isSubscribed) ? 1 : 0;

  return {
    sampleId: `ml_${userId}_${creatorProfileId}_${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId,
    creatorProfileId,

    // User Features
    user_lifetime_events_count: totalEvents,
    user_avg_watch_duration_sec: +avgWatchSec.toFixed(2),
    user_bounce_rate: +bounceRate.toFixed(3),
    user_gift_propensity: user._count.contentPurchases + user._count.subscriptionsFan,
    user_preferred_category: userAffinity?.topCategories[0] || "general",
    user_active_hours_recency: Math.max(
      0.1,
      +((Date.now() - (userAffinity?.lastActiveAt.getTime() || Date.now())) / (1000 * 3600)).toFixed(2)
    ),

    // Item / Creator Features
    creator_total_followers: creatorProfile.totalFollowers,
    creator_is_live: creatorProfile.isLive,
    creator_current_viewers: popularity.viewerCount,
    creator_chat_velocity: popularity.chatVelocityPerMin,
    creator_heat_index: popularity.heatScore,
    creator_primary_category: creatorProfile.category || creatorTags[0] || "entertainment",

    // Pair Features
    pair_is_following: engagement.isFollowing ? 1 : 0,
    pair_is_subscribed: engagement.isSubscribed ? 1 : 0,
    pair_previous_watch_count: engagement.watchCount,
    pair_total_watch_seconds: engagement.totalWatchSeconds,
    pair_distinct_return_sessions: engagement.distinctReturnDays,
    pair_category_cosine_similarity: +categorySimilarity.toFixed(3),
    pair_previous_bounce_count: engagement.bouncesCount,
    pair_gifts_sent_count: engagement.giftsCount,

    // Target Labels
    label_watched_30s,
    label_dwell_seconds,
    label_converted_gift_sub,
  };
}

/**
 * Batch exports tabular dataset of feature vectors for offline ML training pipelines
 */
export async function exportTrainingDataset(limit = 100): Promise<MLFeatureVector[]> {
  const recentEvents = await prisma.recommendationEvent.findMany({
    where: {
      userId: { not: null },
      creatorProfileId: { not: null },
    },
    select: {
      userId: true,
      creatorProfileId: true,
    },
    distinct: ["userId", "creatorProfileId"],
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  const vectors: MLFeatureVector[] = [];
  for (const ev of recentEvents) {
    if (ev.userId && ev.creatorProfileId) {
      const vec = await extractMLFeatureVector(ev.userId, ev.creatorProfileId);
      if (vec) vectors.push(vec);
    }
  }

  return vectors;
}
