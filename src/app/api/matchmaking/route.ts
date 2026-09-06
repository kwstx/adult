import { NextRequest, NextResponse } from "next/server";
import {
  MatchmakingEngine,
  MATCHMAKING_INTENTS,
} from "@/modules/matchmaking/matchmaking.engine";
import { MatchmakingIntent, MatchmakingRequest } from "@/modules/matchmaking/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const intent = (body.intent?.toUpperCase() || "INTERACTIVE") as MatchmakingIntent;

    if (!MATCHMAKING_INTENTS[intent]) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid matchmaking intent: '${body.intent}'. Valid options: ${Object.keys(
            MATCHMAKING_INTENTS
          ).join(", ")}`,
        },
        { status: 400 }
      );
    }

    const matchmakingReq: MatchmakingRequest = {
      userId: body.userId,
      intent,
      preferences: body.preferences || {},
      excludeCreatorIds: body.excludeCreatorIds || [],
    };

    const result = await MatchmakingEngine.evaluateMatch(matchmakingReq);

    if (!result.success || !result.decision) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "No eligible creators matched your criteria.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Matchmaking API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error during matchmaking evaluation.",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const intents = Object.values(MATCHMAKING_INTENTS);
    return NextResponse.json({
      success: true,
      intents,
      totalActivePool: 12,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
