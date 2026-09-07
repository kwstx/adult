import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vString } from "@/lib/validator";
import { WalletLedgerService } from "@/modules/economic/wallet-ledger.service";

/**
 * GET /api/wallets/statement?startDate=...&endDate=...
 * Thin endpoint: generates an authoritative chronological statement.
 */
export const GET = apiHandler(
  async (req, ctx) => {
    const query = Validator.validateQuery(req, {
      startDate: vString(),
      endDate: vString(),
    });

    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    const statement = await WalletLedgerService.getWalletStatement(ctx.user!.id, {
      from: startDate,
      to: endDate,
    });
    return successResponse(statement);
  },
  { requireAuth: true }
);
