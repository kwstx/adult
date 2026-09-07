import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vString } from "@/lib/validator";
import { InteractionPurchaseService } from "@/modules/interaction/interaction-purchase.service";

/**
 * POST /api/interactions/purchase
 * Thin endpoint: Fan initiates interaction purchase with double-entry wallet debit, queue placement, and real-time broadcast.
 */
export const POST = apiHandler(
  async (req, ctx) => {
    const body = await Validator.validateBody(req, {
      creatorProfileId: vString({ required: true }),
      interactionId: vString({ required: true }),
      customPrompt: vString({ max: 500 }),
      idempotencyKey: vString(),
    });

    const result = await InteractionPurchaseService.purchaseInteraction({
      fanUserId: ctx.user!.id,
      creatorId: body.creatorProfileId!,
      interactionId: body.interactionId!,
      expectedPrice: 100,
      customMessage: body.customPrompt,
      idempotencyKey: body.idempotencyKey,
    });

    return successResponse(result, 201);
  },
  { requireAuth: true }
);
