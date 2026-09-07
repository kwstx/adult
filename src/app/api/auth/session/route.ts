import { apiHandler, successResponse } from "@/lib/api-handler";
import { AuthService } from "@/modules/auth/auth.service";

/**
 * GET /api/auth/session
 * Thin endpoint: authenticates request -> calls AuthService.getSession -> returns user session.
 */
export const GET = apiHandler(
  async (req, ctx) => {
    const userSession = await AuthService.getSession(ctx.user!.id);
    return successResponse(userSession);
  },
  { requireAuth: true }
);
