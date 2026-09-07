import { apiHandler, successResponse } from "@/lib/api-handler";
import { AuthService } from "@/modules/auth/auth.service";

/**
 * POST /api/auth/logout
 * Thin endpoint: authenticates request -> calls AuthService.logout -> returns confirmation.
 */
export const POST = apiHandler(
  async (req, ctx) => {
    const result = await AuthService.logout(ctx.user!.id);
    return successResponse(result);
  },
  { requireAuth: true }
);
