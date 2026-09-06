import { NextRequest, NextResponse } from "next/server";
import { SeatEntitlementService } from "@/modules/seats/seat-entitlement.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await params;
    const body = await request.json();

    const { requesterUserId, guestUserId, invitationNote } = body;

    if (!requesterUserId || !guestUserId) {
      return NextResponse.json(
        { error: "requesterUserId and guestUserId are required." },
        { status: 400 }
      );
    }

    const result = await SeatEntitlementService.inviteCreatorGuest({
      creatorId,
      requesterUserId,
      guestUserId,
      invitationNote,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    return NextResponse.json({ success: true, seatSlot: result.seatSlot });
  } catch (error: any) {
    console.error("POST /api/live/[creatorId]/seats/invite-guest error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to invite guest to spotlight" },
      { status: 500 }
    );
  }
}
