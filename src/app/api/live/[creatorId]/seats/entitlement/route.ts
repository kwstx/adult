import { NextRequest, NextResponse } from "next/server";
import { SeatEntitlementService } from "@/modules/seats/seat-entitlement.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId query parameter is required." },
        { status: 400 }
      );
    }

    const entitlement = await SeatEntitlementService.evaluateEntitlement(userId, creatorId);

    return NextResponse.json(entitlement);
  } catch (error: any) {
    console.error("GET /api/live/[creatorId]/seats/entitlement error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to evaluate seat entitlement" },
      { status: 500 }
    );
  }
}
