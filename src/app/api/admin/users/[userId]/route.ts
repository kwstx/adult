import { NextRequest, NextResponse } from "next/server";
import { AdminAuthService } from "@/modules/admin/admin-auth.service";
import { AdminService } from "@/modules/admin/admin.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await AdminAuthService.assertAdminAccess(req, "USERS_VIEW");
    const { userId } = await params;
    const detail = await AdminService.getUser360(userId);
    return NextResponse.json({ success: true, ...detail });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch user 360 profile." },
      { status: error.statusCode || 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const adminContext = await AdminAuthService.assertAdminAccess(req, "USERS_FREEZE");
    const { userId } = await params;
    const body = await req.json();
    const { moderationState, reason, banReason, durationHours } = body;

    if (!moderationState || !reason) {
      return NextResponse.json(
        { error: "moderationState and reason are required." },
        { status: 400 }
      );
    }

    const updatedUser = await AdminService.setAccountModeration(
      {
        userId,
        moderationState,
        reason,
        banReason,
        durationHours,
      },
      adminContext
    );

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update account moderation state." },
      { status: error.statusCode || 500 }
    );
  }
}
