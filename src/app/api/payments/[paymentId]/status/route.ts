import { apiHandler, successResponse } from "@/lib/api-handler";
import prisma from "@/lib/db";
import { ApiError } from "@/lib/api-handler";

/**
 * GET /api/payments/[paymentId]/status
 * Thin endpoint: retrieves authoritative payment status for transaction.
 */
export const GET = apiHandler<{ paymentId: string }>(async (req, ctx) => {
  const paymentId = ctx.params?.paymentId;
  if (!paymentId) {
    throw new ApiError(400, "Payment ID parameter is required.", "MISSING_PAYMENT_ID");
  }

  const payment = await prisma.paymentTransaction.findFirst({
    where: {
      OR: [{ id: paymentId }, { idempotencyKey: paymentId }, { gatewayTransactionId: paymentId }],
    },
    include: {
      wallet: true,
    },
  });

  if (!payment) {
    throw new ApiError(404, "Payment transaction record not found.", "PAYMENT_NOT_FOUND");
  }

  return successResponse({
    id: payment.id,
    status: payment.status,
    amountFiatCents: payment.amountFiatCents,
    currency: payment.currency,
    creditsPurchased: payment.creditsPurchased,
    bonusCredits: payment.bonusCredits,
    paymentGateway: payment.paymentGateway,
    gatewayTransactionId: payment.gatewayTransactionId,
    createdAt: payment.createdAt,
    walletId: payment.walletId,
  });
});
