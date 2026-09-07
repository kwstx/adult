import { NextRequest, NextResponse } from "next/server";
import { AdminAuthService } from "@/modules/admin/admin-auth.service";
import { AdminService } from "@/modules/admin/admin.service";

export async function GET(req: NextRequest) {
  try {
    await AdminAuthService.assertAdminAccess(req, "PAYOUTS_VIEW");

    const url = new URL(req.url);
    const status = url.searchParams.get("status") || undefined;
    const limit = Number(url.searchParams.get("limit")) || 50;
    const offset = Number(url.searchParams.get("offset")) || 0;

    const result = await AdminService.listPayoutRequests({ status, limit, offset });
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to list payout requests." },
      { status: error.statusCode || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminContext = await AdminAuthService.assertAdminAccess(req, "PAYOUTS_REVIEW");
    const body = await req.json();
    const { payoutId, decision, rejectionReason, gatewayReferenceId } = body;

    if (!payoutId || !decision) {
      return NextResponse.json(
        { error: "payoutId and decision (APPROVE/REJECT) are required." },
        { status: 400 }
      );
    }

    const updated = await AdminService.reviewPayout(
      {
        payoutId,
        decision,
        rejectionReason,
        gatewayReferenceId,
      },
      adminContext
    );

    return NextResponse.json({ success: true, payout: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to review payout." },
      { status: error.statusCode || 500 }
    );
  }
}
