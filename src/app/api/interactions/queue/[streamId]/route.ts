import { apiHandler, successResponse } from "@/lib/api-handler";
import { InteractionQueueService } from "@/modules/realtime/interaction-queue.service";

/**
 * GET /api/interactions/queue/[streamId]
 * Thin endpoint: retrieves ordered livestream interaction queue.
 */
export const GET = apiHandler<{ streamId: string }>(async (req, ctx) => {
  const queue = InteractionQueueService.getCreatorQueue(ctx.params.streamId);
  return successResponse(queue);
});
