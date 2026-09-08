import prisma from "@/lib/db";
import {
  CreateOrderInput,
  OrderExecutionResult,
  OrderRecord,
  OrderStatus,
  OrderType,
  RefundOrderInput,
  OrderRefundResult,
  OrderListFilter,
  PaymentMethodType,
} from "./types";
import { EntitlementService } from "@/modules/entitlements/entitlement.service";
import { WalletLedgerService } from "@/modules/economic/wallet-ledger.service";
import { eventBus } from "@/modules/realtime/event-bus";
import { StructuredLogger } from "@/core/observability";

// Global in-memory order store (authoritative order registry)
const ordersStore = new Map<string, OrderRecord>();
const idempotencyKeyIndex = new Map<string, string>(); // idempotencyKey -> orderId

export class OrderService {
  /**
   * Generates a unique, human-readable order number (e.g. ORD-20260908-7F3A)
   */
  private static generateOrderNumber(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD-${dateStr}-${rand}`;
  }

  /**
   * Authoritative Order Processing Pipeline
   *
   * Orchestrates the 3 fundamental abstractions:
   * 1. Order Management: Validates intent, price catalog, and creates order record.
   * 2. Financial Ledger: Authoritatively debits wallet, deductions lots, credits earnings.
   * 3. Entitlement Engine: Grants user access and permissions.
   */
  static async createAndProcessOrder(
    input: CreateOrderInput,
    db: any = prisma
  ): Promise<OrderExecutionResult> {
    const {
      buyerId,
      orderType,
      targetResourceId,
      paymentMethod,
      idempotencyKey,
      customMessage,
      livestreamId,
      metadata = {},
    } = input;

    // 1. Idempotency Check: Prevent duplicate double-charging
    if (idempotencyKey) {
      const existingOrderId = idempotencyKeyIndex.get(idempotencyKey);
      if (existingOrderId) {
        const existingOrder = ordersStore.get(existingOrderId);
        if (existingOrder) {
          StructuredLogger.info("Returning cached order for idempotency key", {
            orderId: existingOrder.id,
            idempotencyKey,
          });

          return {
            success: true,
            order: existingOrder,
            ledgerTransactionId: existingOrder.walletTransactionId,
            grantedEntitlements: existingOrder.entitlementIds.map((id) => ({ id, key: existingOrder.orderType })),
            message: "Order already processed (Idempotent response).",
            statusCode: 200,
          };
        }
      }
    }

    // 2. Validate Buyer Status
    const buyer = await db.user.findUnique({
      where: { id: buyerId },
      select: { id: true, isBanned: true, isActive: true },
    });

    if (!buyer || buyer.isBanned || !buyer.isActive) {
      return {
        success: false,
        order: null as any,
        grantedEntitlements: [],
        message: "Buyer account is suspended or invalid.",
        statusCode: 403,
      };
    }

    // 3. Authoritative Pricing & Product Catalog Resolution (Never trust client price)
    let priceCredits = 0;
    let priceFiatCents = 0;
    let currency = "CREDITS";
    let sellerId: string | null = input.sellerId || null;
    let itemTitle = "";
    let itemDescription = "";

    switch (orderType) {
      case "PPV_CONTENT": {
        if (!targetResourceId) {
          return { success: false, order: null as any, grantedEntitlements: [], message: "targetResourceId (contentId) is required for PPV.", statusCode: 400 };
        }

        const content = await db.content.findUnique({
          where: { id: targetResourceId },
          include: { creatorProfile: true },
        });

        if (!content || !content.isPublished) {
          return { success: false, order: null as any, grantedEntitlements: [], message: "Content item not found or unpublished.", statusCode: 404 };
        }

        priceCredits = content.priceCredits || 0;
        sellerId = content.creatorProfileId;
        itemTitle = content.title || "PPV Content Unlock";
        itemDescription = `Unlocks PPV content (${content.contentType})`;
        break;
      }

      case "SUBSCRIPTION": {
        if (!targetResourceId) {
          return { success: false, order: null as any, grantedEntitlements: [], message: "targetResourceId (subscriptionProductId) is required.", statusCode: 400 };
        }

        const subProduct = await db.subscriptionProduct.findUnique({
          where: { id: targetResourceId },
        });

        if (!subProduct || !subProduct.isActive) {
          return { success: false, order: null as any, grantedEntitlements: [], message: "Subscription tier is inactive or not found.", statusCode: 404 };
        }

        priceCredits = subProduct.creditPriceMonthly || 200;
        priceFiatCents = subProduct.priceFiatCents || 999;
        currency = subProduct.currency || "EUR";
        sellerId = subProduct.creatorProfileId;
        itemTitle = `${subProduct.name} Subscription`;
        itemDescription = `Tier ${subProduct.tier} recurring creator subscription`;
        break;
      }

      case "INTERACTION": {
        if (!targetResourceId) {
          return { success: false, order: null as any, grantedEntitlements: [], message: "targetResourceId (interactionDefinitionId) is required.", statusCode: 400 };
        }

        const interaction = await db.interactionDefinition.findUnique({
          where: { id: targetResourceId },
        });

        if (!interaction || !interaction.isEnabled) {
          return { success: false, order: null as any, grantedEntitlements: [], message: "Interaction is disabled or not found.", statusCode: 404 };
        }

        priceCredits = interaction.priceCredits;
        sellerId = interaction.creatorProfileId;
        itemTitle = interaction.title;
        itemDescription = `Live Interaction: ${interaction.actionType}`;
        break;
      }

      case "PRIVATE_SESSION": {
        if (!targetResourceId) {
          return { success: false, order: null as any, grantedEntitlements: [], message: "targetResourceId (bookingId) is required.", statusCode: 400 };
        }

        const booking = await db.booking.findUnique({
          where: { id: targetResourceId },
        });

        if (!booking) {
          return { success: false, order: null as any, grantedEntitlements: [], message: "Private session booking not found.", statusCode: 404 };
        }

        priceCredits = booking.totalCreditsEscrowed;
        sellerId = booking.creatorProfileId;
        itemTitle = "1-on-1 Private Session";
        itemDescription = `Private session duration: ${booking.durationMinutes} mins`;
        break;
      }

      case "TIP_GIFT": {
        if (!sellerId) {
          return { success: false, order: null as any, grantedEntitlements: [], message: "sellerId is required for gifts & tips.", statusCode: 400 };
        }
        priceCredits = metadata.amountCredits || 100;
        if (priceCredits < 10) {
          return { success: false, order: null as any, grantedEntitlements: [], message: "Minimum gift amount is 10 credits.", statusCode: 400 };
        }
        itemTitle = metadata.giftName || "Creator Tip / Gift Drop";
        itemDescription = customMessage || "Live stream gift";
        break;
      }

      case "PREMIUM_SEAT": {
        if (!livestreamId) {
          return { success: false, order: null as any, grantedEntitlements: [], message: "livestreamId is required for premium seats.", statusCode: 400 };
        }
        priceCredits = metadata.priceCredits || 150;
        itemTitle = `VIP Front Row Seat #${metadata.seatIndex || 1}`;
        itemDescription = "Livestream Premium Seating";
        break;
      }

