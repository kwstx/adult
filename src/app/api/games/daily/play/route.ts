import { NextRequest, NextResponse } from "next/server";
import { DailyGameService } from "@/modules/games/daily-game.service";
import { FreeGameType } from "@/modules/games/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = body.userId || "usr_fan_alex";
    const gameType = (body.gameType as FreeGameType) || "DAILY_SPIN_WHEEL";
    const creatorProfileId = body.creatorProfileId;
    const creatorStageName = body.creatorStageName;

    const result = await DailyGameService.playDailyGame({
      userId,
      gameType,
      creatorProfileId,
      creatorStageName,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("[API ERROR] Play Daily Game:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process daily game spin",
      },
      { status: 400 }
    );
  }
}
