import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vString, vEnum } from "@/lib/validator";
import { LeaderboardService } from "@/modules/realtime/leaderboard.service";

/**
 * GET /api/progression/leaderboard?scope=GLOBAL&timeframe=ALL_TIME
 * Thin endpoint: retrieves real-time leaderboards.
 */
export const GET = apiHandler(async (req) => {
  const query = Validator.validateQuery(req, {
    creatorId: vString(),
    scope: vEnum(["GLOBAL", "ROOM", "SESSION"] as const, { defaultValue: "GLOBAL" }),
    timeframe: vEnum(["ALL_TIME", "MONTHLY", "WEEKLY", "DAILY"] as const, { defaultValue: "ALL_TIME" }),
  });

  const creatorId = query.creatorId || "global";
  const leaderboard = await LeaderboardService.getTopContributors(creatorId, 20, "all_time");

  return successResponse({
    scope: query.scope,
    timeframe: query.timeframe,
    creatorId,
    rankings: leaderboard,
  });
});