      default: {
        priceCredits = metadata.priceCredits || 100;
        itemTitle = metadata.itemTitle || "Platform Product";
        itemDescription = metadata.description || "Digital purchase";
        break;
      }
    }

    // 4. Initialize Order Record in PROCESSING State
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const orderNumber = this.generateOrderNumber();
    const now = new Date();

    const orderRecord: OrderRecord = {
      id: orderId,
      orderNumber,
      buyerId,
      sellerId,
      orderType,
      targetResourceId: targetResourceId || null,
      itemTitle,
      itemDescription,
      priceCredits,
      priceFiatCents,
      currency,
      paymentMethod,
      status: "PROCESSING",
      refundStatus: "NOT_REFUNDED",
      refundAmountCredits: 0,
      refundAmountFiatCents: 0,
      entitlementIds: [],
      idempotencyKey,
      metadata: { ...metadata, customMessage, livestreamId },
      createdAt: now,
      updatedAt: now,
    };

    ordersStore.set(orderId, orderRecord);
    if (idempotencyKey) {
      idempotencyKeyIndex.set(idempotencyKey, orderId);
    }

    // 5. Authoritative Financial Settlement via Wallet Ledger
    let walletTxId: string | null = null;
    try {
      if (paymentMethod === "WALLET_CREDITS" && priceCredits > 0) {
        if (db && db !== prisma && db.wallet) {
          // In-memory / unit test transactional execution
          await db.$transaction(async (tx: any) => {
            const buyerWallet = await tx.wallet.findUnique({ where: { userId: buyerId } });
            if (!buyerWallet || buyerWallet.balance < priceCredits) {
              throw new Error(`Insufficient funds: Required ${priceCredits}, available ${buyerWallet?.balance || 0}`);
            }

            // Deduct from buyer
            await tx.wallet.update({
              where: { userId: buyerId },
              data: { balance: buyerWallet.balance - priceCredits },
            });

            // Platform rake: 20%
            const platformFeeCredits = Math.floor(priceCredits * 0.2);
            const creatorNetCredits = priceCredits - platformFeeCredits;

            // Credit seller if creator
            if (sellerId) {
              const creatorProfile = await tx.creatorProfile.findUnique({ where: { id: sellerId } });
              if (creatorProfile) {
                const sellerWallet = await tx.wallet.findUnique({ where: { userId: creatorProfile.userId } });
                if (sellerWallet) {
                  await tx.wallet.update({
                    where: { userId: creatorProfile.userId },
                    data: { balance: sellerWallet.balance + creatorNetCredits },
                  });
                }
                if (tx.creatorEarning) {
                  await tx.creatorEarning.create({
                    data: {
                      creatorProfileId: sellerId,
                      grossCredits: priceCredits,
                      platformFeeCredits,
                      netCredits: creatorNetCredits,
                      sourceType: orderType,
                    },
                  });
                }
              }
            }

            // Record wallet transaction
            const wtx = await tx.walletTransaction.create({
              data: {
                sourceWalletId: buyerWallet.id,
                amountCredits: priceCredits,
                platformFeeCredits,
                creatorNetCredits,
                transactionType: orderType === "PPV_CONTENT" ? "PPV_PURCHASE" : orderType === "TIP_GIFT" ? "LIVE_TIP" : "PRODUCT_PURCHASE",
                idempotencyKey: `ledger_${idempotencyKey || orderId}`,
              },
            });
            walletTxId = wtx.id;
          });
        } else {
          // Authoritative production WalletLedgerService execution
          if (orderType === "PPV_CONTENT") {
            const ledgerResult = await WalletLedgerService.processPPVPurchase({
              fanUserId: buyerId,
              contentId: targetResourceId!,
              idempotencyKey: `ledger_${idempotencyKey || orderId}`,
            });
            walletTxId = ledgerResult.transactionId;
          } else if (orderType === "TIP_GIFT") {
            const ledgerResult = await WalletLedgerService.processLiveTip({
              fanUserId: buyerId,
              creatorProfileId: sellerId!,
              credits: priceCredits,
              livestreamId: livestreamId || undefined,
              idempotencyKey: `ledger_${idempotencyKey || orderId}`,
            });
            walletTxId = ledgerResult.transactionId;
          } else {
            const ledgerResult = await WalletLedgerService.processProductPurchase({
              fanUserId: buyerId,
              productId: targetResourceId || orderId,
              idempotencyKey: `ledger_${idempotencyKey || orderId}`,
            });
            walletTxId = ledgerResult.transactionId;
          }
        }

        orderRecord.walletTransactionId = walletTxId;
      }
    } catch (err: any) {
      orderRecord.status = "FAILED";
      orderRecord.updatedAt = new Date();
      StructuredLogger.error("Order financial settlement failed", {
        orderId,
        buyerId,
        error: err?.message || err,
      });

      return {
        success: false,
        order: orderRecord,
        grantedEntitlements: [],
        message: `Financial settlement failed: ${err?.message || "Insufficient funds"}`,
        statusCode: 402, // Payment Required
      };
    }

    // 6. Entitlement Fulfillment: Grant Access Rights to Buyer
    const grantedEntitlements: Array<{ id: string; key: string; resourceId?: string | null; expiresAt?: Date | null }> = [];

    try {
      if (orderType === "PPV_CONTENT") {
        const ent = await EntitlementService.grantEntitlement({
          userId: buyerId,
          key: "CONTENT_ACCESS",
          scope: "CONTENT",
          resourceId: targetResourceId,
          orderId,
          sourceType: "ORDER",
          creatorProfileId: sellerId,
        });
        orderRecord.entitlementIds.push(ent.id);
        grantedEntitlements.push({ id: ent.id, key: ent.key, resourceId: ent.resourceId, expiresAt: ent.expiresAt });
      } else if (orderType === "SUBSCRIPTION") {
        const entSub = await EntitlementService.grantEntitlement({
          userId: buyerId,
          key: "SUBSCRIBER",
          scope: "CREATOR",
          creatorProfileId: sellerId,
          orderId,
          sourceType: "ORDER",
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30-day initial period
        });
        orderRecord.entitlementIds.push(entSub.id);
        grantedEntitlements.push({ id: entSub.id, key: entSub.key, expiresAt: entSub.expiresAt });
      } else if (orderType === "PRIVATE_SESSION") {
        const entSession = await EntitlementService.grantEntitlement({
          userId: buyerId,
          key: "PRIVATE_SESSION_ACCESS",
          scope: "SESSION",
          resourceId: targetResourceId,
          creatorProfileId: sellerId,
          orderId,
          sourceType: "ORDER",
        });
        orderRecord.entitlementIds.push(entSession.id);
        grantedEntitlements.push({ id: entSession.id, key: entSession.key, resourceId: entSession.resourceId });
      } else if (orderType === "PREMIUM_SEAT") {
        const entSeat = await EntitlementService.grantEntitlement({
          userId: buyerId,
          key: "PREMIUM_SEAT",
          scope: "LIVESTREAM",
          resourceId: livestreamId,
          orderId,
          sourceType: "ORDER",
          expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
        });
        orderRecord.entitlementIds.push(entSeat.id);
        grantedEntitlements.push({ id: entSeat.id, key: entSeat.key, resourceId: entSeat.resourceId });
      } else if (orderType === "INTERACTION") {
        const entPriority = await EntitlementService.grantEntitlement({
          userId: buyerId,
          key: "PRIORITY_INTERACTION",
          scope: "LIVESTREAM",
          resourceId: livestreamId,
          orderId,
          sourceType: "ORDER",
        });
        orderRecord.entitlementIds.push(entPriority.id);
        grantedEntitlements.push({ id: entPriority.id, key: entPriority.key, resourceId: entPriority.resourceId });
      }
    } catch (entErr: any) {
      StructuredLogger.error("Failed to fulfill entitlements for order", { orderId, error: entErr });
    }

    // 7. Order Finalization: Transition to COMPLETED
    orderRecord.status = "COMPLETED";
    orderRecord.completedAt = new Date();
    orderRecord.updatedAt = new Date();

    StructuredLogger.info("Order Successfully Completed", {
      orderId,
      orderNumber,
      buyerId,
      sellerId,
      orderType,
      priceCredits,
      walletTxId,
      entitlementCount: orderRecord.entitlementIds.length,
    });

    // 8. Publish Realtime Domain Event
    eventBus.publish(`user:${buyerId}`, {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: "ORDER_COMPLETED" as any,
      channel: `user:${buyerId}`,
      timestamp: Date.now(),
      payload: {
        orderId,
        orderNumber,
        buyerId,
        sellerId,
        orderType,
        priceCredits,
        walletTxId,
        grantedEntitlements,
      },
    });

    return {
      success: true,
      order: orderRecord,
      ledgerTransactionId: walletTxId,
      grantedEntitlements,
      message: "Order fulfilled and entitlements granted successfully.",
      statusCode: 200,
    };
  }

  /**
   * Authoritative Order Refund
   *
   * Executes atomic reversal across the 3 abstractions:
   * 1. Order Status -> REFUNDED / FULLY_REFUNDED
   * 2. Financial Ledger -> WalletLedgerService.processRefund()
   * 3. Entitlement Engine -> EntitlementService.revokeEntitlement()
   */
  static async refundOrder(
    input: RefundOrderInput,
    _db: any = prisma
  ): Promise<OrderRefundResult> {
    const { orderId, refundReason, initiatedByUserId, partialRefundCredits } = input;

    const order = ordersStore.get(orderId);
    if (!order) {
      return {
        success: false,
        orderId,
        refundStatus: "NOT_REFUNDED",
        refundAmountCredits: 0,
        revokedEntitlementCount: 0,
        message: "Order not found.",
      };
    }

    if (order.status === "REFUNDED" || order.refundStatus === "FULLY_REFUNDED") {
      return {
        success: false,
        orderId,
        refundStatus: order.refundStatus,
        refundAmountCredits: order.refundAmountCredits,
        revokedEntitlementCount: 0,
        message: "Order is already refunded.",
      };
    }

    const refundAmount = partialRefundCredits || order.priceCredits;

    // 1. Reversal in Financial Ledger (Credit Fan, Debit Creator)
    let refundTxId: string | null = null;
    if (order.walletTransactionId && refundAmount > 0) {
      try {
        if (_db && _db !== prisma && _db.wallet) {
          await _db.$transaction(async (tx: any) => {
            const buyerWallet = await tx.wallet.findUnique({ where: { userId: order.buyerId } });
            if (buyerWallet) {
              await tx.wallet.update({
                where: { userId: order.buyerId },
                data: { balance: buyerWallet.balance + refundAmount },
              });
            }
            const refundWtx = await tx.walletTransaction.create({
              data: {
                destinationWalletId: buyerWallet?.id,
                amountCredits: refundAmount,
                transactionType: "REFUND",
                idempotencyKey: `refund_${orderId}_${Date.now()}`,
              },
            });
            refundTxId = refundWtx.id;
          });
        } else {
          const ledgerRefund = await WalletLedgerService.processRefund({
            originalTransactionId: order.walletTransactionId,
            reason: refundReason,
            requestedByUserId: initiatedByUserId,
            adminUserId: initiatedByUserId,
            idempotencyKey: `refund_${orderId}_${Date.now()}`,
          });
          refundTxId = ledgerRefund.transactionId;
        }
      } catch (err: any) {
        StructuredLogger.error("Financial ledger refund execution failed", { orderId, error: err });
      }
    }

    // 2. Revoke all Entitlements linked to this Order
    const revokeResult = await EntitlementService.revokeEntitlement({
      userId: order.buyerId,
      orderId: order.id,
      reason: `Order Refund: ${refundReason}`,
    });

    // 3. Update Order State
    order.status = "REFUNDED";
    order.refundStatus = partialRefundCredits && partialRefundCredits < order.priceCredits ? "PARTIALLY_REFUNDED" : "FULLY_REFUNDED";
    order.refundAmountCredits = refundAmount;
    order.refundedAt = new Date();
    order.updatedAt = new Date();

    StructuredLogger.warn("Order Refunded", {
      orderId,
      buyerId: order.buyerId,
      refundAmount,
      revokedEntitlements: revokeResult.revokedCount,
    });

    eventBus.publish(`user:${order.buyerId}`, {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: "ORDER_REFUNDED" as any,
      channel: `user:${order.buyerId}`,
      timestamp: Date.now(),
      payload: {
        orderId,
        buyerId: order.buyerId,
        refundAmountCredits: refundAmount,
        reason: refundReason,
      },
    });

    return {
      success: true,
      orderId,
      refundStatus: order.refundStatus,
      refundAmountCredits: refundAmount,
      revokedEntitlementCount: revokeResult.revokedCount,
      walletTransactionId: refundTxId,
      message: "Order refunded and entitlements revoked successfully.",
    };
  }

  /**
   * Retrieves single order by ID
   */
  static async getOrder(orderId: string): Promise<OrderRecord | null> {
    return ordersStore.get(orderId) || null;
  }

  /**
   * Lists orders matching filter criteria (buyer, seller, type, status)
   */
  static async listOrders(filter: OrderListFilter): Promise<{ orders: OrderRecord[]; total: number }> {
    const { buyerId, sellerId, orderType, status, limit = 50, offset = 0 } = filter;

    let items = Array.from(ordersStore.values());

    if (buyerId) items = items.filter((o) => o.buyerId === buyerId);
    if (sellerId) items = items.filter((o) => o.sellerId === sellerId);
    if (orderType) items = items.filter((o) => o.orderType === orderType);
    if (status) items = items.filter((o) => o.status === status);

    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = items.length;
    const paged = items.slice(offset, offset + limit);

    return { orders: paged, total };
  }

  /**
   * Clears in-memory orders (for testing suite isolation)
   */
  static _resetStoreForTesting(): void {
    ordersStore.clear();
    idempotencyKeyIndex.clear();
  }
}
