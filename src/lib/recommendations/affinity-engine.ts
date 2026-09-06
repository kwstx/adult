import prisma from "@/lib/db";
import { redis } from "@/lib/redis";
import type {
  UserAffinityProfile,
  UserEngagementHistory,
  CreatorPopularityMetrics,
} from "./types";

/**
 * Computes or retrieves cached category affinity weights for a user.
 * Higher weight indicates strong interest in that category / tag.
 */
export async function getUserAffinityProfile(
  userId?: string | null
): Promise<UserAffinityProfile | null> {
  if (!userId) return null;

  // 1. Try Redis cache first for sub-millisecond retrieval
  const cacheKey = `user:affinity:${userId}:profile`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      parsed.lastActiveAt = new Date(parsed.lastActiveAt);
      return parsed;
    }
  } catch (err) {
    // Redis unavailable, fallback to DB
  }

  // 2. Fetch past 100 recommendation events for this user
  const recentEvents = await prisma.recommendationEvent.findMany({
    where: { userId },
    select: {
      eventType: true,
      category: true,
      tags: true,
      dwellTimeMs: true,
      watchDurationSeconds: true,
      searchQuery: true,
      amountCredits: true,
      createdAt: true,
    },
    take: 150,
    orderBy: { createdAt: "desc" },
  });

  const categoryScores: Record<string, number> = {};
  let totalPositive = 0;
  let totalNegative = 0;

  for (const ev of recentEvents) {
    const rawCategories: string[] = [];
    if (ev.category) rawCategories.push(ev.category);
    if (ev.tags) {
      ev.tags.split(",").forEach((t) => rawCategories.push(t.trim()));
    }
    if (ev.searchQuery) {
      rawCategories.push(ev.searchQuery.toLowerCase().trim());
    }

    // Weight multiplier based on event significance
    let weight = 1.0;
    if (ev.eventType === "GIFT" || ev.eventType === "SUBSCRIPTION" || ev.eventType === "CONTENT_PURCHASE" || ev.eventType === "PRIVATE_SESSION") {
      weight = 5.0;
      totalPositive++;
    } else if (ev.eventType === "FOLLOW") {
      weight = 4.0;
      totalPositive++;
    } else if (ev.eventType === "INTERACTION" || ev.eventType === "CHAT" || ev.eventType === "LIKE") {
      weight = 2.5;
      totalPositive++;
    } else if (ev.eventType === "WATCH") {
      if (ev.watchDurationSeconds >= 60) {
        weight = 3.5;
        totalPositive++;
      } else if (ev.watchDurationSeconds >= 15) {
        weight = 2.0;
        totalPositive++;
      } else {
        weight = 0.5;
      }
    } else if (ev.eventType === "EXIT" && ev.dwellTimeMs < 3000) {
      weight = -2.5; // Negative bounce penalty
      totalNegative++;
    } else if (ev.eventType === "UNFOLLOW") {
      weight = -4.0;
      totalNegative++;
    }

    for (const cat of rawCategories) {
      const normalized = cat.toLowerCase().trim();
      if (!normalized) continue;
      categoryScores[normalized] = (categoryScores[normalized] || 0) + weight;
    }
  }

  // Normalize scores to [0.0, 1.0] range
  const normalizedWeights: Record<string, number> = {};
  const maxScore = Math.max(...Object.values(categoryScores), 1);

  for (const [cat, rawScore] of Object.entries(categoryScores)) {
    if (rawScore > 0) {
      normalizedWeights[cat] = Math.min(1.0, +(rawScore / maxScore).toFixed(3));
    }
  }

  const topCategories = Object.entries(normalizedWeights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat]) => cat);

  const profile: UserAffinityProfile = {
    userId,
    categoryWeights: normalizedWeights,
    topCategories,
    totalPositiveEvents: totalPositive,
    totalNegativeEvents: totalNegative,
    lastActiveAt: recentEvents[0]?.createdAt || new Date(),
  };

  // Cache computed profile in Redis with 10 minute TTL
  try {
    await redis.set(cacheKey, JSON.stringify(profile), "EX", 600);
  } catch (err) {}

  return profile;
}

/**
 * Computes deep user-creator relationship signals (watch duration, repeat return sessions, bounces, gifts)
 */
