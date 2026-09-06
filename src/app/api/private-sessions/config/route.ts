import { NextRequest, NextResponse } from "next/server";
import { PrivateBookingService } from "@/modules/private-sessions/booking.service";

/**
 * GET /api/private-sessions/config?creatorId=xyz
 * Returns creator's private session configuration (pricing tiers 30m/€100, 45m/€140, 60m/€180, weekly schedule).
 * 
 * POST /api/private-sessions/config
 * Updates creator's private session pricing tiers & availability schedule.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const creatorId = searchParams.get("creatorId") || "creator_maya";

    const settings = PrivateBookingService.getCreatorSettings(creatorId);
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error("GET private-sessions/config error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch session settings." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { creatorId = "creator_maya", pricingTiers, weeklySchedule, bufferTimeMinutes, timezone, customWelcomeMessage } = body;

    const updated = PrivateBookingService.updateCreatorSettings(creatorId, {
      pricingTiers,
      weeklySchedule,
      bufferTimeMinutes,
      timezone,
      customWelcomeMessage,
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    console.error("POST private-sessions/config error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update session settings." },
      { status: 500 }
    );
  }
}
