import { NextRequest, NextResponse } from "next/server";
import {
  LeaderboardService,
  LeaderboardTimeframeOption,
} from "@/modules/realtime/leaderboard.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/realtime/[creatorId]/leaderboard
 * Ultra-fast cached ranking retrieval backed by Redis Sorted Sets (ZSET).
 * Zero SQL queries on hot path.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await context.params;
    const url = new URL(req.url);

    const timeframe = (url.searchParams.get("timeframe") || "stream") as LeaderboardTimeframeOption;
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10)));
    const userId = url.searchParams.get("userId");

    // Fetch Top N ranked supporters from Redis in microseconds
    const topContributors = await LeaderboardService.getTopContributors(
      creatorId,
      limit,
      timeframe
    );

    // If userId was provided, also fetch their relative position & distance to rank
    let userPosition = null;
    if (userId) {
      userPosition = await LeaderboardService.getUserRankPosition(
        creatorId,
        userId,
        timeframe
      );
    }

    return NextResponse.json({
      success: true,
      creatorId,
      timeframe,
      topContributors,
      userPosition,
      totalContributors: topContributors.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[GET Leaderboard API Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch leaderboard rankings.",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/realtime/[creatorId]/leaderboard
 * Manage leaderboard lifecycle:
 * - action: "FLUSH_TO_POSTGRES" (Durable PostgreSQL snapshot)
 * - action: "HYDRATE_FROM_POSTGRES" (Rebuild Redis cache from SQL ledger)
 * - action: "RESET_SESSION" (Reset temporary stream rankings)
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const { action = "FLUSH_TO_POSTGRES", livestreamId, timeframe = "stream" } = body;

    switch (action) {
      case "FLUSH_TO_POSTGRES": {
        const count = await LeaderboardService.flushSnapshotToPostgres({
          creatorId,
          livestreamId,
          timeframe,
        });
        return NextResponse.json({
          success: true,
          message: `Flushed ${count} ranking entries to PostgreSQL durable store.`,
          recordsPersisted: count,
        });
      }

      case "HYDRATE_FROM_POSTGRES": {
        const top = await LeaderboardService.hydrateFromPostgres(
          creatorId,
          timeframe,
          10
        );
        return NextResponse.json({
          success: true,
          message: "Hydrated Redis ZSET cache from PostgreSQL ledger.",
          topContributors: top,
        });
      }

      case "RESET_SESSION": {
        await LeaderboardService.resetLeaderboard(creatorId);
        return NextResponse.json({
          success: true,
          message: `Reset session leaderboard for creator ${creatorId}.`,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unsupported action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("[POST Leaderboard API Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Leaderboard operation failed." },
      { status: 500 }
    );
  }
}
