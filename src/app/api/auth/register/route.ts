import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vString, vEnum, vBoolean } from "@/lib/validator";
import { AuthService } from "@/modules/auth/auth.service";

/**
 * POST /api/auth/register
 * Thin endpoint: authenticates -> validates -> calls AuthService.register -> returns result.
 */
export const POST = apiHandler(async (req) => {
  const body = await Validator.validateBody(req, {
    email: vString({ required: true, email: true }),
    username: vString({ required: true, min: 3, max: 30 }),
    displayName: vString({ required: true, min: 2, max: 50 }),
    role: vEnum(["FAN", "CREATOR"] as const, { defaultValue: "FAN" }),
    bio: vString({ max: 500 }),
    avatarUrl: vString(),
    ageVerified: vBoolean({ defaultValue: true }),
  });

  const session = await AuthService.register({
    email: body.email!,
    username: body.username!,
    displayName: body.displayName!,
    role: body.role as any,
    bio: body.bio,
    avatarUrl: body.avatarUrl,
    ageVerified: body.ageVerified,
  });

  return successResponse(session, 201);
});
