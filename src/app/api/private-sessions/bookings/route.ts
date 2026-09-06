import { NextRequest, NextResponse } from "next/server";
import { PrivateBookingService } from "@/modules/private-sessions/booking.service";

/**
 * GET /api/private-sessions/bookings?userId=xyz&creatorProfileId=abc&role=CREATOR|FAN
 * Returns list of private session bookings.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || undefined;
    const creatorProfileId = searchParams.get("creatorProfileId") || undefined;
    const role = (searchParams.get("role") as "CREATOR" | "FAN") || undefined;
    const bookingId = searchParams.get("bookingId");

    if (bookingId) {
      const single = PrivateBookingService.getBookingById(bookingId);
      if (!single) {
        return NextResponse.json({ success: false, error: "Booking not found." }, { status: 404 });
      }
      return NextResponse.json({ success: true, booking: single });
    }

    const bookings = PrivateBookingService.getBookings({
      userId,
      creatorProfileId,
      role,
    });

    return NextResponse.json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error: any) {
    console.error("GET private-sessions/bookings error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve bookings." },
      { status: 500 }
    );
  }
}
