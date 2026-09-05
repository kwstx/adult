import { NextRequest, NextResponse } from "next/server";
import { LeaderboardService } from "@/modules/realtime/leaderboard.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/realtime/[creatorId]/leaderboard
 * Instant snapshot of current live stream session's top tippers.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ creatorId: string }> }
) {
  const { creatorId } = await context.params;
  const topList = LeaderboardService.getTopContributors(creatorId, 10);
  return NextResponse.json({
    creatorId,
    topContributors: topList,
    totalContributors: topList.length,
    timestamp: new Date().toISOString(),
  });
}
