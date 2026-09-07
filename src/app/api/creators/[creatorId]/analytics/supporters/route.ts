import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vNumber } from "@/lib/validator";
import { CreatorAnalyticsService } from "@/modules/analytics/creator-analytics.service";

/**
 * GET /api/creators/[creatorId]/analytics/supporters?limit=20
 * Returns top supporters leaderboard with relationship progression & first conversion touchpoint.
 */
export const GET = apiHandler<{ creatorId: string }>(async (req, ctx) => {
  const query = Validator.validateQuery(req, {
    limit: vNumber({ integer: true, min: 1, max: 100, defaultValue: 20 }),
  });

  const supporters = await CreatorAnalyticsService.getTopSupporters(
    ctx.params.creatorId,
    query.limit
  );

  return successResponse(supporters);
});
