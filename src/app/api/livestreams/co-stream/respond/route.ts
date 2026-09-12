import { apiHandler, successResponse, ApiError } from "@/lib/api-handler";
import { CoStreamService } from "@/modules/livestream/co-stream.service";

/**
 * POST /api/livestreams/co-stream/respond
 * 
 * Guest creator accepts or declines a co-stream invitation.
 */
export const POST = apiHandler(async (req, ctx) => {
  const body = await req.json();
  const { sessionId, accept, rejectionReason } = body;

  let guestCreatorId = ctx.user?.creatorProfileId || body.guestCreatorId;

  if (!guestCreatorId) {
    throw new ApiError(401, "Authenticated creator profile required.", "UNAUTHORIZED");
  }

  if (!sessionId || typeof accept !== "boolean") {
    throw new ApiError(400, "sessionId and accept boolean are required.", "INVALID_INPUT");
  }

  const session = await CoStreamService.respondToInvitation({
    guestCreatorId,
    sessionId,
    accept,
    rejectionReason,
  });

  return successResponse({ session });
});
