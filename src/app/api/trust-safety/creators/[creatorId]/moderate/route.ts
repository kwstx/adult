import { NextRequest, NextResponse } from "next/server";
import { CreatorModerationService } from "@/modules/trust-safety/creator-moderation.service";
import { CreatorModerationState } from "@/modules/trust-safety/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await params;
    const body = await req.json();
    const { targetState, reason, actorId, actorType } = body;

    if (!targetState || !reason) {
      return NextResponse.json(
        { success: false, error: "targetState and reason are required." },
        { status: 400 }
      );
    }

    const clientIp = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    const updatedCreator = await CreatorModerationService.transitionState(
      creatorId,
      targetState as CreatorModerationState,
      reason,
      {
        actorId: actorId || "admin_compliance",
        actorType: actorType || "ADMIN",
        ipAddress: clientIp,
        userAgent,
      }
    );

    return NextResponse.json({ success: true, creator: updatedCreator });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update creator moderation state." },
      { status: 400 }
    );
  }
}
