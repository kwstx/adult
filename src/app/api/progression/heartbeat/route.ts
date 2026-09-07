import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vString, vBoolean, vNumber } from "@/lib/validator";
import { ViewingEventService } from "@/modules/xp/viewing-event.service";
import { ProgressionEngineService } from "@/modules/xp/progression-engine.service";
import { XpLedgerService } from "@/modules/xp/xp-ledger.service";

/**
 * POST /api/progression/heartbeat
 * Thin endpoint: records livestream watch session heartbeat and grants XP atomically.
 */
export const POST = apiHandler(
  async (req, ctx) => {
    const body = await Validator.validateBody(req, {
      livestreamId: vString({ required: true }),
      creatorProfileId: vString({ required: true }),
      windowFocused: vBoolean({ defaultValue: true }),
      audioAudible: vBoolean({ defaultValue: true }),
      videoPlaying: vBoolean({ defaultValue: true }),
      sessionWatchSeconds: vNumber({ integer: true, min: 0, defaultValue: 60 }),
    });

    const viewingRecord = await ViewingEventService.recordViewingEvent({
      fanId: ctx.user!.id,
      livestreamId: body.livestreamId!,
      creatorProfileId: body.creatorProfileId!,
      viewingSessionId: `vs_${ctx.user!.id}_${body.livestreamId}`,
      intervalSeconds: body.sessionWatchSeconds ?? 60,
      isWindowFocused: body.windowFocused ?? true,
      mediaPlaybackState: body.videoPlaying ? "PLAYING" : "PAUSED",
      clientTimestamp: Date.now(),
    });

    const progression = await ProgressionEngineService.evaluateViewingProgression(
      viewingRecord,
      1,
      1,
      false,
      "NEW_FAN"
    );

    let xpResult = null;
    if (progression.qualifies && progression.calculatedXp > 0) {
      xpResult = await XpLedgerService.recordXpTransaction({
        fanId: ctx.user!.id,
        creatorProfileId: body.creatorProfileId!,
        sourceEventType: "STREAM_WATCH_TIME",
        sourceEventId: viewingRecord.id,
        xpDelta: progression.calculatedXp,
        minutesWatched: progression.qualifyingMinutes,
      });
    }

    return successResponse({
      heartbeatRecorded: true,
      progression,
      xpResult,
    });
  },
  { requireAuth: true }
);
