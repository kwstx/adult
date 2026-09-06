import { NextRequest, NextResponse } from "next/server";
import { PrivateBookingService } from "@/modules/private-sessions/booking.service";

/**
 * POST /api/private-sessions/authorize
 * 
 * Authorizes Creator or Fan to enter the private WebRTC media room.
 * Enforces authoritative time-window verification:
 * - Allowed from 5 minutes before scheduled start time through scheduled end time.
 * - If called early, returns countdown state and restriction explanation.
 * - If authorized, generates room entry token and WebRTC connection endpoints.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bookingId, userId } = body;

    if (!bookingId || !userId) {
      return NextResponse.json(
        { success: false, error: "bookingId and userId are required for authorization." },
        { status: 400 }
      );
    }

    const auth = PrivateBookingService.authorizeRoomEntry({
      bookingId,
      userId,
    });

    return NextResponse.json({
      success: true,
      auth,
    });
  } catch (error: any) {
    console.error("POST private-sessions/authorize error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to authorize room entry." },
      { status: 500 }
    );
  }
}
