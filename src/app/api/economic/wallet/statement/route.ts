import { NextRequest, NextResponse } from "next/server";
import { WalletLedgerService } from "@/modules/economic/wallet-ledger.service";

/**
 * GET /api/economic/wallet/statement?userId=<userId>&from=<isoDate>&to=<isoDate>
 * Generates an authoritative, chronologically ordered financial statement with running balance before and after.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");
    const limitStr = searchParams.get("limit");

    if (!userId) {
      return NextResponse.json({ error: "userId parameter is required." }, { status: 400 });
    }

    const options: { from?: Date; to?: Date; limit?: number } = {};
    if (fromStr) options.from = new Date(fromStr);
    if (toStr) options.to = new Date(toStr);
    if (limitStr) options.limit = parseInt(limitStr, 10);

    const statement = await WalletLedgerService.getWalletStatement(userId, options);

    return NextResponse.json({
      success: true,
      statement,
    });
  } catch (error: any) {
    console.error("Statement generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate wallet statement." },
      { status: 500 }
    );
  }
}
