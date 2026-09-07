import { NextRequest, NextResponse } from "next/server";
import { AdminAuthService } from "@/modules/admin/admin-auth.service";
import { AdminService } from "@/modules/admin/admin.service";

export async function GET(req: NextRequest) {
  try {
    await AdminAuthService.assertAdminAccess(req, "CREATORS_VERIFY");

    const url = new URL(req.url);
    const status = url.searchParams.get("status") || undefined;
    const limit = Number(url.searchParams.get("limit")) || 50;
    const offset = Number(url.searchParams.get("offset")) || 0;

    const result = await AdminService.listPendingVerifications({ status, limit, offset });
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to list creator verifications." },
      { status: error.statusCode || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminContext = await AdminAuthService.assertAdminAccess(req, "CREATORS_VERIFY");
    const body = await req.json();
    const { verificationId, decision, rejectionReason, complianceNotes } = body;

    if (!verificationId || !decision) {
      return NextResponse.json(
        { error: "verificationId and decision (APPROVED, REJECTED) are required." },
        { status: 400 }
      );
    }

    const updated = await AdminService.reviewVerification(
      { verificationId, decision, rejectionReason, complianceNotes },
      adminContext
    );

    return NextResponse.json({ success: true, verification: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to review verification." },
      { status: error.statusCode || 500 }
    );
  }
}
