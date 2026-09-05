import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { LedgerService } from "@/modules/economic/ledger.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const wallet = await LedgerService.getOrCreateWallet(userId);

    // Fetch transactions
    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: {
        OR: [{ sourceWalletId: wallet.id }, { destinationWalletId: wallet.id }],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      wallet,
      ledgerEntries,
    });
  } catch (error: any) {
    console.error("Wallet error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve wallet." },
      { status: 500 }
    );
  }
}
