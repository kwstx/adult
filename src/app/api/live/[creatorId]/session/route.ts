import { apiHandler, successResponse } from "@/lib/api-handler";
import { RoomSessionService } from "@/modules/livestream/room-session.service";

/**
 * GET /api/live/[creatorId]/session
 * Thin endpoint: retrieves authoritative room bootstrapper state for a live room.
 */
export const GET = apiHandler<{ creatorId: string }>(async (req, ctx) => {
  const session = await RoomSessionService.getRoomSession({
    creatorIdOrUsername: ctx.params.creatorId,
    viewerUserId: ctx.user?.id,
  });

  return successResponse(session);
});
