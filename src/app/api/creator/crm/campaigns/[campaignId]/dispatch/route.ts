import { apiHandler, successResponse } from "@/lib/api-handler";
import { CreatorCrmService } from "@/modules/creator-crm/creator-crm.service";
import prisma from "@/lib/db";

/**
 * POST /api/creator/crm/campaigns/[campaignId]/dispatch
 * 
 * Executes an immediate campaign dispatch delivering personalized communications
 * to all eligible, non-suppressed cohort fans.
 */
export const POST = apiHandler<{ campaignId: string }>(async (req, ctx) => {
  const { campaignId } = ctx.params;
  const { searchParams } = new URL(req.url);

  let creatorProfileId = ctx.user?.creatorProfileId || searchParams.get("creatorProfileId");

  if (!creatorProfileId) {
    const defaultProfile = await prisma.creatorProfile.findFirst({
      select: { id: true },
    });
    creatorProfileId = defaultProfile?.id || "creator_luna_profile";
  }

  const campaign = await CreatorCrmService.dispatchCampaign(creatorProfileId, campaignId);
  return successResponse(campaign);
});
