import { NextRequest, NextResponse } from "next/server";
import { DailyGameService } from "@/modules/games/daily-game.service";
import { FreeGameType } from "@/modules/games/types";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId") || "usr_fan_alex";
    const gameType = (url.searchParams.get("gameType") as FreeGameType) || "DAILY_SPIN_WHEEL";

    const status = await DailyGameService.getUserDailyStatus(userId, gameType);

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    console.error("[API ERROR] Daily Game Status:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to retrieve daily game status",
      },
      { status: 500 }
    );
  }
}
