import { apiHandler, successResponse, ApiError } from "@/lib/api-handler";
import { OrderService } from "@/modules/orders/order.service";

/**
 * POST /api/orders/[orderId]/refund
 *
 * Processes an authoritative order refund:
 * 1. Financial ledger credit refund (WalletLedgerService)
 * 2. Entitlement revocation (EntitlementService)
 * 3. Order status -> REFUNDED
 */
export const POST = apiHandler<{ orderId: string }>(
  async (req, ctx) => {
    const order = await OrderService.getOrder(ctx.params.orderId);

    if (!order) {
      throw new ApiError(404, "Order not found");
    }

    // Only Admin or Seller can initiate refunds
    const isSeller = order.sellerId === ctx.user!.creatorProfileId || order.sellerId === ctx.user!.id;
    const isAdmin = ctx.user!.role === "ADMIN";

    if (!isAdmin && !isSeller) {
      throw new ApiError(403, "Only platform administrators or the seller can issue refunds.");
    }

    const body = await req.json().catch(() => ({}));
    const { reason = "Customer refund request", partialRefundCredits } = body;

    const refundResult = await OrderService.refundOrder({
      orderId: ctx.params.orderId,
      refundReason: reason,
      initiatedByUserId: ctx.user!.id,
      isAdminOverride: isAdmin,
      partialRefundCredits,
    });

    if (!refundResult.success) {
      throw new ApiError(400, refundResult.message);
    }

    return successResponse(refundResult);
  },
  { requireAuth: true }
);
