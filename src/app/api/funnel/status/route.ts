import { NextRequest, NextResponse } from "next/server";
import { FirstSessionService } from "@/modules/funnel/first-session.service";

/**
 * GET /api/funnel/status
 * Returns authoritative first-session discovery funnel progress,
 * reward claim status, and active creator relationship details.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const creatorId = searchParams.get("creatorId") || undefined;

    if (!userId) {
      return NextResponse.json({ error: "Missing required query param: userId" }, { status: 400 });
    }

    const status = await FirstSessionService.getFunnelStatus(userId, creatorId);
    return NextResponse.json(status);
  } catch (error: any) {
    console.error("[Funnel API] Error fetching funnel status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve funnel status." },
      { status: 500 }
    );
  }
}
