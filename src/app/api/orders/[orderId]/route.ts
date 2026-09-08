import { apiHandler, successResponse, ApiError } from "@/lib/api-handler";
import { OrderService } from "@/modules/orders/order.service";

/**
 * GET /api/orders/[orderId]
 *
 * Retrieves authoritative order details, receipts, and fulfillment status.
 */
export const GET = apiHandler<{ orderId: string }>(
  async (req, ctx) => {
    const order = await OrderService.getOrder(ctx.params.orderId);

    if (!order) {
      throw new ApiError(404, "Order not found");
    }

    // Authorization: User must be buyer, seller, or ADMIN
    const isBuyer = order.buyerId === ctx.user!.id;
    const isSeller = order.sellerId === ctx.user!.creatorProfileId || order.sellerId === ctx.user!.id;
    const isAdmin = ctx.user!.role === "ADMIN";

    if (!isBuyer && !isSeller && !isAdmin) {
      throw new ApiError(403, "You are not authorized to view this order.");
    }

    return successResponse(order);
  },
  { requireAuth: true }
);
