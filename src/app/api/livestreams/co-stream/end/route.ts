import { apiHandler, successResponse, ApiError } from "@/lib/api-handler";
import { CoStreamService } from "@/modules/livestream/co-stream.service";
import prisma from "@/lib/db";

/**
 * POST /api/livestreams/co-stream/end
 * 
 * Terminates the multi-creator broadcast.
 */
export const POST = apiHandler(async (req, ctx) => {
  const body = await req.json();
  const { sessionId } = body;

  let hostCreatorId = ctx.user?.creatorProfileId || body.hostCreatorId;

  if (!hostCreatorId && sessionId) {
    const session = await prisma.coStreamSession.findUnique({
      where: { id: sessionId },
      select: { primaryHostId: true },
    });
    hostCreatorId = session?.primaryHostId;
  }

  if (!hostCreatorId) {
    throw new ApiError(401, "Authenticated creator profile required.", "UNAUTHORIZED");
  }

  if (!sessionId) {
    throw new ApiError(400, "sessionId is required.", "MISSING_SESSION_ID");
  }

  const endedSession = await CoStreamService.endBroadcast(hostCreatorId, sessionId);

  return successResponse({ session: endedSession });
});
