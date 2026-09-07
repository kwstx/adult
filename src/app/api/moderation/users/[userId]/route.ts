import { apiHandler, successResponse, ApiError } from "@/lib/api-handler";
import { Validator, vEnum, vString } from "@/lib/validator";
import { AccountModerationService } from "@/modules/trust-safety/account-moderation.service";

/**
 * POST /api/moderation/users/[userId]
 * Thin endpoint: updates user account moderation state (ACTIVE, RESTRICTED, SUSPENDED, BANNED).
 */
export const POST = apiHandler<{ userId: string }>(
  async (req, ctx) => {
    const body = await Validator.validateBody(req, {
      state: vEnum(["ACTIVE", "RESTRICTED", "SUSPENDED", "BANNED", "UNDER_REVIEW"] as const, {
        required: true,
      }),
      reason: vString({ required: true, max: 500 }),
    });

    const userId = ctx.params?.userId;
    if (!userId) {
      throw new ApiError(400, "User ID parameter is required.", "MISSING_USER_ID");
    }

    const result = await AccountModerationService.transitionState(
      userId,
      body.state! as any,
      body.reason!,
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
