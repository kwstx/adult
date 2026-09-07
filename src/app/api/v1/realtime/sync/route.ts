import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vNumber, vString } from "@/lib/validator";
import { MobileRealtimeService } from "@/modules/mobile";

/**
 * POST /api/v1/realtime/sync
 * Reconnect sync endpoint to catch up on missed room events after mobile background suspension.
 */
export const POST = apiHandler(async (req) => {
  const body = await Validator.validateBody(req, {
    channel: vString({ required: true }),
    lastKnownSeq: vNumber({ required: true, min: 0 }),
    limit: vNumber({ min: 1, max: 200 }),
  });

  const response = await MobileRealtimeService.syncMissedEvents({
    channel: body.channel!,
    lastKnownSeq: body.lastKnownSeq!,
    limit: body.limit || 100,
  });

  return successResponse(response);
});
