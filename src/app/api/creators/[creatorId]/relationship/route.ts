import { NextRequest, NextResponse } from "next/server";
import { RelationshipService } from "@/modules/relationship/relationship.service";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await context.params;
    const url = new URL(req.url);
    const fanId = url.searchParams.get("fanId") || "usr_fan_alex";

    const detail = await RelationshipService.getRelationship(fanId, creatorId);
    return NextResponse.json({
      success: true,
      data: detail,
    });
  } catch (error: any) {
    console.error("Failed to fetch creator relationship:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch creator relationship",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await context.params;
    const body = await req.json();
    const fanId = body.fanId || "usr_fan_alex";

    if (body.action) {
      // Simulation action: e.g. TIP_50, TIP_500, WATCH_30M, CHAT_10, SUB_VIP, CUSTOM
      const result = await RelationshipService.simulateEngagement(
        fanId,
        creatorId,
        body.action,
        body.customXp
      );
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    // Explicit XP award
    const result = await RelationshipService.awardEngagementXP({
      fanId,
      creatorProfileId: creatorId,
      eventType: body.eventType || "LIVE_TIP",
      creditsSpent: body.creditsSpent,
      minutesWatched: body.minutesWatched,
      messagesCount: body.messagesCount,
      customXpAmount: body.customXpAmount,
      metadata: body.metadata,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Failed to award relationship XP:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to award relationship XP",
      },
      { status: 500 }
    );
  }
}
