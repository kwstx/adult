import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

interface IngestEventPayload {
  sessionId: string;
  userId?: string;
  creatorId: string;
  streamId?: string;
  eventType:
    | "IMPRESSION"
    | "WATCH_3S"
    | "WATCH_20S"
    | "WATCH_90S"
    | "WATCH_DURATION"
    | "IMMEDIATE_BOUNCE"
    | "FOLLOW"
    | "UNFOLLOW"
    | "INTERACTION_MENU_OPEN"
    | "STREAM_ENTER"
    | "STREAM_LEAVE"
    | "CHAT_OPEN"
    | "GIFT_OPEN"
    | "PPV_OPEN"
    | "LIKE"
    | "TIP";
  dwellTimeMs?: number;
  category?: string;
  positionIndex?: number;
  metadata?: Record<string, any>;
  timestamp?: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const events: IngestEventPayload[] = Array.isArray(body.events)
      ? body.events
      : [body];

    if (!events || events.length === 0) {
      return NextResponse.json({ error: "No events provided." }, { status: 400 });
    }

    const recordsToInsert = events
      .filter((e) => e.creatorId && e.eventType)
      .map((e) => ({
        sessionId: e.sessionId || body.sessionId || "anonymous_session",
        userId: e.userId || body.userId || null,
        creatorId: e.creatorId,
        streamId: e.streamId || null,
        eventType: e.eventType,
        dwellTimeMs: e.dwellTimeMs || 0,
        category: e.category || null,
        positionIndex: typeof e.positionIndex === "number" ? e.positionIndex : null,
        metadataJson: e.metadata ? JSON.stringify(e.metadata) : null,
        createdAt: e.timestamp ? new Date(e.timestamp) : new Date(),
      }));

    if (recordsToInsert.length > 0) {
      await prisma.discoveryEvent.createMany({
        data: recordsToInsert,
      });
    }

    return NextResponse.json({
      success: true,
      ingestedCount: recordsToInsert.length,
      serverTime: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Feed Telemetry Ingestion Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to ingest telemetry events." },
      { status: 500 }
    );
  }
}
