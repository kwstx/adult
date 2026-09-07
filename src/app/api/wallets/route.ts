import { apiHandler, successResponse } from "@/lib/api-handler";
import { WalletLedgerService } from "@/modules/economic/wallet-ledger.service";

/**
 * GET /api/wallets
 * Thin endpoint: retrieves authenticated user's wallet with typed balances and lifetime stats.
 */
export const GET = apiHandler(
  async (req, ctx) => {
    const wallet = await WalletLedgerService.getOrCreateWallet(ctx.user!.id);
    const typedBalance = await WalletLedgerService.getTypedBalance(wallet.id);
    const reconciliation = await WalletLedgerService.reconcileWallet(wallet.id);

    return successResponse({
      wallet: {
        id: wallet.id,
        userId: wallet.userId,
        balance: wallet.balance,
        purchasedBalance: wallet.purchasedBalance,
        promotionalBalance: wallet.promotionalBalance,
        bonusBalance: wallet.bonusBalance,
        lockedBalance: wallet.lockedBalance,
        pendingBalance: wallet.pendingBalance,
        status: wallet.status,
        lifetimeDepositedCredits: wallet.lifetimeDepositedCredits.toString(),
        lifetimeEarnedCredits: wallet.lifetimeEarnedCredits.toString(),
        lifetimeSpentCredits: wallet.lifetimeSpentCredits.toString(),
        lifetimeWithdrawnCredits: wallet.lifetimeWithdrawnCredits.toString(),
      },
      typedBalance,
      reconciliation,
    });
  },
  { requireAuth: true }
);
