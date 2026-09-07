import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vString, vEnum } from "@/lib/validator";
import { PaymentAdapter } from "@/modules/economic/payment.adapter";

/**
 * POST /api/payments/checkout
 * Thin endpoint: authenticates -> validates package -> initializes payment checkout with provider.
 */
export const POST = apiHandler(
  async (req, ctx) => {
    const body = await Validator.validateBody(req, {
      packageId: vString({ required: true }),
      gateway: vEnum(["CCBILL", "SEGPAY", "STRIPE", "EPOCH", "NOWPAYMENTS"] as const, {
        defaultValue: "CCBILL",
      }),
      returnUrl: vString(),
    });

    const checkout = await PaymentAdapter.createCheckoutSession({
      userId: ctx.user!.id,
      packageId: body.packageId!,
      gateway: body.gateway,
      returnUrl: body.returnUrl,
      ipAddress: ctx.ipAddress,
    });

    return successResponse(checkout, 201);
  },
  { requireAuth: true }
);
