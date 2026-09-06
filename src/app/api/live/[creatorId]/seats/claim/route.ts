import { NextRequest, NextResponse } from "next/server";
import { SeatEntitlementService } from "@/modules/seats/seat-entitlement.service";
import { SocialSeatTier } from "@/types/seat";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await params;
    const body = await request.json();

    const { fanUserId, seatTier, seatIndex } = body;

    if (!fanUserId || !seatTier) {
      return NextResponse.json(
        { error: "fanUserId and seatTier are required." },
        { status: 400 }
      );
    }

    const result = await SeatEntitlementService.claimSeat({
      creatorId,
      fanUserId,
      seatTier: seatTier as SocialSeatTier,
      seatIndex: typeof seatIndex === "number" ? seatIndex : undefined,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    return NextResponse.json({ success: true, seatSlot: result.seatSlot });
  } catch (error: any) {
    console.error("POST /api/live/[creatorId]/seats/claim error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to claim seat" },
      { status: 500 }
    );
  }
}
