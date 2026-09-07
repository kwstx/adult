import { NextRequest, NextResponse } from "next/server";
import { DailyGameService } from "@/modules/games/daily-game.service";
import { RewardFulfillmentService } from "@/modules/games/reward-fulfillment.service";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId") || "usr_fan_alex";

    const history = DailyGameService.getSessionHistory(userId);
    const activeBadges = RewardFulfillmentService.getActiveTemporaryBadges(userId);
    const activeSeatPasses = RewardFulfillmentService.getActiveSeatPasses(userId);
    const activePriorityVouchers = RewardFulfillmentService.getActivePriorityVouchers(userId);

    return NextResponse.json({
      success: true,
      data: {
        userId,
        history,
        activePerks: {
          temporaryBadges: activeBadges,
          seatPasses: activeSeatPasses,
          priorityVouchers: activePriorityVouchers,
        },
      },
    });
  } catch (error: any) {
    console.error("[API ERROR] Daily Game History:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to retrieve game history",
      },
      { status: 500 }
    );
  }
}
