import { NextRequest, NextResponse } from "next/server";
import { AdminAuthService } from "@/modules/admin/admin-auth.service";
import { AdminService } from "@/modules/admin/admin.service";

export async function GET(req: NextRequest) {
  try {
    await AdminAuthService.assertAdminAccess(req, "CONTENT_VIEW");

    const url = new URL(req.url);
    const moderationState = url.searchParams.get("moderationState") || undefined;
    const contentType = url.searchParams.get("contentType") || undefined;
    const limit = Number(url.searchParams.get("limit")) || 50;
    const offset = Number(url.searchParams.get("offset")) || 0;

    const result = await AdminService.listPendingContent({
      moderationState,
      contentType,
      limit,
      offset,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to list content items." },
      { status: error.statusCode || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminContext = await AdminAuthService.assertAdminAccess(req, "CONTENT_MODERATE");
    const body = await req.json();
    const { contentId, decision, reason } = body;

    if (!contentId || !decision || !reason) {
      return NextResponse.json(
        { error: "contentId, decision (APPROVED, RESTRICTED, REMOVED, REJECTED), and reason are required." },
        { status: 400 }
      );
    }

    const updated = await AdminService.reviewContent(
      { contentId, decision, reason },
      adminContext
    );

    return NextResponse.json({ success: true, content: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to review content." },
      { status: error.statusCode || 500 }
    );
  }
}
