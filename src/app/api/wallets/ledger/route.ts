import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vNumber } from "@/lib/validator";
import { WalletLedgerService } from "@/modules/economic/wallet-ledger.service";
import prisma from "@/lib/db";

/**
 * GET /api/wallets/ledger?limit=30&page=1
 * Thin endpoint: retrieves user's immutable ledger transactions with granular lot deduction breakdowns.
 */
export const GET = apiHandler(
  async (req, ctx) => {
    const query = Validator.validateQuery(req, {
      page: vNumber({ integer: true, min: 1, defaultValue: 1 }),
      limit: vNumber({ integer: true, min: 1, max: 100, defaultValue: 30 }),
    });

    const page = query.page ?? 1;
    const limit = query.limit ?? 30;
    const wallet = await WalletLedgerService.getOrCreateWallet(ctx.user!.id);
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where: {
          OR: [{ sourceWalletId: wallet.id }, { destinationWalletId: wallet.id }],
        },
        include: {
          creditLotDeductions: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.walletTransaction.count({
        where: {
          OR: [{ sourceWalletId: wallet.id }, { destinationWalletId: wallet.id }],
        },
      }),
    ]);

    return successResponse({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  },
  { requireAuth: true }
);
