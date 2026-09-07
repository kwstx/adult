import { apiHandler, successResponse } from "@/lib/api-handler";
import { CreatorCrmService } from "@/modules/creator-crm/creator-crm.service";
import prisma from "@/lib/db";

/**
 * GET /api/creator/crm/fans/[fanId]
 * 
 * Retrieves the complete 360-degree private CRM dossier for a specific fan.
 */
export const GET = apiHandler<{ fanId: string }>(async (req, ctx) => {
  const { fanId } = ctx.params;
  const { searchParams } = new URL(req.url);

  let creatorProfileId = ctx.user?.creatorProfileId || searchParams.get("creatorProfileId");

  if (!creatorProfileId) {
    const defaultProfile = await prisma.creatorProfile.findFirst({
      select: { id: true },
    });
    creatorProfileId = defaultProfile?.id || "creator_luna_profile";
  }

  const dossier = await CreatorCrmService.getFanDossier(creatorProfileId, fanId);
  return successResponse(dossier);
});

/**
 * PATCH /api/creator/crm/fans/[fanId]
 * 
 * Updates creator private notes, custom nickname, and tags for this fan.
 */
export const PATCH = apiHandler<{ fanId: string }>(async (req, ctx) => {
  const { fanId } = ctx.params;
  const body = await req.json();
  const { searchParams } = new URL(req.url);

  let creatorProfileId = ctx.user?.creatorProfileId || searchParams.get("creatorProfileId");

  if (!creatorProfileId) {
    const defaultProfile = await prisma.creatorProfile.findFirst({
      select: { id: true },
    });
    creatorProfileId = defaultProfile?.id || "creator_luna_profile";
  }

  const result = await CreatorCrmService.updateFanMetadata(creatorProfileId, fanId, {
    customNotes: body.customNotes,
    customNickname: body.customNickname,
    tags: body.tags,
  });

  return successResponse(result);
});
