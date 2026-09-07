import { NextRequest, NextResponse } from "next/server";
import { AdminAuthService } from "@/modules/admin/admin-auth.service";
import { AdminService } from "@/modules/admin/admin.service";
import { WalletLedgerService } from "@/modules/economic/wallet-ledger.service";

export async function GET(req: NextRequest) {
  try {
    await AdminAuthService.assertAdminAccess(req, "WALLETS_VIEW");

    const url = new URL(req.url);
    const userIdOrWalletId = url.searchParams.get("targetId");
    const transactionId = url.searchParams.get("transactionId");

    // If transaction explanation requested
    if (transactionId) {
      const explanation = await WalletLedgerService.explainTransaction(transactionId);
      return NextResponse.json({ success: true, explanation });
    }

    // If target wallet/user ID provided
    if (userIdOrWalletId) {
      const detail = await AdminService.investigateWallet(userIdOrWalletId);
      return NextResponse.json({ success: true, ...detail });
    }

    return NextResponse.json(
      { error: "Provide targetId (userId or walletId) or transactionId query parameter." },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to investigate wallet." },
      { status: error.statusCode || 500 }
    );
  }
}
