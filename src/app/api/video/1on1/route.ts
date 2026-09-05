import { NextRequest, NextResponse } from "next/server";
import { VideoRoomService } from "@/modules/video/video-room.service";

/**
 * POST /api/video/1on1
 * 
 * Interactive Two-Way WebRTC Session Controller:
 * Handles genuine real-time two-way peer/media sessions between Creator & Fan.
 * Actions:
 * - REQUEST: Fan requests a private 1-on-1 session with credit verification.
 * - JOIN: Creator or Fan joins the WebRTC media room with ICE servers and signaling token.
 * - END: Completes the session, calculates billable minutes, and settles credits.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, creatorId, fanUserId, sessionId, userId, creditRatePerMinute } = body;

    switch (action) {
      case "REQUEST": {
        if (!creatorId || !fanUserId) {
          return NextResponse.json(
            { error: "creatorId and fanUserId are required for REQUEST." },
            { status: 400 }
          );
        }
        const session = await VideoRoomService.requestInteractive1on1Session({
          creatorId,
          fanUserId,
          creditRatePerMinute: creditRatePerMinute || 100,
        });
        return NextResponse.json({ success: true, session });
      }

      case "JOIN": {
        if (!sessionId || !userId) {
          return NextResponse.json(
            { error: "sessionId and userId are required for JOIN." },
            { status: 400 }
          );
        }
        const connectionPayload = await VideoRoomService.joinInteractive1on1Session({
          sessionId,
          userId,
        });
        return NextResponse.json({ success: true, ...connectionPayload });
      }

      case "END": {
        if (!sessionId || !userId) {
          return NextResponse.json(
            { error: "sessionId and userId are required for END." },
            { status: 400 }
          );
        }
        const summary = await VideoRoomService.endInteractive1on1Session({
          sessionId,
          endedByUserId: userId,
        });
        return NextResponse.json({ success: true, summary });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action. Supported: REQUEST, JOIN, END." },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("1-on-1 WebRTC session error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process 1-on-1 session." },
      { status: 500 }
    );
  }
}
