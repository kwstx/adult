import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vString, vNumber, vEnum } from "@/lib/validator";
import { UserService } from "@/modules/user/user.service";

/**
 * GET /api/users/search?q=<query>&role=<role>&page=1&limit=20
 * Thin endpoint: validates search parameters -> calls UserService.searchUsers.
 */
export const GET = apiHandler(async (req) => {
  const query = Validator.validateQuery(req, {
    q: vString({ required: true, min: 1 }),
    role: vEnum(["FAN", "CREATOR", "ADMIN", "MODERATOR"] as const),
    page: vNumber({ integer: true, min: 1, defaultValue: 1 }),
    limit: vNumber({ integer: true, min: 1, max: 100, defaultValue: 20 }),
  });

  const results = await UserService.searchUsers(query.q!, {
    role: query.role,
    page: query.page,
    limit: query.limit,
  });

  return successResponse(results);
});
