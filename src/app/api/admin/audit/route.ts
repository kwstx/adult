import { NextRequest, NextResponse } from "next/server";
import { AdminAuthService } from "@/modules/admin/admin-auth.service";
import { AdminService } from "@/modules/admin/admin.service";

export async function GET(req: NextRequest) {
  try {
    await AdminAuthService.assertAdminAccess(req, "AUDIT_VIEW");

    const url = new URL(req.url);
    const targetEntityType = url.searchParams.get("targetEntityType") || undefined;
    const targetEntityId = url.searchParams.get("targetEntityId") || undefined;
    const actorId = url.searchParams.get("actorId") || undefined;
    const action = url.searchParams.get("action") || undefined;
    const verifyIntegrity = url.searchParams.get("verifyIntegrity") === "true";
    const limit = Number(url.searchParams.get("limit")) || 50;
    const offset = Number(url.searchParams.get("offset")) || 0;

    let verificationResult = null;
    if (verifyIntegrity && targetEntityType && targetEntityId) {
      verificationResult = await AdminService.verifyAuditIntegrity(targetEntityType, targetEntityId);
    }

    const result = await AdminService.queryAuditLogs({
      targetEntityType,
      targetEntityId,
      actorId,
      action,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      ...result,
      verificationResult,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to query audit events." },
      { status: error.statusCode || 500 }
    );
  }
}
