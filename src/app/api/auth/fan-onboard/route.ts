import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vString, vBoolean, vArray } from "@/lib/validator";
import { FanOnboardingService } from "@/modules/fan-onboarding/fan-onboarding.service";

/**
 * POST /api/auth/fan-onboard
 * Authoritative endpoint to complete the entire fan onboarding journey in one atomic operation.
 */
export const POST = apiHandler(async (req) => {
  const body = await Validator.validateBody(req, {
    email: vString({ required: true, email: true }),
    username: vString({ required: true, min: 3, max: 30 }),
    displayName: vString({ max: 50 }),
    avatarUrl: vString(),
    bio: vString({ max: 300 }),
    ageVerified: vBoolean({ required: true }),
    ageAssuranceMethod: vString({ defaultValue: "SELF_ATTESTATION" }),
    countryCode: vString({ defaultValue: "US" }),
    selectedInterests: vArray(vString(), { defaultValue: [] }),
    selectedCategory: vString(),
    followedCreatorProfileIds: vArray(vString(), { defaultValue: [] }),
    notificationsEnabled: vBoolean({ defaultValue: true }),
    notificationTier: vString({ defaultValue: "ALL" }),
  });

  const result = await FanOnboardingService.completeFanOnboarding({
    email: body.email!,
    username: body.username!,
    displayName: body.displayName || body.username!,
    avatarUrl: body.avatarUrl,
    bio: body.bio,
    ageVerified: body.ageVerified === true,
    ageAssuranceMethod: body.ageAssuranceMethod as any,
    countryCode: body.countryCode,
    selectedInterests: (body.selectedInterests || []).filter((s): s is string => typeof s === "string"),
    selectedCategory: body.selectedCategory,
    followedCreatorProfileIds: (body.followedCreatorProfileIds || []).filter((s): s is string => typeof s === "string"),
    notificationsEnabled: body.notificationsEnabled !== false,
    notificationTier: (body.notificationTier as any) || "ALL",
  });

  return successResponse(result, 201);
});
