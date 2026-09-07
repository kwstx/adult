import { NextRequest, NextResponse } from "next/server";
import { AdminAuthService } from "@/modules/admin/admin-auth.service";
import { AdminService } from "@/modules/admin/admin.service";

export async function GET(req: NextRequest) {
  try {
    await AdminAuthService.assertAdminAccess(req, "CHARGEBACKS_VIEW");

    const url = new URL(req.url);
    const status = url.searchParams.get("status") || undefined;
    const limit = Number(url.searchParams.get("limit")) || 50;
    const offset = Number(url.searchParams.get("offset")) || 0;

    const result = await AdminService.listChargebacks({ status, limit, offset });
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to list chargebacks." },
      { status: error.statusCode || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminContext = await AdminAuthService.assertAdminAccess(req, "CHARGEBACKS_RESOLVE");
    const body = await req.json();
    const { paymentTransactionId, chargebackId, gatewayFeeCents, freezeWallet, reason, evidenceNotes } = body;

    if (!paymentTransactionId || !reason) {
      return NextResponse.json(
        { error: "paymentTransactionId and reason are required." },
        { status: 400 }
      );
    }

    const result = await AdminService.handleChargebackDispute(
      {
        paymentTransactionId,
        chargebackId,
        gatewayFeeCents,
        freezeWallet,
        reason,
        evidenceNotes,
      },
      adminContext
    );

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to process chargeback dispute." },
      { status: error.statusCode || 500 }
    );
  }
}
