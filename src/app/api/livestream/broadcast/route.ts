import { NextRequest, NextResponse } from "next/server";
import { StreamService } from "@/modules/livestream/stream.service";
import prisma from "@/lib/db";

/**
 * POST /api/livestream/broadcast
 * Creator starts or stops broadcast and retrieves live ingest credentials.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { creatorUserId, action, streamTitle } = body;

    if (!creatorUserId || !action) {
      return NextResponse.json(
        { error: "creatorUserId and action are required." },
        { status: 400 }
      );
    }

    if (action === "START") {
      const creds = await StreamService.startBroadcast(creatorUserId, streamTitle);
      return NextResponse.json({ success: true, isLive: true, creds });
    } else if (action === "STOP") {
      await StreamService.endBroadcast(creatorUserId);
      return NextResponse.json({ success: true, isLive: false });
    } else {
      return NextResponse.json({ error: "Invalid action. Use START or STOP." }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Broadcast control error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update broadcast status." },
      { status: 500 }
    );
  }
}
