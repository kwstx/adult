import { NextRequest, NextResponse } from "next/server";
import { AccountModerationService } from "@/modules/trust-safety/account-moderation.service";
import { AccountModerationState } from "@/modules/trust-safety/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const body = await req.json();
    const { targetState, reason, actorId, actorType, durationHours } = body;

    if (!targetState || !reason) {
      return NextResponse.json(
        { success: false, error: "targetState and reason are required." },
        { status: 400 }
      );
    }

    const clientIp = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    const updatedUser = await AccountModerationService.transitionState(
      userId,
      targetState as AccountModerationState,
      reason,
      {
        actorId: actorId || "moderator_system",
        actorType: actorType || "MODERATOR",
        ipAddress: clientIp,
        userAgent,
      },
      durationHours
    );

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update account moderation state." },
      { status: 400 }
    );
  }
}
