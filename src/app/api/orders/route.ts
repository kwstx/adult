import { apiHandler, successResponse, ApiError } from "@/lib/api-handler";
import { OrderService } from "@/modules/orders/order.service";
import { OrderType, PaymentMethodType } from "@/modules/orders/types";

/**
 * POST /api/orders
 *
 * Unified Order Checkout & Execution Endpoint.
 * Coordinates Order Creation -> Wallet Ledger Settlement -> Entitlement Granting.
 */
export const POST = apiHandler(
  async (req, ctx) => {
    const body = await req.json();
    const {
      orderType,
      targetResourceId,
      paymentMethod = "WALLET_CREDITS",
      idempotencyKey,
      sellerId,
      customMessage,
      livestreamId,
      metadata,
    } = body;

    if (!orderType) {
      throw new ApiError(400, "Missing required field: orderType");
    }

    if (!idempotencyKey) {
      throw new ApiError(400, "Missing required field: idempotencyKey");
    }

    const result = await OrderService.createAndProcessOrder({
      buyerId: ctx.user!.id,
      sellerId,
      orderType: orderType as OrderType,
      targetResourceId,
      paymentMethod: paymentMethod as PaymentMethodType,
      idempotencyKey,
      customMessage,
      livestreamId,
      metadata,
    });

    if (!result.success) {
      throw new ApiError(result.statusCode || 400, result.message);
    }

    return successResponse(result, 201);
  },
  { requireAuth: true }
);

/**
 * GET /api/orders
 *
 * List orders for the authenticated user (as buyer or seller).
 */
export const GET = apiHandler(
  async (req, ctx) => {
    const { searchParams } = new URL(req.url);
    const asSeller = searchParams.get("asSeller") === "true";
    const orderType = (searchParams.get("orderType") as OrderType) || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const filter = asSeller
      ? { sellerId: ctx.user!.creatorProfileId || ctx.user!.id, orderType, limit, offset }
      : { buyerId: ctx.user!.id, orderType, limit, offset };

    const result = await OrderService.listOrders(filter);
    return successResponse(result);
  },
  { requireAuth: true }
);
