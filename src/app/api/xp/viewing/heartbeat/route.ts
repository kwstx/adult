import { NextRequest, NextResponse } from "next/server";
import { XpOrchestratorService } from "@/modules/xp/xp-orchestrator.service";
import { ViewingHeartbeatPayload } from "@/modules/xp/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/xp/viewing/heartbeat
 * Authoritative backend endpoint for live stream viewing telemetry.
 * 
 * Invariant: The client merely sends playback facts (seconds watched, focus, playback state).
 * The backend verifies the stream, evaluates progression, records to the XP ledger,
 * mutates relationship balances, and detects level up threshold crossings.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      fanId,
      creatorProfileId,
      livestreamId,
      viewingSessionId,
      intervalSeconds,
      isWindowFocused = true,
      mediaPlaybackState = "PLAYING",
      clientTimestamp = Date.now(),
      idempotencyKey,
    } = body;

    if (!fanId || !creatorProfileId || !viewingSessionId || typeof intervalSeconds !== "number") {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required telemetry fields: fanId, creatorProfileId, viewingSessionId, intervalSeconds",
        },
        { status: 400 }
      );
    }

    const payload: ViewingHeartbeatPayload = {
      fanId,
      creatorProfileId,
      livestreamId: livestreamId || "live_stream_default",
      viewingSessionId,
      intervalSeconds,
      isWindowFocused: Boolean(isWindowFocused),
      mediaPlaybackState,
      clientTimestamp,
      idempotencyKey,
    };

    const result = await XpOrchestratorService.processViewingHeartbeat(payload);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("Error processing viewing heartbeat:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error processing viewing telemetry",
      },
      { status: 500 }
    );
  }
}
