import { NextRequest, NextResponse } from "next/server";
import { VideoRoomService } from "@/modules/video/video-room.service";

/**
 * GET /api/video/rooms/[roomId]
 * 
 * Fetches complete Livestream Relation Graph:
 * - Creator
 * - Livestream
 * - Media room
 * - Stream status
 * - Permissions
 * - Start time
 * - End time
 * - Category
 * - Title
 * - Audience rules
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || undefined;

    const graph = await VideoRoomService.getLivestreamRelationGraph({
      creatorIdOrRoom: roomId,
      viewerUserId: userId,
    });

    if (!graph) {
      return NextResponse.json(
        { error: "Livestream room not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(graph);
  } catch (error: any) {
    console.error("Fetch room graph error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load room relation graph." },
      { status: 500 }
    );
  }
}
