import { apiHandler, successResponse } from "@/lib/api-handler";
import { CreatorCrmService } from "@/modules/creator-crm/creator-crm.service";
import prisma from "@/lib/db";

/**
 * GET /api/creator/crm/cohorts
 * 
 * Returns live counts, descriptions, recommendations, and audience health metrics
 * across all 10 authoritative CRM cohorts.
 */
export const GET = apiHandler(async (req, ctx) => {
  const { searchParams } = new URL(req.url);

  let creatorProfileId = ctx.user?.creatorProfileId || searchParams.get("creatorProfileId");

  if (!creatorProfileId) {
    const defaultProfile = await prisma.creatorProfile.findFirst({
      select: { id: true },
    });
    creatorProfileId = defaultProfile?.id || "creator_luna_profile";
  }

  const result = await CreatorCrmService.getCohortMetrics(creatorProfileId);
  return successResponse(result);
});
