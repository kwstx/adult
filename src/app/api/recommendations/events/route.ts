import { NextRequest, NextResponse } from "next/server";
import { ingestRecommendationEvents } from "@/lib/recommendations/event-collector";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const events = Array.isArray(body.events)
      ? body.events
      : Array.isArray(body)
      ? body
      : [body];

    if (!events || events.length === 0) {
      return NextResponse.json(
        { error: "No recommendation events provided." },
        { status: 400 }
      );
    }

    const result = await ingestRecommendationEvents({
      sessionId: body.sessionId || "client_session",
      userId: body.userId || null,
      events,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Recommendation Events API Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to ingest recommendation events." },
      { status: 500 }
    );
  }
}
