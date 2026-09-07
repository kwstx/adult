import { apiHandler, successResponse } from "@/lib/api-handler";
import { CreatorAnalyticsService } from "@/modules/analytics/creator-analytics.service";

/**
 * GET /api/creators/[creatorId]/analytics/content
 * Returns content performance analytics by media item.
 */
export const GET = apiHandler<{ creatorId: string }>(async (req, ctx) => {
  const content = await CreatorAnalyticsService.getContentPerformance(ctx.params.creatorId);
  return successResponse(content);
});
