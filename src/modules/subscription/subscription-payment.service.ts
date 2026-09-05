import prisma from "@/lib/db";
import {
  SubscriptionPaymentRecord,
  SubscriptionPaymentStatus,
  PaymentGateway,
} from "./types";
import { WalletLedgerService } from "@/modules/economic/wallet-ledger.service";

const PLATFORM_FEE_PERCENTAGE = Number(process.env.PLATFORM_FEE_PERCENTAGE || 20);

export class SubscriptionPaymentService {
  /**
   * Calculates the platform fee split and net creator earnings.
   */
  static calculateSplit(amountCents: number, customRakePercent?: number) {
    const rakePercent = customRakePercent ?? PLATFORM_FEE_PERCENTAGE;
    const platformFeeCents = Math.round((amountCents * rakePercent) / 100);
    const creatorNetCents = amountCents - platformFeeCents;

    return {
      grossAmountCents: amountCents,
      platformFeeCents,
      creatorNetCents,
      rakePercentage: rakePercent,
    };
  }

  /**
   * Records an initial or renewal payment for a customer subscription.
   */
  static async recordPayment(params: {
    subscriptionId: string;
    fanId: string;
    creatorProfileId: string;
    productId?: string | null;
    billingCycleIndex: number;
    periodStart: Date;
    periodEnd: Date;
    amountCents: number;
    currency?: string;
    creditsDeducted?: number;
    paymentGateway?: PaymentGateway;
    paymentMethod?: string;
    gatewayTransactionId?: string;
    gatewayInvoiceId?: string;
    idempotencyKey?: string;
    status?: SubscriptionPaymentStatus;
    failureReason?: string;
    rawPayload?: Record<string, any>;
    tx?: any;
  }): Promise<SubscriptionPaymentRecord> {
    const db = params.tx || prisma;
    const currency = (params.currency || "EUR").toUpperCase();
    const gateway = params.paymentGateway || PaymentGateway.STRIPE;
    const idempotencyKey =
      params.idempotencyKey ||
      `sub_pay_${params.subscriptionId}_${params.billingCycleIndex}_${Date.now()}`;

    // Check if payment with this idempotency key already exists
    const existing = await db.subscriptionPayment.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      return existing as unknown as SubscriptionPaymentRecord;
    }

    const { platformFeeCents, creatorNetCents } = this.calculateSplit(params.amountCents);
    const status = params.status || SubscriptionPaymentStatus.SUCCEEDED;
    const paidAt = status === SubscriptionPaymentStatus.SUCCEEDED ? new Date() : null;

    // 1. Create the immutable SubscriptionPayment record
    const payment = await db.subscriptionPayment.create({
      data: {
        subscriptionId: params.subscriptionId,
        fanId: params.fanId,
        creatorProfileId: params.creatorProfileId,
        productId: params.productId,
        billingCycleIndex: params.billingCycleIndex,
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
        amountCents: params.amountCents,
        currency,
        creditsDeducted: params.creditsDeducted ?? null,
        platformFeeCents,
        creatorNetCents,
        paymentGateway: gateway,
        gatewayTransactionId: params.gatewayTransactionId ?? null,
        gatewayInvoiceId: params.gatewayInvoiceId ?? null,
        idempotencyKey,
        paymentMethod: params.paymentMethod ?? "card_recurring",
        status,
        failureReason: params.failureReason ?? null,
        paidAt,
        rawGatewayPayload: params.rawPayload ? JSON.stringify(params.rawPayload) : null,
      },
    });

    // 2. If payment succeeded, credit creator's earnings in the economic engine
    if (status === SubscriptionPaymentStatus.SUCCEEDED) {
      try {
        await db.creatorEarning.create({
          data: {
            creatorProfileId: params.creatorProfileId,
            earningSource: "SUBSCRIPTION",
            sourceReferenceId: payment.id,
            grossCredits: Math.round(params.amountCents / 5), // approximate credits representation
            platformRakePercentage: (PLATFORM_FEE_PERCENTAGE / 100) as any,
            platformFeeCredits: Math.round(platformFeeCents / 5),
            netCreatorCredits: Math.round(creatorNetCents / 5),
            fiatValueEstimatedCents: creatorNetCents,
            clearanceStatus: "CLEARED",
            clearsAt: new Date(),
          },
        });
      } catch (err) {
        console.warn("Could not write to creatorEarning directly:", err);
      }
    }

