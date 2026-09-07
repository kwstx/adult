import { apiHandler, successResponse } from "@/lib/api-handler";
import { CreatorAnalyticsService } from "@/modules/analytics/creator-analytics.service";
import { AnalyticsTimeframe } from "@/modules/analytics/types";
import prisma from "@/lib/db";

/**
 * GET /api/creator/analytics
 * 
 * Returns the creator analytics for the currently authenticated creator,
 * or the platform's primary demonstration creator if in preview mode.
 */
export const GET = apiHandler(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const timeframe = (searchParams.get("timeframe") as AnalyticsTimeframe) || "LAST_7_DAYS";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const customRange =
    startDate && endDate ? { startDate, endDate } : undefined;

  let creatorProfileId = ctx.user?.creatorProfileId;

  if (!creatorProfileId) {
    // Look up default active creator profile for demo/preview
    const defaultProfile = await prisma.creatorProfile.findFirst({
      select: { id: true },
    });
    creatorProfileId = defaultProfile?.id || "creator_maya";
  }

  const analytics = await CreatorAnalyticsService.getCreatorAnalyticsOverview(
    creatorProfileId,
    timeframe,
    customRange
  );

  return successResponse(analytics);
});
