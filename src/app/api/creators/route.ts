import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vString, vBoolean, vNumber } from "@/lib/validator";
import { CreatorService } from "@/modules/creator/creator.service";

/**
 * GET /api/creators?category=<cat>&tags=<tags>&isLive=true&page=1&limit=20
 * Thin endpoint: validates filters -> calls CreatorService.listCreators.
 */
export const GET = apiHandler(async (req) => {
  const query = Validator.validateQuery(req, {
    category: vString(),
    tags: vString(),
    isLive: vBoolean(),
    page: vNumber({ integer: true, min: 1, defaultValue: 1 }),
    limit: vNumber({ integer: true, min: 1, max: 50, defaultValue: 20 }),
  });

  const results = await CreatorService.listCreators({
    category: query.category,
    tags: query.tags,
    isLive: query.isLive,
    page: query.page,
    limit: query.limit,
  });

  return successResponse(results);
});
