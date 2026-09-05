import prisma from "@/lib/db";
import {
  SubscribeInput,
  RenewSubscriptionInput,
  CancelSubscriptionInput,
  PauseSubscriptionInput,
  ResumeSubscriptionInput,
  UpgradeSubscriptionInput,
  SubscriptionRecord,
  SubscriptionStatus,
  SubscriptionTier,
  PaymentGateway,
  SubscriptionPaymentStatus,
} from "./types";
import { SubscriptionProductService } from "./subscription-product.service";
import { SubscriptionPaymentService } from "./subscription-payment.service";

const DEFAULT_BILLING_PERIOD_DAYS = 30;
const DEFAULT_GRACE_PERIOD_DAYS = 3;
const MAX_FAILED_PAYMENT_ATTEMPTS = 3;

export class SubscriptionService {
  /**
   * Subscribes a fan to a creator's subscription product.
   */
  static async subscribe(
    input: SubscribeInput,
    db: any = prisma
  ): Promise<{
    subscription: SubscriptionRecord;
    payment: any;
    isNewSubscription: boolean;
  }> {
    const {
      fanId,
      creatorProfileId,
      productId,
      paymentGateway = PaymentGateway.STRIPE,
      paymentMethod = "card_default",
      gatewayTransactionId,
      idempotencyKey,
    } = input;

    // 1. Verify product exists and is active
    const product = await db.subscriptionProduct.findFirst({
      where: {
        id: productId,
        creatorProfileId,
        isActive: true,
        isArchived: false,
      },
    });

    if (!product) {
      throw new Error("Subscription product not found or is no longer available.");
    }

    // 2. Prevent creator from subscribing to themselves
    const creator = await db.creatorProfile.findUnique({
      where: { id: creatorProfileId },
    });
    if (creator && creator.userId === fanId) {
      throw new Error("Creators cannot subscribe to their own profiles.");
    }

    // 3. Check for existing subscription for this fan + creator
    const existingSub = await db.subscription.findUnique({
      where: {
        fanId_creatorProfileId: {
          fanId,
          creatorProfileId,
        },
      },
    });

    const now = new Date();
    const currentPeriodStart = now;
    const currentPeriodEnd = new Date(now.getTime() + DEFAULT_BILLING_PERIOD_DAYS * 24 * 60 * 60 * 1000);
    const renewalDate = currentPeriodEnd;

    const lockedPriceCents = product.priceFiatCents;
    const lockedCurrency = product.currency;
    const creditPriceMonthly = product.creditPriceMonthly ?? Math.round(lockedPriceCents / 5);

    let subscription: any;
    let isNewSubscription = true;

    if (existingSub) {
      isNewSubscription = false;
      subscription = await db.subscription.update({
        where: { id: existingSub.id },
        data: {
          productId: product.id,
          tier: product.tier,
          tierName: product.name,
          tierLevel: product.tierLevel,
          status: SubscriptionStatus.ACTIVE,
          billingPriceCents: lockedPriceCents,
          billingCurrency: lockedCurrency,
          creditPriceMonthly,
          isPriceGrandfathered: false,
          grandfatheredOriginalPriceCents: null,
          currentPeriodStart,
          currentPeriodEnd,
          renewalDate,
          autoRenew: true,
          cancelAtPeriodEnd: false,
          canceledAt: null,
          cancelReason: null,
          isPaused: false,
          pausedAt: null,
          pauseResumeAt: null,
          pauseReason: null,
          failedPaymentAttempts: 0,
          gracePeriodEndsAt: null,
          lastPaymentError: null,
          lastPaymentAt: now,
        },
      });
    } else {
      subscription = await db.subscription.create({
        data: {
          fanId,
          creatorProfileId,
          productId: product.id,
          tier: product.tier,
          tierName: product.name,
          tierLevel: product.tierLevel,
          status: SubscriptionStatus.ACTIVE,
          billingPriceCents: lockedPriceCents,
          billingCurrency: lockedCurrency,
          creditPriceMonthly,
          isPriceGrandfathered: false,
          currentPeriodStart,
          currentPeriodEnd,
          renewalDate,
          autoRenew: true,
          cancelAtPeriodEnd: false,
          isPaused: false,
          failedPaymentAttempts: 0,
          lastPaymentAt: now,
        },
      });
    }

    // 4. Record initial payment in the ledger
    const payment = await SubscriptionPaymentService.recordPayment({
      subscriptionId: subscription.id,
      fanId,
      creatorProfileId,
      productId: product.id,
      billingCycleIndex: 1,
      periodStart: currentPeriodStart,
      periodEnd: currentPeriodEnd,
      amountCents: lockedPriceCents,
      currency: lockedCurrency,
      paymentGateway,
      paymentMethod,
      gatewayTransactionId: gatewayTransactionId || `gtx_initial_${subscription.id}_${Date.now()}`,
      idempotencyKey: idempotencyKey || `sub_init_${subscription.id}_${Date.now()}`,
      status: SubscriptionPaymentStatus.SUCCEEDED,
      tx: db,
    });

    return {
      subscription: subscription as unknown as SubscriptionRecord,
      payment,
      isNewSubscription,
    };
  }

