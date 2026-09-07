import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vString } from "@/lib/validator";
import { MobileAuthService, MobileContextService } from "@/modules/mobile";

/**
 * GET /api/v1/auth/biometric
 * Requests a time-limited biometric challenge for Face ID / Touch ID unlock.
 */
export const GET = apiHandler(
  async (req, ctx) => {
    const context = MobileContextService.extractContext(req);
    const userId = ctx.user!.id;

    const challenge = await MobileAuthService.createBiometricChallenge(userId, context.deviceId);
    return successResponse(challenge);
  },
  { requireAuth: true }
);

/**
 * POST /api/v1/auth/biometric
 * Verifies a hardware-signed biometric assertion and exchanges it for fresh tokens.
 */
export const POST = apiHandler(async (req, ctx) => {
  const context = MobileContextService.extractContext(req);

  const body = await Validator.validateBody(req, {
    challengeId: vString({ required: true }),
    signature: vString({ required: true }),
  });

  const tokens = await MobileAuthService.verifyBiometricAssertion(
    {
      challengeId: body.challengeId!,
      deviceId: context.deviceId,
      signature: body.signature!,
    },
    context
  );

  return successResponse(tokens);
});
