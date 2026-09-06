import { NextRequest, NextResponse } from "next/server";
import { AuditService } from "@/modules/trust-safety/audit.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetEntityType = searchParams.get("targetEntityType") || undefined;
    const targetEntityId = searchParams.get("targetEntityId") || undefined;
    const actorId = searchParams.get("actorId") || undefined;
    const action = searchParams.get("action") || undefined;
    const verifyChain = searchParams.get("verifyChain") === "true";
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    let verificationResult = null;
    if (verifyChain && targetEntityType && targetEntityId) {
      verificationResult = await AuditService.verifyAuditChain(targetEntityType, targetEntityId);
    }

    const queryResult = await AuditService.queryAuditLogs({
      targetEntityType,
      targetEntityId,
      actorId,
      action,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      verificationResult,
      ...queryResult,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve audit logs." },
      { status: 500 }
    );
  }
}
