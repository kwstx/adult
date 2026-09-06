import { NextRequest, NextResponse } from "next/server";
import { SeatEntitlementService } from "@/modules/seats/seat-entitlement.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await params;
    const body = await request.json();

    const { fanUserId, seatIndex } = body;

    if (!fanUserId) {
      return NextResponse.json(
        { error: "fanUserId is required." },
        { status: 400 }
      );
    }

    const result = await SeatEntitlementService.vacateSeat({
      creatorId,
      fanUserId,
      seatIndex: typeof seatIndex === "number" ? seatIndex : undefined,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("POST /api/live/[creatorId]/seats/vacate error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to vacate seat" },
      { status: 500 }
    );
  }
}
