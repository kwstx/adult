import { apiHandler, successResponse } from "@/lib/api-handler";
import { FanOnboardingService } from "@/modules/fan-onboarding/fan-onboarding.service";

/**
 * GET /api/creators/featured?interests=gaming,cosplay
 * Fetches featured creators matched by interest for onboarding discovery.
 */
export const GET = apiHandler(async (req) => {
  const url = new URL(req.url);
  const interestsParam = url.searchParams.get("interests") || "";
  const interests = interestsParam ? interestsParam.split(",").map((s) => s.trim().toLowerCase()) : [];

  const creators = await FanOnboardingService.getFeaturedCreators(interests);
  return successResponse(creators);
});