  /**
   * Authoritatively renews an active or past-due customer subscription.
   */
  static async renew(
    input: RenewSubscriptionInput,
    db: any = prisma
  ): Promise<{
    success: boolean;
    subscription: SubscriptionRecord;
    payment: any;
    error?: string;
  }> {
    const { subscriptionId, paymentGateway, gatewayTransactionId, idempotencyKey } = input;

    const sub = await db.subscription.findUnique({
      where: { id: subscriptionId },
      include: { product: true },
    });

    if (!sub) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

    if (!sub.autoRenew) {
      throw new Error("Subscription auto-renew is disabled.");
    }

    if (sub.status === SubscriptionStatus.EXPIRED || sub.status === SubscriptionStatus.CANCELED) {
      throw new Error(`Cannot renew a subscription with status: ${sub.status}. Please resubscribe.`);
    }

    const previousPeriodEnd = sub.currentPeriodEnd;
    const newPeriodStart = previousPeriodEnd;
    const newPeriodEnd = new Date(previousPeriodEnd.getTime() + DEFAULT_BILLING_PERIOD_DAYS * 24 * 60 * 60 * 1000);
    const newRenewalDate = newPeriodEnd;
    const billingCycleIndex = (await db.subscriptionPayment.count({ where: { subscriptionId: sub.id } })) + 1;

    // Use locked grandfathered price
    const renewalAmountCents = sub.billingPriceCents;
    const currency = sub.billingCurrency;

    try {
      // Record successful renewal payment
      const payment = await SubscriptionPaymentService.recordPayment({
        subscriptionId: sub.id,
        fanId: sub.fanId,
        creatorProfileId: sub.creatorProfileId,
        productId: sub.productId,
        billingCycleIndex,
        periodStart: newPeriodStart,
        periodEnd: newPeriodEnd,
        amountCents: renewalAmountCents,
        currency,
        paymentGateway: paymentGateway || PaymentGateway.STRIPE,
        gatewayTransactionId: gatewayTransactionId || `gtx_renew_${sub.id}_${Date.now()}`,
        idempotencyKey: idempotencyKey || `sub_renew_${sub.id}_cycle_${billingCycleIndex}`,
        status: SubscriptionPaymentStatus.SUCCEEDED,
        tx: db,
      });

      // Update subscription dates and clear past-due state
      const updatedSub = await db.subscription.update({
        where: { id: sub.id },
        data: {
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: newPeriodStart,
          currentPeriodEnd: newPeriodEnd,
          renewalDate: newRenewalDate,
          failedPaymentAttempts: 0,
          gracePeriodEndsAt: null,
          lastPaymentError: null,
          lastPaymentAt: new Date(),
        },
      });

      return {
        success: true,
        subscription: updatedSub as unknown as SubscriptionRecord,
        payment,
      };
    } catch (err: any) {
      const failedSub = await this.handleRenewalFailure({
        subscription: sub,
        error: err.message || "Payment renewal charge failed",
        billingCycleIndex,
        periodStart: newPeriodStart,
        periodEnd: newPeriodEnd,
        amountCents: renewalAmountCents,
        currency,
        paymentGateway,
        tx: db,
      });

      return {
        success: false,
        subscription: failedSub,
        payment: null,
        error: err.message,
      };
    }
  }

