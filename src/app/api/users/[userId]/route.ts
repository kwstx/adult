import { apiHandler, successResponse, ApiError } from "@/lib/api-handler";
import { UserService } from "@/modules/user/user.service";

/**
 * GET /api/users/[userId]
 * Thin endpoint: calls UserService.getProfile with viewer context.
 */
export const GET = apiHandler<{ userId: string }>(async (req, ctx) => {
  const userId = ctx.params?.userId;
  if (!userId) {
    throw new ApiError(400, "User ID parameter is required.", "MISSING_USER_ID");
  }
  const profile = await UserService.getProfile(userId, ctx.user?.id);
  return successResponse(profile);
});
