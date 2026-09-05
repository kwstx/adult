import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { WalletLedgerService } from "@/modules/economic/wallet-ledger.service";

/**
 * GET /api/economic/wallet?userId=<userId>
 * Retrieves user wallet, recent immutable ledger transactions, and balance reconciliation status.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const wallet = await WalletLedgerService.getOrCreateWallet(userId);

    // Fetch recent ledger transactions
    const ledgerEntries = await prisma.walletTransaction.findMany({
      where: {
        OR: [{ sourceWalletId: wallet.id }, { destinationWalletId: wallet.id }],
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    // Reconcile consistency
    const reconciliation = await WalletLedgerService.reconcileWallet(wallet.id);

    return NextResponse.json({
      wallet: {
        ...wallet,
        lifetimeDepositedCredits: wallet.lifetimeDepositedCredits.toString(),
        lifetimeEarnedCredits: wallet.lifetimeEarnedCredits.toString(),
        lifetimeSpentCredits: wallet.lifetimeSpentCredits.toString(),
        lifetimeWithdrawnCredits: wallet.lifetimeWithdrawnCredits.toString(),
      },
      ledgerEntries,
      reconciliation,
    });
  } catch (error: any) {
    console.error("Wallet error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve wallet." },
      { status: 500 }
    );
  }
}
