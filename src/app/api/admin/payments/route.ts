import { NextRequest, NextResponse } from "next/server";
import { AdminAuthService } from "@/modules/admin/admin-auth.service";
import { AdminService } from "@/modules/admin/admin.service";

export async function GET(req: NextRequest) {
  try {
    await AdminAuthService.assertAdminAccess(req, "PAYMENTS_VIEW");

    const url = new URL(req.url);
    const paymentId = url.searchParams.get("paymentId");

    // If specific paymentId requested, return deep details
    if (paymentId) {
      const detail = await AdminService.getPaymentDetail(paymentId);
      return NextResponse.json({ success: true, ...detail });
    }

    const userId = url.searchParams.get("userId") || undefined;
    const gateway = url.searchParams.get("gateway") || undefined;
    const status = url.searchParams.get("status") || undefined;
    const query = url.searchParams.get("query") || undefined;
    const minRiskScore = Number(url.searchParams.get("minRiskScore")) || undefined;
    const limit = Number(url.searchParams.get("limit")) || 50;
    const offset = Number(url.searchParams.get("offset")) || 0;

    const result = await AdminService.investigatePayments({
      userId,
      gateway,
      status,
      query,
      minRiskScore,
      limit,
      offset,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to search payment transactions." },
      { status: error.statusCode || 500 }
    );
  }
}
