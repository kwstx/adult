import { NextRequest, NextResponse } from "next/server";
import { PrivateBookingService } from "@/modules/private-sessions/booking.service";

/**
 * POST /api/private-sessions/pay
 * 
 * Executes payment for a temporarily reserved slot:
 * - Settles ledger transactions / card payment (€100 for 30m, €140 for 45m, €180 for 60m)
 * - Transitions booking status to CONFIRMED
 * - Dispatches real-time booking notification to the Creator
 * - Returns confirmed booking receipt and meeting room identifier
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      reservationId,
      fanUser,
      creatorUser,
      paymentMethod = "WALLET_TOKENS", // or "FIAT_CARD"
      fanNotes,
      idempotencyKey,
    } = body;

    if (!reservationId || !fanUser?.id || !creatorUser?.id) {
      return NextResponse.json(
        { success: false, error: "reservationId, fanUser, and creatorUser are required." },
        { status: 400 }
      );
    }

    const result = await PrivateBookingService.processPaymentAndConfirm({
      reservationId,
      fanUser,
      creatorUser,
      paymentMethod,
      fanNotes,
      idempotencyKey,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Payment and confirmation failed." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      booking: result.booking,
      message: "Booking successfully confirmed! Creator has been notified.",
    });
  } catch (error: any) {
    console.error("POST private-sessions/pay error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process payment." },
      { status: 500 }
    );
  }
}
