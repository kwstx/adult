import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vString, vNumber } from "@/lib/validator";
import { StreamService } from "@/modules/livestream/stream.service";

/**
 * GET /api/live/active?category=<cat>&limit=20
 * Thin endpoint: retrieves all currently active live streams.
 */
export const GET = apiHandler(async (req) => {
  const query = Validator.validateQuery(req, {
    category: vString(),
    limit: vNumber({ integer: true, min: 1, max: 50, defaultValue: 20 }),
  });

  const streams = await StreamService.getActiveStreams({
    category: query.category,
    limit: query.limit,
  });

  return successResponse(streams);
});
