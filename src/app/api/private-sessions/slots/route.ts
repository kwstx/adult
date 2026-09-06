import { NextRequest, NextResponse } from "next/server";
import { PrivateBookingService } from "@/modules/private-sessions/booking.service";

/**
 * GET /api/private-sessions/slots?creatorId=xyz&date=2026-09-06&duration=30
 * 
 * Generates and returns discrete bookable time slots based on creator availability,
 * duration, existing bookings, and active temporary holds.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const creatorId = searchParams.get("creatorId") || "creator_maya";
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const durationMinutes = Number(searchParams.get("duration") || 30);

    const slots = PrivateBookingService.getAvailableSlots({
      creatorProfileId: creatorId,
      date,
      durationMinutes,
    });

    return NextResponse.json({
      success: true,
      creatorId,
      date,
      durationMinutes,
      totalSlots: slots.length,
      availableSlotsCount: slots.filter((s) => s.isAvailable).length,
      slots,
    });
  } catch (error: any) {
    console.error("GET private-sessions/slots error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate bookable slots." },
      { status: 500 }
    );
  }
}
