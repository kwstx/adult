import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vString } from "@/lib/validator";
import { AuthService } from "@/modules/auth/auth.service";

/**
 * POST /api/auth/login
 * Thin endpoint: validates credentials -> calls AuthService.login -> returns result.
 */
export const POST = apiHandler(async (req, ctx) => {
  const body = await Validator.validateBody(req, {
    identifier: vString({ required: true }),
    password: vString(),
  });

  const session = await AuthService.login({
    identifier: body.identifier!,
    password: body.password,
    ipAddress: ctx.ipAddress,
  });

  return successResponse(session);
});
