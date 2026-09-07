import { apiHandler, successResponse } from "@/lib/api-handler";
import { WalletLedgerService } from "@/modules/economic/wallet-ledger.service";

/**
 * GET /api/v1/wallet/balance
 * Returns detailed multi-tier balance breakdown (purchased, promo, bonus, total).
 */
export const GET = apiHandler(
  async (req, ctx) => {
    const userId = ctx.user!.id;
    const wallet = await WalletLedgerService.getOrCreateWallet(userId);

    return successResponse({
      balance: wallet.balance,
      purchased: wallet.purchasedBalance,
      promotional: wallet.promotionalBalance,
      bonus: wallet.bonusBalance,
      locked: wallet.lockedBalance,
      status: wallet.status,
      currency: "CREDITS",
    });
  },
  { requireAuth: true }
);
