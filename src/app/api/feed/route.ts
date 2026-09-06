import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserAffinityProfile, getUserCreatorEngagementHistory, getCreatorPopularityMetrics } from "@/lib/recommendations/affinity-engine";
import { calculateCandidateScore, CandidateRawInput } from "@/lib/recommendations/scoring-engine";

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
  recommendationExplanation?: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || undefined;
    const tag = searchParams.get("tag") || undefined;
    const cursor = searchParams.get("cursor") || undefined;
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "15", 10), 5), 30);

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
        interactionDefinitions: {
          where: { isEnabled: true },
          orderBy: { sortOrder: "asc" },
        },
        contents: {
          select: { id: true },
        },
        verifications: {
          where: { verificationStatus: "APPROVED" },
          select: { id: true },
        },
        collectiveGoals: {
          where: { status: "ACTIVE" },
          take: 1,
        },
        livestreams: {
          where: { status: "LIVE" },
          take: 1,
        },
      },
      take: 50, // Candidate pool for scoring
    });

    // 3. User personalized history (affinity profile & engagement history)
    const userAffinity = await getUserAffinityProfile(userId);

    // 4. Score and enrich each candidate using the recommendation engine
    const scoredCandidates: CandidateFeedItem[] = await Promise.all(
      rawCandidates.map(async (cp) => {
        const tagsList = (cp.tags || "interactive,live")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
        const primaryCategory = cp.category || tagsList[0] || "Entertainment";
        const activeLivestream = cp.livestreams[0];
        const viewerCount = activeLivestream?.currentViewerCount || cp.totalViews || 0;

        const candidateInput: CandidateRawInput = {
          id: cp.id,
          userId: cp.userId,
          username: cp.user.username,
          displayName: cp.user.displayName,
          avatarUrl: cp.user.avatarUrl,
          bannerUrl: cp.bannerUrl,
          bio: cp.bio,
          kycStatus: cp.user.kycStatus,
          isVerified2257: cp.verifications.length > 0,
          category: primaryCategory,
          tags: cp.tags,
          streamTitle: activeLivestream?.title || `${cp.user.displayName} Live Broadcast`,
          isLive: cp.isLive || Boolean(activeLivestream),
          viewerCount,
          minTipForPrivate: cp.defaultMinTip,
          streamUrl: cp.playbackHlsUrl || cp.playbackWhepUrl || cp.ingestUrl,
          posterUrl: cp.user.avatarUrl || cp.bannerUrl,
        };

        const [engagement, popularity] = await Promise.all([
          userId
            ? getUserCreatorEngagementHistory(userId, cp.id)
            : {
                isFollowing: false,
                isSubscribed: false,
                subscriptionTier: null,
                totalWatchSeconds: 0,
                watchCount: 0,
                distinctReturnDays: 0,
                lastWatchedAt: null,
                giftsCount: 0,
                totalGiftsCredits: 0,
                interactionsCount: 0,
                contentPurchasesCount: 0,
                privateSessionsCount: 0,
                bouncesCount: 0,
                unfollowedRecently: false,
              },
          getCreatorPopularityMetrics(cp.id, viewerCount, true),
        ]);

        const scoreBreakdown = calculateCandidateScore(
          candidateInput,
          userAffinity,
          engagement,
          popularity
        );

        const activeGoal = cp.collectiveGoals[0];
        const goalTarget = activeGoal?.targetCredits || 1000;
        const goalProgress = activeGoal?.currentCredits || 0;
        const goalPercentage = Math.min(100, Math.round((goalProgress / Math.max(1, goalTarget)) * 100));

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
            isVerified2257: cp.verifications.length > 0,
          },
          stream: {
            streamTitle: candidateInput.streamTitle!,
            isLive: true,
            isPrivateShow: false,
            minTipForPrivate: cp.defaultMinTip,
            posterUrl: cp.user.avatarUrl || cp.bannerUrl,
            streamUrl: candidateInput.streamUrl!,
            tags: tagsList,
            primaryCategory,
          },
          viewerCount,
          popularitySignals: {
            trendingScore: popularity.heatScore * 10,
            hypeScore: Math.min(99, Math.round(50 + (goalPercentage / 100) * 40 + (viewerCount / 500) * 9)),
            chatVelocity: popularity.chatVelocityPerMin,
            recentTipsCount: popularity.recentGiftsCount1h,
            heatIndex: popularity.heatScore,
            rankBadge: popularity.heatScore > 80 ? "🔥 Trending Top 1%" : popularity.heatScore > 60 ? "⚡ Rising Fast" : undefined,
          },
          userRelationship: {
            isFollowing: engagement.isFollowing,
            hasSubscription: engagement.isSubscribed,
            subscriptionTier: engagement.subscriptionTier || null,
          },
          presentation: {
            currentGoal: {
              title: activeGoal?.title || "Community Goal",
              target: goalTarget,
              progress: goalProgress,
              percentage: goalPercentage,
            },
            interactionItems: (cp.interactionDefinitions || []).map((item) => ({
              id: item.id,
              title: item.title,
              description: item.description,
              creditCost: item.priceCredits,
              actionType: item.actionType,
            })),
            ppvCount: cp.contents?.length || 0,
          },
          recommendationScore: scoreBreakdown.totalScore,
          recommendationExplanation: scoreBreakdown.humanReadableExplanation,
        };
      })
    );

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
        topCategories: userAffinity?.topCategories || [],
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
