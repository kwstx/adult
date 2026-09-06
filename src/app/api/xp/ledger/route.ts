import { NextRequest, NextResponse } from "next/server";
import { XpLedgerService } from "@/modules/xp/xp-ledger.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/xp/ledger?fanId=...&creatorId=...&limit=50
 * Fetches the immutable XP ledger audit trail for a creator-fan relationship.
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const fanId = searchParams.get("fanId");
    const creatorId = searchParams.get("creatorId");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    if (!fanId || !creatorId) {
      return NextResponse.json(
        { success: false, error: "Query parameters fanId and creatorId are required" },
        { status: 400 }
      );
    }

    const ledgerHistory = await XpLedgerService.getXpLedgerHistory(fanId, creatorId, limit);

    return NextResponse.json(
      {
        success: true,
        fanId,
        creatorProfileId: creatorId,
        totalEntries: ledgerHistory.length,
        ledger: ledgerHistory,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching XP ledger history:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error fetching XP ledger" },
      { status: 500 }
    );
  }
}
