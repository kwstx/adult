import { apiHandler, successResponse } from "@/lib/api-handler";
import { CreatorAnalyticsService } from "@/modules/analytics/creator-analytics.service";
import { AnalyticsTimeframe } from "@/modules/analytics/types";

/**
 * GET /api/creators/[creatorId]/analytics
 * 
 * Returns the comprehensive Creator Analytics Overview covering:
 * - Live viewers & Peak viewers
 * - Average watch duration
 * - Followers gained
 * - Subscriptions & Revenue streams (PPV, Gifts, Interactions, 1-on-1 Sessions, Paid DMs)
 * - Total revenue (Gross, Net, Rake)
 * - Top supporters CRM leaderboard
 * - Fan retention cohorts (D1, D7, D30, D90)
 * - Relationship-level distribution (Stranger -> Royal Patron)
 * - Content performance by media item
 * - Conversion rate & funnel
 * - Repeat purchasers analysis
 * - NORTH STAR ATTRIBUTION: Which activities turn viewers into repeat high-value fans?
 */
export const GET = apiHandler<{ creatorId: string }>(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const timeframe = (searchParams.get("timeframe") as AnalyticsTimeframe) || "LAST_7_DAYS";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const customRange =
    startDate && endDate ? { startDate, endDate } : undefined;

  const analytics = await CreatorAnalyticsService.getCreatorAnalyticsOverview(
    ctx.params.creatorId,
    timeframe,
    customRange
  );

  return successResponse(analytics);
});