  /**
   * Handles payment failure for a recurring subscription renewal.
   */
  static async handleRenewalFailure(params: {
    subscription: any;
    error: string;
    billingCycleIndex: number;
    periodStart: Date;
    periodEnd: Date;
    amountCents: number;
    currency: string;
    paymentGateway?: PaymentGateway;
    tx?: any;
  }): Promise<SubscriptionRecord> {
    const db = params.tx || prisma;
    const { subscription, error, billingCycleIndex, periodStart, periodEnd, amountCents, currency, paymentGateway } =
      params;

    const attempts = subscription.failedPaymentAttempts + 1;
    const now = new Date();

    let newStatus = SubscriptionStatus.PAST_DUE;
    let gracePeriodEndsAt = subscription.gracePeriodEndsAt;

    if (!gracePeriodEndsAt) {
      gracePeriodEndsAt = new Date(now.getTime() + DEFAULT_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
    }

    if (attempts >= MAX_FAILED_PAYMENT_ATTEMPTS || now > gracePeriodEndsAt) {
      newStatus = SubscriptionStatus.EXPIRED;
    }

    const [updatedSub] = await Promise.all([
      db.subscription.update({
        where: { id: subscription.id },
        data: {
          status: newStatus,
          failedPaymentAttempts: attempts,
          gracePeriodEndsAt,
          lastPaymentError: error,
          autoRenew: newStatus !== SubscriptionStatus.EXPIRED,
        },
      }),
      SubscriptionPaymentService.recordFailedPayment({
        subscriptionId: subscription.id,
        fanId: subscription.fanId,
        creatorProfileId: subscription.creatorProfileId,
        productId: subscription.productId,
        billingCycleIndex,
        periodStart,
        periodEnd,
        amountCents,
        currency,
        paymentGateway,
        failureReason: error,
        retryCount: attempts,
        nextRetryAt:
          newStatus === SubscriptionStatus.PAST_DUE
            ? new Date(now.getTime() + 24 * 60 * 60 * 1000)
            : undefined,
        tx: db,
      }),
    ]);

    return updatedSub as unknown as SubscriptionRecord;
  }

  /**
   * Cancels a customer's subscription.
   */
  static async cancel(
    input: CancelSubscriptionInput,
    db: any = prisma
  ): Promise<SubscriptionRecord> {
    const { subscriptionId, fanId, creatorProfileId, reason, cancelImmediately = false } = input;

    const sub = await db.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!sub) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

    if (fanId && sub.fanId !== fanId) {
      throw new Error("Unauthorized to cancel this subscription.");
    }
    if (creatorProfileId && sub.creatorProfileId !== creatorProfileId) {
      throw new Error("Unauthorized to cancel this subscription.");
    }

    const now = new Date();

    const updated = await db.subscription.update({
      where: { id: subscriptionId },
      data: {
        autoRenew: false,
        cancelAtPeriodEnd: !cancelImmediately,
        status: cancelImmediately ? SubscriptionStatus.CANCELED : sub.status,
        canceledAt: now,
        cancelReason: reason ?? "User requested cancellation",
      },
    });

    return updated as unknown as SubscriptionRecord;
  }

  /**
   * Pauses an active subscription.
   */
  static async pause(
    input: PauseSubscriptionInput,
    db: any = prisma
  ): Promise<SubscriptionRecord> {
    const { subscriptionId, fanId, resumeDate, reason } = input;

    const sub = await db.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!sub) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

    if (fanId && sub.fanId !== fanId) {
      throw new Error("Unauthorized to pause this subscription.");
    }

    if (sub.status !== SubscriptionStatus.ACTIVE) {
      throw new Error(`Cannot pause a subscription that is ${sub.status}.`);
    }

    const defaultResumeDate =
      resumeDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const updated = await db.subscription.update({
      where: { id: subscriptionId },
      data: {
        isPaused: true,
        pausedAt: new Date(),
        pauseResumeAt: defaultResumeDate,
        pauseReason: reason ?? "User requested pause",
        status: SubscriptionStatus.PAUSED,
      },
    });

