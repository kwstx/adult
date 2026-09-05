import { NextRequest, NextResponse } from "next/server";
import { WalletLedgerService } from "@/modules/economic/wallet-ledger.service";

/**
 * POST /api/economic/wallet/expire
 * Scheduled cron / worker endpoint to sweep expired promotional and bonus lots.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { walletId } = body;

    const result = await WalletLedgerService.expireStaleCredits({
      walletId,
      now: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: `Expired ${result.totalCreditsExpired} credits across ${result.expiredLotsCount} lots.`,
      result,
    });
  } catch (error: any) {
    console.error("Expiration sweep error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to execute expiration sweep." },
      { status: 500 }
    );
  }
}
