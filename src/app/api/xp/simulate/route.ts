import { NextRequest, NextResponse } from "next/server";
import { XpOrchestratorService } from "@/modules/xp/xp-orchestrator.service";

export const dynamic = "force-dynamic";

/**
 * POST /api/xp/simulate
 * Utility endpoint for testing & live demonstrations of the backend XP architecture.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fanId, creatorProfileId, action, customMinutes, customCredits, customXp } = body;

    if (!fanId || !creatorProfileId) {
      return NextResponse.json(
        { success: false, error: "fanId and creatorProfileId are required" },
        { status: 400 }
      );
    }

    const sessionId = `sim_session_${Date.now()}`;

    switch (action) {
      case "WATCH_1MIN": {
        const result = await XpOrchestratorService.processViewingHeartbeat({
          fanId,
          creatorProfileId,
          livestreamId: "live_stream_default",
          viewingSessionId: sessionId,
          intervalSeconds: 60,
          isWindowFocused: true,
          mediaPlaybackState: "PLAYING",
          clientTimestamp: Date.now(),
        });
        return NextResponse.json(result);
      }
      case "WATCH_5MIN": {
        // Send 5 qualifying intervals
        let lastResult: any;
        for (let i = 0; i < 5; i++) {
          lastResult = await XpOrchestratorService.processViewingHeartbeat({
            fanId,
            creatorProfileId,
            livestreamId: "live_stream_default",
            viewingSessionId: sessionId,
            intervalSeconds: 60,
            isWindowFocused: true,
            mediaPlaybackState: "PLAYING",
            clientTimestamp: Date.now() + i * 60000,
          });
        }
        return NextResponse.json(lastResult);
      }
      case "TIP_50": {
        const result = await XpOrchestratorService.awardEngagementXp({
          fanId,
          creatorProfileId,
          eventType: "LIVE_TIP",
          sourceEventId: `sim_tip_${Date.now()}`,
          creditsSpent: 50,
        });
        return NextResponse.json({ success: true, ...result });
      }
      case "TIP_500": {
        const result = await XpOrchestratorService.awardEngagementXp({
          fanId,
          creatorProfileId,
          eventType: "LIVE_TIP",
          sourceEventId: `sim_tip_${Date.now()}`,
          creditsSpent: 500,
        });
        return NextResponse.json({ success: true, ...result });
      }
      case "CUSTOM_XP": {
        const result = await XpOrchestratorService.awardEngagementXp({
          fanId,
          creatorProfileId,
          eventType: "CUSTOM_BONUS",
          sourceEventId: `sim_custom_${Date.now()}`,
          customXp: customXp || 500,
        });
        return NextResponse.json({ success: true, ...result });
      }
      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unknown simulation action: ${action}. Available: WATCH_1MIN, WATCH_5MIN, TIP_50, TIP_500, CUSTOM_XP`,
          },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("Simulation error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Simulation failed" },
      { status: 500 }
    );
  }
}