export async function getUserCreatorEngagementHistory(
  userId: string,
  creatorProfileId: string
): Promise<UserEngagementHistory> {
  // Query authoritative relationships in DB
  const [followRecord, subRecord, eventAggregates] = await Promise.all([
    prisma.follow.findUnique({
      where: {
        followerId_creatorProfileId: {
          followerId: userId,
          creatorProfileId,
        },
      },
      select: { id: true },
    }),
    prisma.subscription.findUnique({
      where: {
        fanId_creatorProfileId: {
          fanId: userId,
          creatorProfileId,
        },
      },
      select: { status: true, tierName: true },
    }),
    prisma.recommendationEvent.findMany({
      where: {
        userId,
        creatorProfileId,
      },
      select: {
        eventType: true,
        dwellTimeMs: true,
        watchDurationSeconds: true,
        amountCredits: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const isFollowing = Boolean(followRecord);
  const isSubscribed = subRecord?.status === "ACTIVE";
  const subscriptionTier = isSubscribed ? subRecord.tierName : null;

  let totalWatchSeconds = 0;
  let watchCount = 0;
  let giftsCount = 0;
  let totalGiftsCredits = 0;
  let interactionsCount = 0;
  let contentPurchasesCount = 0;
  let privateSessionsCount = 0;
  let bouncesCount = 0;
  let unfollowedRecently = false;
  let lastWatchedAt: Date | null = null;

  // Track distinct return days / sessions
  const distinctDays = new Set<string>();

  for (const ev of eventAggregates) {
    const dayKey = ev.createdAt.toISOString().slice(0, 10);
    distinctDays.add(dayKey);

    if (ev.eventType === "WATCH") {
      watchCount++;
      totalWatchSeconds += ev.watchDurationSeconds || Math.round(ev.dwellTimeMs / 1000);
      if (!lastWatchedAt) lastWatchedAt = ev.createdAt;
    } else if (ev.eventType === "GIFT") {
      giftsCount++;
      totalGiftsCredits += ev.amountCredits || 0;
    } else if (ev.eventType === "INTERACTION") {
      interactionsCount++;
    } else if (ev.eventType === "CONTENT_PURCHASE") {
      contentPurchasesCount++;
    } else if (ev.eventType === "PRIVATE_SESSION") {
      privateSessionsCount++;
    } else if (ev.eventType === "EXIT" && ev.dwellTimeMs < 3000) {
      bouncesCount++;
    } else if (ev.eventType === "UNFOLLOW") {
      unfollowedRecently = true;
    }
  }

  return {
    isFollowing,
    isSubscribed,
    subscriptionTier,
    totalWatchSeconds,
    watchCount,
    distinctReturnDays: distinctDays.size,
    lastWatchedAt,
    giftsCount,
    totalGiftsCredits,
    interactionsCount,
    contentPurchasesCount,
    privateSessionsCount,
    bouncesCount,
    unfollowedRecently,
  };
}

/**
 * Computes creator popularity metrics from database state & real-time Redis signals
 */
export async function getCreatorPopularityMetrics(
  creatorProfileId: string,
  baseViewerCount = 0,
  isLive = false
): Promise<CreatorPopularityMetrics> {
  let redisHeat = 0;
  let recentGiftsCount = 0;
  let recentGiftsCredits = 0;

  try {
    const [zscore, heatHash] = await Promise.all([
      redis.zscore("creators:heat:hourly", creatorProfileId),
      redis.hgetall(`creator:heat:${creatorProfileId}`),
    ]);

    if (zscore) redisHeat = parseFloat(zscore);
    if (heatHash) {
      recentGiftsCount = parseInt(heatHash.count_GIFT || "0", 10);
    }
  } catch (err) {}

  // Heuristic normalized heat score (0 to 100)
  const viewerWeight = Math.min(40, (baseViewerCount / 1000) * 40);
  const liveWeight = isLive ? 30 : 0;
  const activityWeight = Math.min(30, redisHeat * 0.5);
  const heatScore = Math.min(100, Math.round(viewerWeight + liveWeight + activityWeight));

  const chatVelocityPerMin = Math.max(5, Math.round(baseViewerCount * 0.12 + redisHeat * 0.2));

  return {
    creatorProfileId,
    isLive,
    viewerCount: baseViewerCount,
    chatVelocityPerMin,
    recentGiftsCount1h: recentGiftsCount,
    recentGiftsCredits1h: recentGiftsCredits,
    heatScore,
  };
}
