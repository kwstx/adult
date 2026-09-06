import { NextRequest, NextResponse } from "next/server";
import { FanStatusService } from "@/modules/relationship/fan-status.service";

/**
 * GET /api/live/[creatorId]/audience-status
 * Retrieve active room participants with their elegant fan status.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await context.params;
    const url = new URL(req.url);
    const requestingUserId = url.searchParams.get("requestingUserId");

    const fans = await FanStatusService.getLiveRoomActiveFans(
      creatorId,
      requestingUserId
    );

    return NextResponse.json({
      success: true,
      data: fans,
    });
  } catch (error: any) {
    console.error("Failed to retrieve audience status list:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to retrieve audience status",
      },
      { status: 500 }
    );
  }
}
