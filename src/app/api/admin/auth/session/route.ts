import { NextRequest, NextResponse } from "next/server";
import { AdminAuthService } from "@/modules/admin/admin-auth.service";
import { getPermissionsForRole } from "@/modules/admin/admin-rbac";

export async function GET(req: NextRequest) {
  try {
    const adminContext = await AdminAuthService.assertAdminAccess(req);
    const permissions = getPermissionsForRole(adminContext.adminRole);

    return NextResponse.json({
      success: true,
      authenticated: true,
      admin: {
        adminId: adminContext.adminId,
        username: adminContext.username,
        adminRole: adminContext.adminRole,
        permissions,
        stepUpConfirmed: adminContext.stepUpConfirmed,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { authenticated: false, error: error.message || "Unauthorized admin access." },
      { status: error.statusCode || 401 }
    );
  }
}
