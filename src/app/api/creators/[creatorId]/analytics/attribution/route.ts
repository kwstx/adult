import { apiHandler, successResponse } from "@/lib/api-handler";
import { CreatorAnalyticsService } from "@/modules/analytics/creator-analytics.service";
import { AnalyticsTimeframe } from "@/modules/analytics/types";

/**
 * GET /api/creators/[creatorId]/analytics/attribution
 * 
 * Deep-Dive North Star Attribution Endpoint:
 * "Which activities turn viewers into repeat high-value fans?"
 * Returns conversion rates to repeat high-value supporter status, lift multipliers,
 * average LTV, repeat purchase frequency, and marketplace tuning recommendations.
 */
export const GET = apiHandler<{ creatorId: string }>(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const timeframe = (searchParams.get("timeframe") as AnalyticsTimeframe) || "LAST_30_DAYS";

  const attribution = await CreatorAnalyticsService.getActivityAttributionAnalysis(
    ctx.params.creatorId,
    timeframe
  );

  return successResponse(attribution);
});
