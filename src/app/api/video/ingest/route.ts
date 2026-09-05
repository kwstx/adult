import { NextRequest, NextResponse } from "next/server";
import { VideoRoomService } from "@/modules/video/video-room.service";

/**
 * POST /api/video/ingest
 * 
 * Creator Stream Provisioning & Lifecycle:
 * - START: Provisions WHIP / RTMP ingest credentials, sets audience rules, records stream start.
 * - STOP: Marks stream ENDED, records duration, tears down media session.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      creatorUserId,
      action,
      title = "Live Broadcast ✨",
      category = "Entertainment",
      tags = ["live", "interactive"],
      streamMode = "PUBLIC_BROADCAST",
      audienceRules,
    } = body;

    if (!creatorUserId || !action) {
      return NextResponse.json(
        { error: "creatorUserId and action (START or STOP) are required." },
        { status: 400 }
      );
    }

    if (action === "START") {
      const broadcast = await VideoRoomService.startBroadcast({
        creatorUserId,
        title,
        category,
        tags,
        streamMode,
        audienceRules,
      });

      return NextResponse.json({
        success: true,
        isLive: true,
        streamId: broadcast.livestream.id,
        mediaRoomId: broadcast.mediaRoom.id,
        credentials: broadcast.credentials,
        audienceRules: broadcast.audienceRule,
      });
    } else if (action === "STOP") {
      const result = await VideoRoomService.endBroadcast(creatorUserId);
      return NextResponse.json({
        success: true,
        isLive: false,
        result,
      });
    } else {
      return NextResponse.json(
        { error: "Invalid action. Must be START or STOP." },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Stream ingest error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to manage stream ingest." },
      { status: 500 }
    );
  }
}
