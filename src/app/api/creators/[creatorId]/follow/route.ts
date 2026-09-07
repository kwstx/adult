import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vBoolean } from "@/lib/validator";
import { CreatorService } from "@/modules/creator/creator.service";

/**
 * POST /api/creators/[creatorId]/follow
 * Thin endpoint: authenticates -> validates -> toggles follow state via CreatorService.
 */
export const POST = apiHandler<{ creatorId: string }>(
  async (req, ctx) => {
    let notificationsEnabled = true;
    try {
      const body = await Validator.validateBody(req, {
        notificationsEnabled: vBoolean({ defaultValue: true }),
      });
      notificationsEnabled = body.notificationsEnabled ?? true;
    } catch {
      // Body is optional
    }

    const result = await CreatorService.toggleFollow(
      ctx.user!.id,
      ctx.params.creatorId,
      notificationsEnabled
    );

    return successResponse(result);
  },
  { requireAuth: true }
);
