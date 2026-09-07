import { NextRequest, NextResponse } from "next/server";
import { AdminAuthService } from "@/modules/admin/admin-auth.service";
import { AdminService } from "@/modules/admin/admin.service";

export async function POST(req: NextRequest) {
  try {
    const adminContext = await AdminAuthService.assertAdminAccess(req, "FINANCIAL_REFUND");
    const body = await req.json();
    const { transactionId, purchaseId, reason, idempotencyKey, customCreditsToRefund } = body;

    if (!reason || !idempotencyKey) {
      return NextResponse.json(
        { error: "reason and idempotencyKey are mandatory for financial refund operations." },
        { status: 400 }
      );
    }

    const result = await AdminService.issueControlledRefund(
      {
        transactionId,
        purchaseId,
        reason,
        idempotencyKey,
        customCreditsToRefund,
      },
      adminContext
    );

    return NextResponse.json({ success: true, refund: result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to issue administrative refund." },
      { status: error.statusCode || 500 }
    );
  }
}
