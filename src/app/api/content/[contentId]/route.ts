import { apiHandler, successResponse } from "@/lib/api-handler";
import { ContentService } from "@/modules/content/content.service";

/**
 * GET /api/content/[contentId]
 * Thin endpoint: evaluates viewer authorization and returns content with authorized media stream if unlocked.
 */
export const GET = apiHandler<{ contentId: string }>(async (req, ctx) => {
  const content = await ContentService.getContent(ctx.params.contentId, ctx.user?.id);
  return successResponse(content);
});
