import { apiHandler, successResponse, ApiError } from "@/lib/api-handler";
import { CoStreamService } from "@/modules/livestream/co-stream.service";
import { StageLayoutMode } from "@/modules/livestream/sfu-media.adapter";
import prisma from "@/lib/db";

/**
 * POST /api/livestreams/co-stream/layout
 * 
 * Switches dynamic video stage layout (SIDE_BY_SIDE, PICTURE_IN_PICTURE, GRID, ACTIVE_SPEAKER).
 */
export const POST = apiHandler(async (req, ctx) => {
  const body = await req.json();
  const { sessionId, layoutMode } = body;

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

  if (!sessionId || !layoutMode) {
    throw new ApiError(400, "sessionId and layoutMode are required.", "INVALID_INPUT");
  }

  const updatedSession = await CoStreamService.updateStageLayout(
    hostCreatorId,
    sessionId,
    layoutMode as StageLayoutMode
  );

  return successResponse({ session: updatedSession });
});
