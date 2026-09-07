import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vString } from "@/lib/validator";
import { MobileAuthService, MobileContextService } from "@/modules/mobile";

/**
 * POST /api/v1/auth/token
 * Reusable OAuth2-style token exchange endpoint for native mobile and web clients.
 * Supports grant types:
 * - "password": login with email/username + password -> returns Access + Refresh tokens
 * - "refresh_token": rotates single-use refresh token -> returns new Access + Refresh tokens
 */
export const POST = apiHandler(async (req, ctx) => {
  const context = MobileContextService.extractContext(req);

  const body = await Validator.validateBody(req, {
    grantType: vString({ required: true }),
    identifier: vString(),
    password: vString(),
    refreshToken: vString(),
  });

  if (body.grantType === "password") {
    if (!body.identifier) {
      throw new Error("Identifier (email or username) is required for password grant.");
    }
    const session = await MobileAuthService.loginMobile(
      {
        identifier: body.identifier,
        password: body.password,
        ipAddress: ctx.ipAddress,
      },
      context
    );
    return successResponse(session);
  }

  if (body.grantType === "refresh_token") {
    if (!body.refreshToken) {
      throw new Error("refreshToken is required for refresh_token grant.");
    }
    const result = await MobileAuthService.rotateRefreshToken(body.refreshToken, context);
    return successResponse(result);
  }

  throw new Error(`Unsupported grantType: ${body.grantType}`);
});
