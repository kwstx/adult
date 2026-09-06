import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserAffinityProfile, getUserCreatorEngagementHistory, getCreatorPopularityMetrics } from "@/lib/recommendations/affinity-engine";
import { rankCandidates, CandidateRawInput } from "@/lib/recommendations/scoring-engine";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || undefined;
    const tag = searchParams.get("tag") || undefined;
    const category = searchParams.get("category") || undefined;
    const cursor = searchParams.get("cursor") || undefined;
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "15", 10), 5), 50);

    // 1. Build database filter for candidates (live creators by default, or all creators)
    const where: any = {};
    const effectiveTag = tag || category;
    if (effectiveTag && effectiveTag !== "All") {
      where.tags = { contains: effectiveTag };
    }

    // 2. Fetch candidate creator profiles with related user & stream details
    const candidateProfiles = await prisma.creatorProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            bannerUrl: true,
            bio: true,
            kycStatus: true,
          },
        },
        verifications: {
          where: { verificationStatus: "APPROVED" },
          select: { id: true },
        },
        livestreams: {
          where: { status: "LIVE" },
          take: 1,
          orderBy: { startedAt: "desc" },
        },
      },
      take: 60, // Candidate pool size for multi-signal ranking
    });

    if (candidateProfiles.length === 0) {
      return NextResponse.json({
        candidates: [],
        nextCursor: null,
        hasMore: false,
        recommendationContext: {
          candidateCount: 0,
          userPersonalized: Boolean(userId),
        },
      });
    }

    // 3. Load user category affinity vector in parallel
    const userAffinity = await getUserAffinityProfile(userId);

    // 4. Enrich each candidate with user engagement history and real-time popularity signals
    const candidatePayloads = await Promise.all(
      candidateProfiles.map(async (cp) => {
        const activeLivestream = cp.livestreams[0];
        const isLive = cp.isLive || Boolean(activeLivestream);
        const viewerCount = activeLivestream?.currentViewerCount || cp.totalViews || 0;

        const candidateInput: CandidateRawInput = {
          id: cp.id,
          userId: cp.userId,
          username: cp.user.username,
          displayName: cp.user.displayName,
          avatarUrl: cp.user.avatarUrl,
          bannerUrl: cp.bannerUrl || cp.user.bannerUrl,
          bio: cp.bio || cp.user.bio,
          kycStatus: cp.user.kycStatus,
          isVerified2257: cp.verifications.length > 0,
          category: cp.category,
          tags: cp.tags,
          streamTitle: activeLivestream?.title || `${cp.user.displayName} Live Broadcast`,
          isLive,
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
          getCreatorPopularityMetrics(cp.id, viewerCount, isLive),
        ]);

        return {
          candidate: candidateInput,
          engagement,
          popularity,
        };
      })
    );

    // 5. Run the Multi-Signal Scoring Engine
    const rankedCandidates = rankCandidates(candidatePayloads, userAffinity);

    // 6. Handle cursor pagination
    let startIndex = 0;
    if (cursor) {
      const foundIdx = rankedCandidates.findIndex((c) => c.id === cursor);
      if (foundIdx !== -1) {
        startIndex = foundIdx + 1;
      }
    }

    const paginated = rankedCandidates.slice(startIndex, startIndex + limit);
    const nextCursor =
      startIndex + limit < rankedCandidates.length
        ? paginated[paginated.length - 1]?.id
        : null;

    return NextResponse.json({
      candidates: paginated,
      nextCursor,
      hasMore: Boolean(nextCursor),
      recommendationContext: {
        batchId: `rec_batch_${Date.now()}`,
        candidateCount: paginated.length,
        totalPoolSize: rankedCandidates.length,
        userPersonalized: Boolean(userId),
        topAffinityCategories: userAffinity?.topCategories || [],
      },
    });
  } catch (error: any) {
    console.error("[Recommendation Feed API Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate recommendation feed." },
      { status: 500 }
    );
  }
}
