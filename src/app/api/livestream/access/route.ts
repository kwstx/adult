import { NextRequest, NextResponse } from "next/server";
import { StreamService } from "@/modules/livestream/stream.service";

/**
 * POST /api/livestream/access
 * Authorize stream playback and issue signed time-limited playback tokens.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { creatorId, userId } = body;

    if (!creatorId) {
      return NextResponse.json({ error: "creatorId is required." }, { status: 400 });
    }

    const result = await StreamService.requestPlaybackAccess({
      creatorId,
      userId,
    });

    if (!result.allowed) {
      return NextResponse.json(
        { error: result.reason || "Access denied.", allowed: false },
        { status: 403 }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Playback access error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to authorize playback." },
      { status: 500 }
    );
  }
}
