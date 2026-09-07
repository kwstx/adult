import { NextRequest, NextResponse } from "next/server";
import { AdminAuthService } from "@/modules/admin/admin-auth.service";
import { AdminService } from "@/modules/admin/admin.service";

export async function GET(req: NextRequest) {
  try {
    await AdminAuthService.assertAdminAccess(req, "INCIDENTS_VIEW");
    const result = await AdminService.listLivestreamIncidents();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to list livestream incidents." },
      { status: error.statusCode || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminContext = await AdminAuthService.assertAdminAccess(req, "INCIDENTS_TERMINATE");
    const body = await req.json();
    const { livestreamId, reason, moderationAction } = body;

    if (!livestreamId || !reason) {
      return NextResponse.json(
        { error: "livestreamId and reason are required." },
        { status: 400 }
      );
    }

    const updated = await AdminService.terminateLivestream(
      { livestreamId, reason, moderationAction },
      adminContext
    );

    return NextResponse.json({ success: true, livestream: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to terminate livestream." },
      { status: error.statusCode || 500 }
    );
  }
}
