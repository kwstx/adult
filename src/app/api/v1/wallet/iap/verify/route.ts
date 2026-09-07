import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vString } from "@/lib/validator";
import { MobileContextService, MobileIapService } from "@/modules/mobile";

/**
 * POST /api/v1/wallet/iap/verify
 * Authoritatively verifies an Apple StoreKit 2 or Google Play In-App Purchase and credits wallet.
 */
export const POST = apiHandler(
  async (req, ctx) => {
    const context = MobileContextService.extractContext(req);
    const userId = ctx.user!.id;

    const body = await Validator.validateBody(req, {
      store: vString({ required: true }),
      packageId: vString({ required: true }),
      productId: vString({ required: true }),
      transactionId: vString({ required: true }),
      receiptOrToken: vString({ required: true }),
      idempotencyKey: vString(),
    });

    const idempotencyKey =
      body.idempotencyKey ||
      context.idempotencyKey ||
      `iap_${body.store}_${body.transactionId}`;

    const result = await MobileIapService.verifyAndFulfillIap({
      userId,
      store: body.store as any,
      packageId: body.packageId!,
      productId: body.productId!,
      transactionId: body.transactionId!,
      receiptOrToken: body.receiptOrToken!,
      idempotencyKey,
    });

    return successResponse(result);
  },
  { requireAuth: true }
);
