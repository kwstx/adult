import { NextRequest, NextResponse } from "next/server";
import { FirstSessionService } from "@/modules/funnel/first-session.service";

/**
 * POST /api/funnel/milestone
 * Ingests first-session discovery milestones (e.g. WATCH_STREAM, SWIPE_STREAM, FOLLOW_CREATOR).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, creatorProfileId, milestoneType, metadata } = body;

    if (!userId || !milestoneType) {
      return NextResponse.json(
        { error: "Missing required fields: userId, milestoneType" },
        { status: 400 }
      );
    }

    const result = await FirstSessionService.recordMilestone({
      userId,
      creatorProfileId,
      milestoneType,
      metadata,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Funnel API] Error recording milestone:", error);
    return NextResponse.json(
      { error: error.message || "Failed to record milestone." },
      { status: 500 }
    );
  }
}
