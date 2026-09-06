import { NextRequest, NextResponse } from "next/server";
import { PrivateBookingService } from "@/modules/private-sessions/booking.service";
import { reservationLockService } from "@/modules/private-sessions/reservation-lock.service";

/**
 * POST /api/private-sessions/reserve
 * Temporarily locks/holds a bookable slot for 10 minutes (600s) during checkout.
 * 
 * DELETE /api/private-sessions/reserve?reservationId=xyz
 * Releases a temporary hold lock if checkout is cancelled.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      creatorId = "creator_maya",
      fanId,
      startTimeUtc,
      endTimeUtc,
      displayTime,
      durationMinutes = 30,
    } = body;

    if (!fanId || !startTimeUtc || !endTimeUtc || !displayTime) {
      return NextResponse.json(
        { success: false, error: "fanId, startTimeUtc, endTimeUtc, and displayTime are required." },
        { status: 400 }
      );
    }

    const result = PrivateBookingService.reserveSlot({
      creatorProfileId: creatorId,
      fanId,
      startTimeUtc,
      endTimeUtc,
      displayTime,
      durationMinutes,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Slot is unavailable." },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      hold: result.hold,
      message: `Slot at ${displayTime} temporarily reserved for 10 minutes.`,
    });
  } catch (error: any) {
    console.error("POST private-sessions/reserve error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to reserve slot." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const reservationId = searchParams.get("reservationId");

    if (!reservationId) {
      return NextResponse.json(
        { success: false, error: "reservationId is required." },
        { status: 400 }
      );
    }

    const released = reservationLockService.releaseHold(reservationId);
    return NextResponse.json({ success: true, released });
  } catch (error: any) {
    console.error("DELETE private-sessions/reserve error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to release reservation hold." },
      { status: 500 }
    );
  }
}
