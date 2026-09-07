import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vString } from "@/lib/validator";
import { ContentService } from "@/modules/content/content.service";

/**
 * POST /api/content/[contentId]/unlock
 * Thin endpoint: authenticates fan -> executes atomic PPV purchase & credit transfer.
 */
export const POST = apiHandler<{ contentId: string }>(
  async (req, ctx) => {
    let idempotencyKey: string | undefined;
    try {
      const body = await Validator.validateBody(req, {
        idempotencyKey: vString(),
      });
      idempotencyKey = body.idempotencyKey;
    } catch {
      // Body optional
    }

    const result = await ContentService.unlockPPV(
      ctx.user!.id,
      ctx.params.contentId,
      idempotencyKey
    );

    return successResponse(result);
  },
  { requireAuth: true }
);
