import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vString, vNumber } from "@/lib/validator";
import { WalletLedgerService } from "@/modules/economic/wallet-ledger.service";

/**
 * POST /api/wallets/transfer
 * Thin endpoint: transfers / tips credits to a creator profile atomically.
 */
export const POST = apiHandler(
  async (req, ctx) => {
    const body = await Validator.validateBody(req, {
      creatorProfileId: vString({ required: true }),
      credits: vNumber({ required: true, integer: true, min: 1 }),
      livestreamId: vString(),
      customMessage: vString({ max: 500 }),
      idempotencyKey: vString(),
    });

    const result = await WalletLedgerService.processLiveTip({
      fanUserId: ctx.user!.id,
      creatorProfileId: body.creatorProfileId!,
      credits: body.credits!,
      livestreamId: body.livestreamId,
      customMessage: body.customMessage,
      idempotencyKey: body.idempotencyKey,
    });

    return successResponse(result);
  },
  { requireAuth: true }
);
