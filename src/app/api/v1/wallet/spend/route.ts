import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vNumber, vString } from "@/lib/validator";
import { MobileContextService, MobileIapService } from "@/modules/mobile";

/**
 * POST /api/v1/wallet/spend
 * Reusable, atomic, idempotent spend endpoint for tipping, PPV unlocks, messages, and interactions.
 */
export const POST = apiHandler(
  async (req, ctx) => {
    const context = MobileContextService.extractContext(req);
    const userId = ctx.user!.id;

    const body = await Validator.validateBody(req, {
      credits: vNumber({ required: true, min: 1 }),
      targetType: vString({ required: true }),
      targetId: vString({ required: true }),
      customMessage: vString(),
      idempotencyKey: vString(),
    });

    const idempotencyKey =
      body.idempotencyKey ||
      context.idempotencyKey ||
      `mob_spend_${userId}_${body.targetId}_${Date.now()}`;

    const result = await MobileIapService.spendCredits({
      userId,
      credits: body.credits!,
      targetType: body.targetType as any,
      targetId: body.targetId!,
      customMessage: body.customMessage,
      idempotencyKey,
    });

    return successResponse(result);
  },
  { requireAuth: true }
);
