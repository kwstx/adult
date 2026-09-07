import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vNumber } from "@/lib/validator";
import { CreatorService } from "@/modules/creator/creator.service";

/**
 * GET /api/creators/[creatorId]/top-fans?limit=20
 * Thin endpoint: retrieves creator top fans leaderboard.
 */
export const GET = apiHandler<{ creatorId: string }>(async (req, ctx) => {
  const query = Validator.validateQuery(req, {
    limit: vNumber({ integer: true, min: 1, max: 50, defaultValue: 20 }),
  });

  const fans = await CreatorService.getTopFans(ctx.params.creatorId, query.limit);
  return successResponse(fans);
});
