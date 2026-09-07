import { apiHandler, successResponse } from "@/lib/api-handler";
import { MobileAuthService } from "@/modules/mobile";

/**
 * GET /api/v1/auth/sessions
 * Returns all active web and mobile device sessions for the authenticated user.
 */
export const GET = apiHandler(
  async (req, ctx) => {
    const userId = ctx.user!.id;
    const sessions = await MobileAuthService.listUserSessions(userId);
    return successResponse(sessions);
  },
  { requireAuth: true }
);
