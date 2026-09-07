import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vString } from "@/lib/validator";
import { StreamService } from "@/modules/livestream/stream.service";

/**
 * POST /api/live/access
 * Thin endpoint: authorizes viewer playback and issues signed playback tokens.
 */
export const POST = apiHandler(async (req, ctx) => {
  const body = await Validator.validateBody(req, {
    creatorId: vString({ required: true }),
  });

  const access = await StreamService.requestPlaybackAccess({
    creatorId: body.creatorId!,
    userId: ctx.user?.id,
  });

  return successResponse(access);
});
