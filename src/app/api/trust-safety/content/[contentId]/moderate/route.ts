import { NextRequest, NextResponse } from "next/server";
import { ContentModerationService } from "@/modules/trust-safety/content-moderation.service";
import { ContentModerationState } from "@/modules/trust-safety/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ contentId: string }> }
) {
  try {
    const { contentId } = await params;
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

    const updatedContent = await ContentModerationService.transitionState(
      contentId,
      targetState as ContentModerationState,
      reason,
      {
        actorId: actorId || "moderator_system",
        actorType: actorType || "MODERATOR",
        ipAddress: clientIp,
        userAgent,
      }
    );

    return NextResponse.json({ success: true, content: updatedContent });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update content moderation state." },
      { status: 400 }
    );
  }
}
