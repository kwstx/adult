import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vEnum, vString } from "@/lib/validator";
import { ContentModerationService } from "@/modules/trust-safety/content-moderation.service";

/**
 * POST /api/moderation/content/[contentId]
 * Thin endpoint: updates content moderation state (APPROVED, RESTRICTED, REMOVED).
 */
export const POST = apiHandler<{ contentId: string }>(
  async (req, ctx) => {
    const body = await Validator.validateBody(req, {
      state: vEnum(["APPROVED", "RESTRICTED", "REMOVED", "REJECTED"] as const, { required: true }),
      reason: vString({ max: 500 }),
    });

    const result = await ContentModerationService.transitionState(
      ctx.params.contentId,
      body.state as any,
      body.reason || "Administrative review",
      {
        actorId: ctx.user!.id,
        actorType: "ADMIN",
        actorRole: ctx.user!.role,
      }
    );

    return successResponse(result);
  },
  { requiredRoles: ["ADMIN", "MODERATOR"] }
);
