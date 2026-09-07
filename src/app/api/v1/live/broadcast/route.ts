import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vString } from "@/lib/validator";
import { MobileLiveService } from "@/modules/mobile";

/**
 * POST /api/v1/live/broadcast
 * Authorizes a mobile creator broadcasting live directly from phone camera (WHIP / RTMP).
 */
export const POST = apiHandler(
  async (req, ctx) => {
    const creatorUserId = ctx.user!.id;

    const body = await Validator.validateBody(req, {
      streamTitle: vString(),
      category: vString(),
      resolution: vString(),
    });

    const result = await MobileLiveService.authorizeBroadcaster({
      creatorUserId,
      streamTitle: body.streamTitle,
      category: body.category,
      resolution: (body.resolution as any) || "720p",
    });

    return successResponse(result);
  },
  { requireAuth: true, requiredRoles: ["CREATOR", "ADMIN"] }
);
