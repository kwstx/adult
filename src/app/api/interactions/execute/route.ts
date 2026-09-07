import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vString, vEnum } from "@/lib/validator";
import { InteractionQueueService } from "@/modules/realtime/interaction-queue.service";

/**
 * POST /api/interactions/execute
 * Thin endpoint: Creator updates interaction queue status (start execution, complete, or reject).
 */
export const POST = apiHandler(
  async (req, ctx) => {
    const body = await Validator.validateBody(req, {
      creatorProfileId: vString({ required: true }),
      queueEntryId: vString({ required: true }),
      action: vEnum(["START", "COMPLETE", "SKIP", "REJECT"] as const, { required: true }),
      notes: vString(),
    });

    let result;
    if (body.action === "START") {
      result = await InteractionQueueService.startProgressInteraction(body.creatorProfileId!, body.queueEntryId!);
    } else if (body.action === "COMPLETE") {
      result = await InteractionQueueService.completeInteraction(body.creatorProfileId!, body.queueEntryId!);
    } else if (body.action === "SKIP") {
      result = await InteractionQueueService.startProgressInteraction(body.creatorProfileId!, body.queueEntryId!);
    } else {
      result = await InteractionQueueService.rejectInteraction({
        creatorId: body.creatorProfileId!,
        queueId: body.queueEntryId!,
        reason: body.notes || "Rejected by creator",
      });
    }

    return successResponse(result);
  },
  { requireAuth: true }
);
