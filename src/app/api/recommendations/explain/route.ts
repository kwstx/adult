import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserAffinityProfile, getUserCreatorEngagementHistory, getCreatorPopularityMetrics } from "@/lib/recommendations/affinity-engine";
import { calculateCandidateScore, CandidateRawInput } from "@/lib/recommendations/scoring-engine";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const creatorProfileId = searchParams.get("creatorProfileId") || searchParams.get("creatorId");

    if (!creatorProfileId) {
      return NextResponse.json(
        { error: "creatorProfileId or creatorId query param is required." },
        { status: 400 }
      );
    }

    // 1. Fetch CreatorProfile
    const cp = await prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
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
        livestreams: {
          where: { status: "LIVE" },
          take: 1,
        },
      },
    });

    if (!cp) {
      return NextResponse.json({ error: "Creator not found." }, { status: 404 });
    }

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
      isVerified2257: true,
      category: cp.category,
      tags: cp.tags,
      streamTitle: activeLivestream?.title || `${cp.user.displayName} Live Broadcast`,
      isLive,
      viewerCount,
      minTipForPrivate: cp.defaultMinTip,
    };

    // 2. Compute user affinity & interaction history
    const [userAffinity, engagement, popularity] = await Promise.all([
      getUserAffinityProfile(userId),
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

    // 3. Compute score breakdown
    const scoreBreakdown = calculateCandidateScore(
      candidateInput,
      userAffinity,
      engagement,
      popularity
    );

    return NextResponse.json({
      creator: {
        id: cp.id,
        username: cp.user.username,
        displayName: cp.user.displayName,
        category: cp.category,
        tags: cp.tags,
        isLive,
        viewerCount,
      },
      userPersonalized: Boolean(userId),
      scoreBreakdown,
      rawSignals: {
        userAffinityCategories: userAffinity?.categoryWeights || {},
        engagement,
        popularity,
      },
    });
  } catch (error: any) {
    console.error("[Explain Recommendation Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to explain recommendation score." },
      { status: 500 }
    );
  }
}
