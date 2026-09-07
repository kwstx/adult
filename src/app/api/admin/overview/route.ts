import { NextRequest, NextResponse } from "next/server";
import { AdminAuthService } from "@/modules/admin/admin-auth.service";
import { AdminService } from "@/modules/admin/admin.service";

export async function GET(req: NextRequest) {
  try {
    await AdminAuthService.assertAdminAccess(req);
    const stats = await AdminService.getDashboardOverview();
    return NextResponse.json({ success: true, stats });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load admin overview metrics." },
      { status: error.statusCode || 500 }
    );
  }
}
