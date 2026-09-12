import { apiHandler, successResponse, ApiError } from "@/lib/api-handler";
import { CoStreamService } from "@/modules/livestream/co-stream.service";
import prisma from "@/lib/db";

/**
 * POST /api/livestreams/co-stream/invite
 * 
 * Invites a verified creator to participate in a co-livestream session with agreed split percentages.
 */
export const POST = apiHandler(async (req, ctx) => {
  const body = await req.json();
  const {
    guestCreatorId,
    hostSplitPercentage = 0.50,
    guestSplitPercentage = 0.50,
    title,
    layoutMode,
    scheduledStartAt,
  } = body;

  let primaryCreatorId = ctx.user?.creatorProfileId;

  if (!primaryCreatorId) {
    if (body.primaryCreatorId) {
      primaryCreatorId = body.primaryCreatorId;
    } else {
      const defaultHost = await prisma.creatorProfile.findFirst({
        select: { id: true },
      });
      primaryCreatorId = defaultHost?.id;
    }
  }

  if (!primaryCreatorId) {
    throw new ApiError(401, "Authenticated creator profile required.", "UNAUTHORIZED");
  }

  if (!guestCreatorId) {
    throw new ApiError(400, "guestCreatorId is required.", "MISSING_REQUIRED_FIELDS");
  }

  const session = await CoStreamService.inviteCoHost({
    primaryCreatorId,
    guestCreatorId,
    hostSplitPercentage: Number(hostSplitPercentage),
    guestSplitPercentage: Number(guestSplitPercentage),
    title,
    layoutMode,
    scheduledStartAt: scheduledStartAt ? new Date(scheduledStartAt) : undefined,
  });

  return successResponse({ session }, 201);
});
