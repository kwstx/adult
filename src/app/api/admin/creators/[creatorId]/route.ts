import { NextRequest, NextResponse } from "next/server";
import { AdminAuthService } from "@/modules/admin/admin-auth.service";
import { AdminService } from "@/modules/admin/admin.service";
import { CreatorModerationService } from "@/modules/trust-safety/creator-moderation.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  try {
    await AdminAuthService.assertAdminAccess(req, "CREATORS_VIEW");
    const { creatorId } = await params;
    const detail = await AdminService.getCreator360(creatorId);
    return NextResponse.json({ success: true, ...detail });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch creator 360 profile." },
      { status: error.statusCode || 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  try {
    const adminContext = await AdminAuthService.assertAdminAccess(req, "CREATORS_MANAGE");
    const { creatorId } = await params;
    const body = await req.json();
    const { moderationState, reason } = body;

    if (!moderationState || !reason) {
      return NextResponse.json(
        { error: "moderationState and reason are required." },
        { status: 400 }
      );
    }

    const updated = await CreatorModerationService.transitionState(
      creatorId,
      moderationState,
      reason,
      {
        actorId: adminContext.adminId,
        actorType: "ADMIN",
        ipAddress: adminContext.ipAddress,
        userAgent: adminContext.userAgent,
      }
    );

    return NextResponse.json({ success: true, creator: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update creator state." },
      { status: error.statusCode || 500 }
    );
  }
}
