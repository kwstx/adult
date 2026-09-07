import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vString } from "@/lib/validator";
import { UserService } from "@/modules/user/user.service";

/**
 * GET /api/users/profile
 * Retrieves authenticated user's profile with social context.
 */
export const GET = apiHandler(
  async (req, ctx) => {
    const profile = await UserService.getProfile(ctx.user!.id, ctx.user!.id);
    return successResponse(profile);
  },
  { requireAuth: true }
);

/**
 * PATCH /api/users/profile
 * Updates authenticated user's profile information.
 */
export const PATCH = apiHandler(
  async (req, ctx) => {
    const body = await Validator.validateBody(req, {
      displayName: vString({ min: 2, max: 50 }),
      bio: vString({ max: 500 }),
      avatarUrl: vString(),
      bannerUrl: vString(),
    });

    const updated = await UserService.updateProfile(ctx.user!.id, body);
    return successResponse(updated);
  },
  { requireAuth: true }
);
