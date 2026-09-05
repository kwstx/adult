import { NextRequest, NextResponse } from "next/server";
import { WalletLedgerService } from "@/modules/economic/wallet-ledger.service";

/**
 * POST /api/economic/grant
 * Grants promotional or bonus credits to a user with explicit expiration rules.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, type, amount, reason, durationDays, expiresAt, adminUserId } = body;

    if (!userId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "userId and positive amount are required." },
        { status: 400 }
      );
    }

    if (type === "PROMOTIONAL") {
      const result = await WalletLedgerService.grantPromotionalCredits({
        userId,
        amountCredits: amount,
        reason: reason || "Marketing Campaign Promotion",
        durationDays: durationDays || 30,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        adminUserId,
      });

      return NextResponse.json({
        success: true,
        message: `Granted ${amount} promotional credits to user.`,
        result,
      });
    } else if (type === "BONUS") {
      const result = await WalletLedgerService.grantBonusCredits({
        userId,
        amountCredits: amount,
        reason: reason || "Tier Milestone Bonus",
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        adminUserId,
      });

      return NextResponse.json({
        success: true,
        message: `Granted ${amount} bonus credits to user.`,
        result,
      });
    } else {
      return NextResponse.json(
        { error: `Invalid grant type '${type}'. Must be 'PROMOTIONAL' or 'BONUS'.` },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Grant error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to grant credits." },
      { status: 500 }
    );
  }
}