    return updated as unknown as SubscriptionRecord;
  }

  /**
   * Resumes a paused subscription.
   */
  static async resume(
    input: ResumeSubscriptionInput,
    db: any = prisma
  ): Promise<SubscriptionRecord> {
    const { subscriptionId, fanId } = input;

    const sub = await db.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!sub) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

    if (fanId && sub.fanId !== fanId) {
      throw new Error("Unauthorized to resume this subscription.");
    }

    if (!sub.isPaused && sub.status !== SubscriptionStatus.PAUSED) {
      throw new Error("Subscription is not paused.");
    }

    const now = new Date();
    let newPeriodEnd = sub.currentPeriodEnd;
    if (sub.pausedAt) {
      const pauseDurationMs = now.getTime() - sub.pausedAt.getTime();
      newPeriodEnd = new Date(sub.currentPeriodEnd.getTime() + pauseDurationMs);
    }

    const updated = await db.subscription.update({
      where: { id: subscriptionId },
      data: {
        isPaused: false,
        pausedAt: null,
        pauseResumeAt: null,
        pauseReason: null,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: newPeriodEnd,
        renewalDate: newPeriodEnd,
      },
    });

    return updated as unknown as SubscriptionRecord;
  }

  /**
   * Upgrades or downgrades a subscription to a different product/tier.
   */
  static async upgradeOrDowngrade(
    input: UpgradeSubscriptionInput,
    db: any = prisma
  ): Promise<SubscriptionRecord> {
    const { subscriptionId, fanId, newProductId, paymentGateway = PaymentGateway.STRIPE, idempotencyKey } = input;

    const sub = await db.subscription.findUnique({
      where: { id: subscriptionId },
      include: { product: true },
    });

    if (!sub || sub.fanId !== fanId) {
      throw new Error("Subscription not found or unauthorized.");
    }

    const newProduct = await db.subscriptionProduct.findFirst({
      where: {
        id: newProductId,
        creatorProfileId: sub.creatorProfileId,
        isActive: true,
        isArchived: false,
      },
    });

    if (!newProduct) {
      throw new Error("Target subscription tier not found.");
    }

    const now = new Date();
    const newPeriodEnd = new Date(now.getTime() + DEFAULT_BILLING_PERIOD_DAYS * 24 * 60 * 60 * 1000);
    const newBillingPriceCents = newProduct.priceFiatCents;

    const updated = await db.subscription.update({
      where: { id: subscriptionId },
      data: {
        productId: newProduct.id,
        tier: newProduct.tier,
        tierName: newProduct.name,
        tierLevel: newProduct.tierLevel,
        status: SubscriptionStatus.ACTIVE,
        billingPriceCents: newBillingPriceCents,
        billingCurrency: newProduct.currency,
        creditPriceMonthly: newProduct.creditPriceMonthly ?? Math.round(newBillingPriceCents / 5),
        isPriceGrandfathered: false,
        grandfatheredOriginalPriceCents: null,
        currentPeriodStart: now,
        currentPeriodEnd: newPeriodEnd,
        renewalDate: newPeriodEnd,
        autoRenew: true,
        cancelAtPeriodEnd: false,
        isPaused: false,
      },
    });

    await SubscriptionPaymentService.recordPayment({
      subscriptionId: sub.id,
      fanId,
      creatorProfileId: sub.creatorProfileId,
      productId: newProduct.id,
      billingCycleIndex: (await db.subscriptionPayment.count({ where: { subscriptionId: sub.id } })) + 1,
      periodStart: now,
      periodEnd: newPeriodEnd,
      amountCents: newBillingPriceCents,
      currency: newProduct.currency,
      paymentGateway,
      idempotencyKey: idempotencyKey || `sub_upgrade_${sub.id}_${Date.now()}`,
      status: SubscriptionPaymentStatus.SUCCEEDED,
      tx: db,
    });

    return updated as unknown as SubscriptionRecord;
  }

  /**
   * Retrieves a customer's subscription for a specific creator.
   */
  static async getSubscription(
    fanId: string,
    creatorProfileId: string,
    db: any = prisma
  ): Promise<SubscriptionRecord | null> {
    const sub = await db.subscription.findUnique({
      where: {
        fanId_creatorProfileId: {
          fanId,
          creatorProfileId,
        },
      },
      include: {
        product: true,
      },
    });

    return sub as unknown as SubscriptionRecord | null;
  }

  /**
   * Retrieves all subscriptions for a fan.
   */
  static async getSubscriptionsForFan(
    fanId: string,
    db: any = prisma
  ): Promise<SubscriptionRecord[]> {
    const subs = await db.subscription.findMany({
      where: { fanId },
      include: {
        creatorProfile: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        product: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return subs as unknown as SubscriptionRecord[];
  }

  /**
   * Batch Cron/Worker: Processes due renewals for all active subscriptions where renewalDate <= now.
   */
  static async processDueRenewalsBatch(
    now: Date = new Date(),
    db: any = prisma
  ): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
  }> {
    const dueSubscriptions = await db.subscription.findMany({
      where: {
        renewalDate: { lte: now },
        autoRenew: true,
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE] },
        isPaused: false,
      },
      take: 100,
    });

    let succeeded = 0;
    let failed = 0;

    for (const sub of dueSubscriptions) {
      if (sub.cancelAtPeriodEnd) {
        await db.subscription.update({
          where: { id: sub.id },
          data: {
            status: SubscriptionStatus.CANCELED,
            autoRenew: false,
          },
        });
        continue;
      }

      const res = await this.renew(
        {
          subscriptionId: sub.id,
          idempotencyKey: `cron_renew_${sub.id}_${sub.renewalDate.toISOString()}`,
        },
        db
      );

      if (res.success) succeeded++;
      else failed++;
    }

    return {
      processed: dueSubscriptions.length,
      succeeded,
      failed,
    };
  }

  /**
   * Batch Cron/Worker: Expires subscriptions whose past-due grace period has elapsed.
   */
  static async expireStalePastDueBatch(
    now: Date = new Date(),
    db: any = prisma
  ): Promise<number> {
    const expired = await db.subscription.updateMany({
      where: {
        status: SubscriptionStatus.PAST_DUE,
        gracePeriodEndsAt: { lt: now },
      },
      data: {
        status: SubscriptionStatus.EXPIRED,
        autoRenew: false,
      },
    });

    return expired.count;
  }
}
