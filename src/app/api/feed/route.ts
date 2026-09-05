import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export interface PopularitySignals {
  trendingScore: number;
  hypeScore: number;
  chatVelocity: number; // msgs/min
  recentTipsCount: number;
  heatIndex: number;
  rankBadge?: string;
}

export interface CandidateFeedItem {
  id: string; // CreatorProfile ID
  userId: string;
  creator: {
    id: string;
    userId: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    bannerUrl: string | null;
    bio: string | null;
    kycStatus: string;
    isVerified2257: boolean;
  };
  stream: {
    streamTitle: string;
    isLive: boolean;
    isPrivateShow: boolean;
    minTipForPrivate: number;
    posterUrl: string | null;
    streamUrl: string;
    tags: string[];
    primaryCategory: string;
  };
  viewerCount: number;
  popularitySignals: PopularitySignals;
  userRelationship: {
    isFollowing: boolean;
    hasSubscription: boolean;
    subscriptionTier: string | null;
  };
  presentation: {
    currentGoal: {
      title: string;
      target: number;
      progress: number;
      percentage: number;
    };
    interactionItems: Array<{
      id: string;
      title: string;
      description: string | null;
      creditCost: number;
      actionType: string;
    }>;
    ppvCount: number;
  };
  recommendationScore: number;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || undefined;
    const tag = searchParams.get("tag") || undefined;
    const cursor = searchParams.get("cursor") || undefined;
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "15", 10), 5), 20);

    // 1. Build base filters for live candidates
    const where: any = {
      isLive: true,
    };

    if (tag && tag !== "All") {
      where.tags = { contains: tag };
    }

    // 2. Fetch candidate creator profiles with related entities
    const rawCandidates = await prisma.creatorProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            kycStatus: true,
          },
        },
        interactionItems: {
          where: { isEnabled: true },
          orderBy: { sortOrder: "asc" },
        },
        ppvContents: {
          select: { id: true },
        },
        compliance2257: {
          select: { verificationStatus: true },
        },
        subscriberFans: userId
          ? {
              where: { fanId: userId, status: "ACTIVE" },
              select: { tier: true },
            }
          : false,
      },
      take: 50, // Candidate pool for scoring
    });

    // 3. User personalized history (affinity & penalty signals)
    let userAffinityTags: Set<string> = new Set();
    let userBouncedCreators: Set<string> = new Set();

    if (userId) {
      // Find past positive engagements (watched >= 20s or followed)
      const positiveEvents = await prisma.discoveryEvent.findMany({
        where: {
          userId,
          eventType: { in: ["WATCH_20S", "WATCH_90S", "FOLLOW", "TIP", "INTERACTION_MENU_OPEN"] },
        },
        select: { category: true, creatorId: true },
        take: 30,
        orderBy: { createdAt: "desc" },
      });

      for (const ev of positiveEvents) {
        if (ev.category) {
          ev.category.split(",").forEach((t) => userAffinityTags.add(t.trim().toLowerCase()));
        }
      }

      // Find creators the user recently bounced from (< 3s)
      const bouncedEvents = await prisma.discoveryEvent.findMany({
        where: {
          userId,
          eventType: "IMMEDIATE_BOUNCE",
        },
        select: { creatorId: true },
        take: 20,
        orderBy: { createdAt: "desc" },
      });

      bouncedEvents.forEach((ev) => userBouncedCreators.add(ev.creatorId));
    }

    // 4. Score and enrich each candidate
    const scoredCandidates: CandidateFeedItem[] = rawCandidates.map((cp, index) => {
      const tagsList = cp.tags.split(",").map((t) => t.trim());
      const primaryCategory = tagsList[0] || "General";

      const hasSub = Boolean(cp.subscriberFans && cp.subscriberFans.length > 0);
      const subTier = hasSub ? cp.subscriberFans[0].tier : null;
      const isFollowing = hasSub; // Active subscription implies following

      // Popularity signal heuristics
      const goalPercentage = Math.min(
        100,
        Math.round((cp.currentGoalProgress / (cp.currentGoalTarget || 1)) * 100)
      );
      const baseTrending = Math.round(cp.viewerCount * 1.8 + goalPercentage * 3.5 + 120);
      const hypeScore = Math.min(99, Math.round(50 + (goalPercentage / 100) * 40 + (cp.viewerCount / 500) * 9));
      const chatVelocity = Math.max(12, Math.round(cp.viewerCount * 0.15 + (cp.interactionItems.length * 4)));
      const recentTipsCount = Math.round(goalPercentage * 0.25 + (cp.viewerCount * 0.08));
      const heatIndex = Math.min(99.9, +(85 + (hypeScore / 100) * 14.5).toFixed(1));

      // Recommendation Scoring Logic
      let recScore = baseTrending;

      // Personalization boosts
      if (hasSub) recScore += 800;
      if (isFollowing) recScore += 500;

      // Category affinity boost
      const hasMatchingCategory = tagsList.some((t) => userAffinityTags.has(t.toLowerCase()));
      if (hasMatchingCategory) recScore += 350;

      // Bounce penalty
      if (userBouncedCreators.has(cp.id)) recScore -= 400;

      // Exploration jitter to diversify candidates
      recScore += (index % 5) * 20;

      return {
        id: cp.id,
        userId: cp.userId,
        creator: {
          id: cp.id,
          userId: cp.userId,
          username: cp.user.username,
          displayName: cp.user.displayName,
          avatarUrl: cp.user.avatarUrl,
          bannerUrl: cp.bannerUrl,
          bio: cp.bio,
          kycStatus: cp.user.kycStatus,
          isVerified2257: cp.compliance2257?.verificationStatus === "APPROVED",
        },
        stream: {
          streamTitle: cp.streamTitle,
          isLive: cp.isLive,
          isPrivateShow: cp.isPrivateShow,
          minTipForPrivate: cp.minTipForPrivate,
          posterUrl: cp.user.avatarUrl || cp.bannerUrl,
          streamUrl: cp.ingestUrl,
          tags: tagsList,
          primaryCategory,
        },
        viewerCount: cp.viewerCount,
        popularitySignals: {
          trendingScore: baseTrending,
          hypeScore,
          chatVelocity,
          recentTipsCount,
          heatIndex,
          rankBadge: hypeScore > 85 ? "🔥 Trending Top 1%" : hypeScore > 70 ? "⚡ Rising Fast" : undefined,
        },
        userRelationship: {
          isFollowing,
          hasSubscription: hasSub,
          subscriptionTier: subTier,
        },
        presentation: {
          currentGoal: {
            title: cp.currentGoalTitle,
            target: cp.currentGoalTarget,
            progress: cp.currentGoalProgress,
            percentage: goalPercentage,
          },
          interactionItems: cp.interactionItems.map((item) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            creditCost: item.creditCost,
            actionType: item.actionType,
          })),
          ppvCount: cp.ppvContents.length,
        },
        recommendationScore: recScore,
      };
    });

    // 5. Sort candidates by recommendation score descending
    scoredCandidates.sort((a, b) => b.recommendationScore - a.recommendationScore);

    // 6. Handle cursor pagination
    let startIndex = 0;
    if (cursor) {
      const foundIdx = scoredCandidates.findIndex((c) => c.id === cursor);
      if (foundIdx !== -1) {
        startIndex = foundIdx + 1;
      }
    }

    const paginatedCandidates = scoredCandidates.slice(startIndex, startIndex + limit);
    const nextCursor =
      startIndex + limit < scoredCandidates.length
        ? paginatedCandidates[paginatedCandidates.length - 1]?.id
        : null;

    return NextResponse.json({
      candidates: paginatedCandidates,
      nextCursor,
      hasMore: Boolean(nextCursor),
      recommendationContext: {
        batchId: `batch_${Date.now()}`,
        candidateCount: paginatedCandidates.length,
        totalPoolSize: scoredCandidates.length,
        userPersonalized: Boolean(userId),
      },
    });
  } catch (error: any) {
    console.error("[Feed API Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate discovery feed." },
      { status: 500 }
    );
  }
}
