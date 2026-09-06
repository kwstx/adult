import { NextRequest, NextResponse } from "next/server";
import { CaseService } from "@/modules/trust-safety/case.service";
import { AuditService } from "@/modules/trust-safety/audit.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;
    const moderationCase = await CaseService.getCaseById(caseId);

    if (!moderationCase) {
      return NextResponse.json(
        { success: false, error: `Moderation case ${caseId} not found.` },
        { status: 404 }
      );
    }

    // Fetch related audit trail
    const auditLogs = await AuditService.queryAuditLogs({
      targetEntityType: "ModerationCase",
      targetEntityId: caseId,
      limit: 20,
    });

    return NextResponse.json({
      success: true,
      case: moderationCase,
      auditHistory: auditLogs.events,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve case." },
      { status: 500 }
    );
  }
}
