import { NextRequest, NextResponse } from "next/server";
import { RoomSessionService } from "@/modules/livestream/room-session.service";

/**
 * GET /api/livestream/[creatorId]/session?userId=...
 * Single authoritative room bootstrapper endpoint.
 * Concurrently resolves:
 * - Room configuration
 * - Authoritative viewer permissions (canView, canChat, canInteract, canTip, isVip)
 * - Fan relationship level, badges & rank
 * - Creator's live goal progress
 * - Interaction catalogue items
 * - Viewer's wallet balance
 * - Signed playback credentials
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await context.params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || undefined;

    const sessionData = await RoomSessionService.getRoomSession({
      creatorIdOrUsername: creatorId,
      viewerUserId: userId,
    });

    if (!sessionData) {
      return NextResponse.json(
        { error: "Live room not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(sessionData);
  } catch (error: any) {
    console.error("Room session fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load live room session." },
      { status: 500 }
    );
  }
}
