import { apiHandler, successResponse, ApiError } from "@/lib/api-handler";
import { CoStreamService } from "@/modules/livestream/co-stream.service";

/**
 * GET /api/livestreams/co-stream/[sessionId]
 * 
 * Retrieves real-time Co-Stream state, co-hosts, stage layout, and WHEP playback token.
 */
export const GET = apiHandler(async (req, ctx) => {
  const sessionId = ctx.params?.sessionId;

  if (!sessionId) {
    throw new ApiError(400, "sessionId parameter is required.", "MISSING_SESSION_ID");
  }

  const viewerUserId = ctx.user?.id;
  const dossier = await CoStreamService.getCoStreamSession(sessionId, viewerUserId);

  return successResponse(dossier);
});
