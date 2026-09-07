import { NextRequest, NextResponse } from "next/server";
import { AdminAuthService } from "@/modules/admin/admin-auth.service";
import { AdminService } from "@/modules/admin/admin.service";

export async function POST(req: NextRequest) {
  try {
    const adminContext = await AdminAuthService.assertAdminAccess(req, "FINANCIAL_ADJUST");
    const body = await req.json();
    const { userId, direction, creditType, amountCredits, reason, idempotencyKey, notes } = body;

    if (!userId || !direction || !creditType || !amountCredits || !reason || !idempotencyKey) {
      return NextResponse.json(
        { error: "userId, direction (CREDIT/DEBIT), creditType, amountCredits, reason, and idempotencyKey are required." },
        { status: 400 }
      );
    }

    const result = await AdminService.issueAdminAdjustment(
      {
        userId,
        direction,
        creditType,
        amountCredits,
        reason,
        idempotencyKey,
        notes,
      },
      adminContext
    );

    return NextResponse.json({ success: true, adjustment: result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to process administrative balance adjustment." },
      { status: error.statusCode || 500 }
    );
  }
}
