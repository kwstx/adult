import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vNumber } from "@/lib/validator";
import { ContentService } from "@/modules/content/content.service";

/**
 * GET /api/content/creator/[creatorId]?page=1&limit=20
 * Thin endpoint: lists creator gallery content with viewer unlock statuses.
 */
export const GET = apiHandler<{ creatorId: string }>(async (req, ctx) => {
  const query = Validator.validateQuery(req, {
    page: vNumber({ integer: true, min: 1, defaultValue: 1 }),
    limit: vNumber({ integer: true, min: 1, max: 50, defaultValue: 20 }),
  });

  const results = await ContentService.listCreatorContent(
    ctx.params.creatorId,
    ctx.user?.id,
    {
      page: query.page,
      limit: query.limit,
    }
  );

  return successResponse(results);
});
