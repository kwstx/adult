import { apiHandler, successResponse, ApiError } from "@/lib/api-handler";
import { CreatorCrmService } from "@/modules/creator-crm/creator-crm.service";
import prisma from "@/lib/db";

/**
 * GET /api/creator/crm/campaigns
 * 
 * Returns all creator campaigns with delivery, open, and conversion metrics.
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

  const campaigns = await CreatorCrmService.getCampaigns(creatorProfileId);
  return successResponse(campaigns);
});

/**
 * POST /api/creator/crm/campaigns
 * 
 * Creates a new targeted creator campaign to reach a specific audience cohort.
 */
export const POST = apiHandler(async (req, ctx) => {
  const body = await req.json();
  const { searchParams } = new URL(req.url);

  if (!body.title || !body.targetCohort || !body.messageBody) {
    throw new ApiError(400, "Title, targetCohort, and messageBody are required.", "INVALID_CAMPAIGN_INPUT");
  }

  let creatorProfileId = ctx.user?.creatorProfileId || searchParams.get("creatorProfileId");

  if (!creatorProfileId) {
    const defaultProfile = await prisma.creatorProfile.findFirst({
      select: { id: true },
    });
    creatorProfileId = defaultProfile?.id || "creator_luna_profile";
  }

  const campaign = await CreatorCrmService.createCampaign(creatorProfileId, {
    title: body.title,
    targetCohort: body.targetCohort,
    channel: body.channel || "DIRECT_MESSAGE",
    messageBody: body.messageBody,
    perkAttached: body.perkAttached,
    scheduledAt: body.scheduledAt,
    dispatchImmediately: body.dispatchImmediately !== undefined ? body.dispatchImmediately : true,
  });

  return successResponse(campaign, 201);
});
