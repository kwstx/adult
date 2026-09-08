import { NextRequest, NextResponse } from "next/server";
import { EventFunnelPipeline } from "@/modules/analytics/event-funnel/event-funnel-pipeline.service";

/**
 * POST /api/analytics/funnel/track
 * Ingests frontend telemetry events for the 16-stage funnel
 * (e.g. FEED_VIEWED, LIVE_IMPRESSION, WATCH_30_SECONDS, INTERACTION_VIEWED, PURCHASE_STARTED, LIVE_EXITED).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventType, userId, sessionId, creatorProfileId, livestreamId, durationSeconds, amountCredits, metadata } = body;

    if (!eventType) {
      return NextResponse.json({ error: "Missing required field: eventType" }, { status: 400 });
    }

    await EventFunnelPipeline.trackEvent({
      eventType,
      userId,
      sessionId,
      creatorProfileId,
      livestreamId,
      durationSeconds,
      amountCredits,
      metadata,
    });

    return NextResponse.json({ success: true, eventType, recordedAt: new Date().toISOString() });
  } catch (error: any) {
    console.error("[Funnel Track API] Error ingesting funnel event:", error);
    return NextResponse.json(
      { error: error.message || "Failed to ingest funnel event." },
      { status: 500 }
    );
  }
}
