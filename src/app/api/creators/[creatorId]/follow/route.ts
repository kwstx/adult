import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { recordRecommendationEvent } from "@/lib/recommendations/event-collector";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await context.params;
    const body = await req.json();
    const { fanUserId, notificationTier = "ALL" } = body;

    if (!fanUserId) {
      return NextResponse.json({ error: "fanUserId is required." }, { status: 400 });
    }

    // Resolve creator profile
    const creator = await prisma.creatorProfile.findFirst({
      where: {
        OR: [
          { id: creatorId },
          { userId: creatorId },
          { user: { username: creatorId } },
        ],
      },
    });

    if (!creator) {
      return NextResponse.json({ error: "Creator not found." }, { status: 404 });
    }

    // Check existing follow
    const existing = await prisma.follow.findUnique({
      where: {
        followerId_creatorProfileId: {
          followerId: fanUserId,
          creatorProfileId: creator.id,
        },
      },
    });

    let isFollowing = false;
    let newFollowersCount = creator.totalFollowers;

    if (existing) {
      // Unfollow
      await prisma.follow.delete({
        where: { id: existing.id },
      });
      newFollowersCount = Math.max(0, creator.totalFollowers - 1);
      await prisma.creatorProfile.update({
        where: { id: creator.id },
        data: { totalFollowers: newFollowersCount },
      });
      isFollowing = false;
    } else {
      // Follow
      await prisma.follow.create({
        data: {
          followerId: fanUserId,
          creatorProfileId: creator.id,
          notificationTier: notificationTier as any,
        },
      });
      newFollowersCount = creator.totalFollowers + 1;
      await prisma.creatorProfile.update({
        where: { id: creator.id },
        data: { totalFollowers: newFollowersCount },
      });
      isFollowing = true;
    }

    // Record recommendation telemetry event asynchronously
    recordRecommendationEvent({
      userId: fanUserId,
      creatorProfileId: creator.id,
      eventType: isFollowing ? "FOLLOW" : "UNFOLLOW",
      category: creator.category || undefined,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      isFollowing,
      totalFollowers: newFollowersCount,
    });
  } catch (error: any) {
    console.error("Follow error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update follow status." },
      { status: 500 }
    );
  }
}