    return payment as unknown as SubscriptionPaymentRecord;
  }

  /**
   * Records a failed payment attempt during subscription renewal.
   */
  static async recordFailedPayment(params: {
    subscriptionId: string;
    fanId: string;
    creatorProfileId: string;
    productId?: string | null;
    billingCycleIndex: number;
    periodStart: Date;
    periodEnd: Date;
    amountCents: number;
    currency?: string;
    paymentGateway?: PaymentGateway;
    failureReason: string;
    idempotencyKey?: string;
    retryCount?: number;
    nextRetryAt?: Date;
    tx?: any;
  }): Promise<SubscriptionPaymentRecord> {
    const db = params.tx || prisma;
    const idempotencyKey =
      params.idempotencyKey ||
      `sub_fail_${params.subscriptionId}_${params.billingCycleIndex}_attempt_${params.retryCount || 1}_${Date.now()}`;

    const { platformFeeCents, creatorNetCents } = this.calculateSplit(params.amountCents);

    const payment = await db.subscriptionPayment.create({
      data: {
        subscriptionId: params.subscriptionId,
        fanId: params.fanId,
        creatorProfileId: params.creatorProfileId,
        productId: params.productId,
        billingCycleIndex: params.billingCycleIndex,
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
        amountCents: params.amountCents,
        currency: (params.currency || "EUR").toUpperCase(),
        platformFeeCents,
        creatorNetCents,
        paymentGateway: params.paymentGateway || PaymentGateway.STRIPE,
        idempotencyKey,
        status: SubscriptionPaymentStatus.FAILED,
        failureReason: params.failureReason,
        retryCount: params.retryCount || 1,
        nextRetryAt: params.nextRetryAt ?? null,
      },
    });

    return payment as unknown as SubscriptionPaymentRecord;
  }

  /**
   * Retrieves all payment history for a given subscription.
   */
  static async getPaymentsForSubscription(
    subscriptionId: string
  ): Promise<SubscriptionPaymentRecord[]> {
    const payments = await prisma.subscriptionPayment.findMany({
      where: { subscriptionId },
      orderBy: { createdAt: "desc" },
    });

    return payments as unknown as SubscriptionPaymentRecord[];
  }

  /**
   * Handles payment gateway webhooks for recurring subscription billing events.
   */
  static async handleWebhookEvent(event: {
    eventType: "INVOICE_PAID" | "PAYMENT_FAILED" | "DISPUTE_OPENED" | "REFUNDED";
    gatewayTransactionId: string;
    gatewayInvoiceId?: string;
    amountCents: number;
    currency: string;
    subscriptionId: string;
    failureReason?: string;
    payload?: Record<string, any>;
  }) {
    const sub = await prisma.subscription.findUnique({
      where: { id: event.subscriptionId },
    });

    if (!sub) {
      throw new Error(`Subscription not found for webhook: ${event.subscriptionId}`);
    }

    if (event.eventType === "INVOICE_PAID") {
      return await this.recordPayment({
        subscriptionId: sub.id,
        fanId: sub.fanId,
        creatorProfileId: sub.creatorProfileId,
        productId: sub.productId,
        billingCycleIndex: (await prisma.subscriptionPayment.count({ where: { subscriptionId: sub.id } })) + 1,
        periodStart: sub.currentPeriodEnd,
        periodEnd: new Date(sub.currentPeriodEnd.getTime() + 30 * 24 * 60 * 60 * 1000),
        amountCents: event.amountCents,
        currency: event.currency,
        gatewayTransactionId: event.gatewayTransactionId,
        gatewayInvoiceId: event.gatewayInvoiceId,
        status: SubscriptionPaymentStatus.SUCCEEDED,
        rawPayload: event.payload,
      });
    }

    if (event.eventType === "PAYMENT_FAILED") {
      return await this.recordFailedPayment({
        subscriptionId: sub.id,
        fanId: sub.fanId,
        creatorProfileId: sub.creatorProfileId,
        productId: sub.productId,
        billingCycleIndex: (await prisma.subscriptionPayment.count({ where: { subscriptionId: sub.id } })) + 1,
        periodStart: sub.currentPeriodEnd,
        periodEnd: new Date(sub.currentPeriodEnd.getTime() + 30 * 24 * 60 * 60 * 1000),
        amountCents: event.amountCents,
        currency: event.currency,
        failureReason: event.failureReason || "Gateway recurring payment charge declined",
      });
    }

    return null;
  }
}
