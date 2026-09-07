import { NextRequest, NextResponse } from "next/server";
import { AdminAuthService } from "@/modules/admin/admin-auth.service";
import { AdminService } from "@/modules/admin/admin.service";

export async function GET(req: NextRequest) {
  try {
    await AdminAuthService.assertAdminAccess(req, "CREATORS_VIEW");

    const url = new URL(req.url);
    const query = url.searchParams.get("query") || undefined;
    const category = url.searchParams.get("category") || undefined;
    const moderationState = (url.searchParams.get("moderationState") as any) || undefined;
    const isLiveParam = url.searchParams.get("isLive");
    const isLive = isLiveParam !== null ? isLiveParam === "true" : undefined;
    const minFollowers = Number(url.searchParams.get("minFollowers")) || undefined;
    const limit = Number(url.searchParams.get("limit")) || 50;
    const offset = Number(url.searchParams.get("offset")) || 0;

    const result = await AdminService.searchCreators({
      query,
      category,
      moderationState,
      isLive,
      minFollowers,
      limit,
      offset,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to search creators." },
      { status: error.statusCode || 500 }
    );
  }
}
