import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { eventBus } from "@/modules/realtime/event-bus";

/**
 * POST /api/livestream/[creatorId]/relationship
 * Manage relationship between viewer and creator (e.g., follow, subscribe, or perk check).
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await context.params;
    const body = await req.json();
    const { userId, action } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required." }, { status: 400 });
    }

    const creator = await prisma.creatorProfile.findFirst({
      where: {
        OR: [{ id: creatorId }, { user: { username: creatorId } }],
      },
      include: { user: true },
    });

    if (!creator) {
      return NextResponse.json({ error: "Creator not found." }, { status: 404 });
    }

    if (action === "TOGGLE_FOLLOW") {
      // Record discovery follow event
      await prisma.discoveryEvent.create({
        data: {
          sessionId: `sess_${userId}_${Date.now()}`,
          userId,
          creatorId: creator.id,
          eventType: "FOLLOW",
          category: creator.tags?.split(",")[0] || "general",
        },
      });

      return NextResponse.json({
        success: true,
        isFollowing: true,
        message: `Now following ${creator.user.displayName}! ✨`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Relationship action error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update relationship." },
      { status: 500 }
    );
  }
}
