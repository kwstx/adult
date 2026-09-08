import { apiHandler, successResponse } from "@/lib/api-handler";
import { FanOnboardingService } from "@/modules/fan-onboarding/fan-onboarding.service";

/**
 * GET /api/auth/check-username?username=...
 * Live check for username availability during fan onboarding.
 */
export const GET = apiHandler(async (req) => {
  const url = new URL(req.url);
  const username = url.searchParams.get("username") || "";

  const result = await FanOnboardingService.checkUsernameAvailability(username);
  return successResponse(result);
});
