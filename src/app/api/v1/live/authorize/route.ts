import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vBoolean, vString } from "@/lib/validator";
import { MobileLiveService } from "@/modules/mobile";

/**
 * POST /api/v1/live/authorize
 * Headless livestream authorization endpoint for native mobile video players (AVPlayer, ExoPlayer, WHEP).
 */
export const POST = apiHandler(async (req, ctx) => {
  const userId = ctx.user?.id;

  const body = await Validator.validateBody(req, {
    creatorId: vString({ required: true }),
    playerType: vString(),
    preferLowLatency: vBoolean(),
    networkType: vString(),
  });

  const result = await MobileLiveService.authorizePlayback({
    creatorId: body.creatorId!,
    userId,
    playerType: (body.playerType as any) || "AVPLAYER_IOS",
    preferLowLatency: body.preferLowLatency ?? true,
    networkType: (body.networkType as any) || "WIFI",
  });

  return successResponse(result);
});
