import crypto from "crypto";
import prisma from "@/lib/db";
import { CreditPackage } from "./types";
import { WalletLedgerService } from "./wallet-ledger.service";

// ============================================================================
// EXACT SPECIFICATION CREDIT PACKAGES
// ============================================================================
export const CREDIT_PACKAGES: (CreditPackage & { bestValue?: boolean; description?: string })[] = [
  {
    id: "pkg_500",
    name: "Starter Pack",
    credits: 500,
    priceFiat: 5.0,
    currency: "EUR",
    bonusCredits: 0,
    description: "Great for quick live tips & creator interactions",
  },
  {
    id: "pkg_1100",
    name: "Fan Favorite Pack",
    credits: 1000,
    priceFiat: 10.0,
    currency: "EUR",
    bonusCredits: 100, // 1,000 + 100 = 1,100 credits
    popular: true,
    description: "Includes +100 bonus credits for regular supporters",
  },
  {
    id: "pkg_6000",
    name: "Patron Prestige Pack",
    credits: 5000,
    priceFiat: 50.0,
    currency: "EUR",
    bonusCredits: 1000, // 5,000 + 1,000 = 6,000 credits
    bestValue: true,
    description: "Includes +1,000 bonus credits for VIP stream access & top tier gifts",
  },
];

export interface PaymentGatewaySession {
  purchaseId: string;
  sessionId: string;
  clientSecret: string;
  redirectUrl: string;
  packageId: string;
  creditsToGrant: number;
  baseCredits: number;
  bonusCredits: number;
  priceFiat: number;
  currency: string;
  status: "INITIALIZED" | "PENDING_WEBHOOK" | "SUCCEEDED" | "FAILED";
  idempotencyKey: string;
  createdAt: string;
}

export interface PaymentWebhookPayload {
  eventType: "payment.succeeded" | "payment.failed" | "payment.disputed";
  gatewayTransactionId: string;
  gatewayEventId: string;
  purchaseId: string;
  userId: string;
  packageId: string;
  amountFiatCents: number;
  currency: string;
  creditsPurchased: number;
  bonusCredits: number;
  paymentMethod: string;
  timestamp: number;
}

const DEFAULT_WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || "whsec_adult_platform_live_secret_key";
const MAX_WEBHOOK_AGE_MS = 5 * 60 * 1000; // 5 minutes replay protection window

export class PaymentAdapter {
  /**
   * Generates a cryptographic HMAC-SHA256 signature for server-to-server webhook payloads.
   */
  static signWebhookPayload(payload: string | object, timestamp: number, secret: string = DEFAULT_WEBHOOK_SECRET): string {
    const serialized = typeof payload === "string" ? payload : JSON.stringify(payload);
    const signaturePayload = `${timestamp}.${serialized}`;
    return crypto.createHmac("sha256", secret).update(signaturePayload).digest("hex");
  }

  /**
   * Cryptographically verifies the webhook signature using timing-safe comparison
   * and enforces replay attack protection.
   */
  static verifyWebhookSignature(
    payload: string | object,
    signature: string,
    timestamp: number,
    secret: string = DEFAULT_WEBHOOK_SECRET
  ): boolean {
    if (!signature || !timestamp) {
      return false;
    }

    // 1. Replay attack window check
    const now = Date.now();
    if (Math.abs(now - timestamp) > MAX_WEBHOOK_AGE_MS) {
      console.warn(`[PaymentWebhook] Signature expired or timestamp skewed. Event: ${timestamp}, Current: ${now}`);
      return false;
    }

    // 2. Compute expected HMAC
    const expectedSignature = this.signWebhookPayload(payload, timestamp, secret);

    try {
      const sigBuffer = Buffer.from(signature, "hex");
      const expectedBuffer = Buffer.from(expectedSignature, "hex");

      if (sigBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
    } catch {
      return false;
    }
  }

  /**
   * STEP 4 & 5: Creates an internal purchase record in the database.
   * Status is initialized to INITIALIZED (never granted until webhook confirmation).
   */
  static async createInternalPurchaseRecord(params: {
    userId: string;
    packageId: string;
    paymentMethod?: string;
    ipAddress?: string;
    countryCode?: string;
  }): Promise<PaymentGatewaySession> {
    const { userId, packageId, paymentMethod = "CARD", ipAddress, countryCode } = params;

    // Validate package
    const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) {
      throw new Error(`Invalid credit package ID: "${packageId}". Must be one of: ${CREDIT_PACKAGES.map((p) => p.id).join(", ")}`);
    }

    // Ensure wallet exists for the user
    const wallet = await WalletLedgerService.getOrCreateWallet(userId);
    if (wallet.status === "SUSPENDED_CHARGEBACK") {
      throw new Error(`Wallet ${wallet.id} is suspended due to chargebacks. Purchases disabled.`);
    }

    const totalCredits = pkg.credits + pkg.bonusCredits;
    const amountFiatCents = Math.round(pkg.priceFiat * 100);
    const purchaseId = `pur_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const gatewaySessionId = `cs_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
    const clientSecret = `pi_secret_${crypto.randomBytes(16).toString("hex")}`;
    const idempotencyKey = `purchase_${purchaseId}`;

    // Create internal purchase record in PaymentTransaction
    const paymentTx = await prisma.paymentTransaction.create({
      data: {
        userId,
        walletId: wallet.id,
        paymentGateway: "STRIPE",
        gatewayTransactionId: gatewaySessionId,
        idempotencyKey,
        amountFiatCents,
        currency: pkg.currency,
        creditsPurchased: pkg.credits,
        bonusCredits: pkg.bonusCredits,
        paymentMethod,
        status: "INITIALIZED",
        ipAddress,
        countryCode: countryCode || "EU",
        rawGatewayPayload: JSON.stringify({
          purchaseId,
          packageId: pkg.id,
          packageName: pkg.name,
          totalCredits,
          clientSecret,
        }),
      },
    });

    const redirectUrl = `/api/economic/checkout/mock-provider?purchaseId=${paymentTx.id}&sessionId=${gatewaySessionId}&userId=${userId}&packageId=${pkg.id}`;

    return {
      purchaseId: paymentTx.id,
      sessionId: gatewaySessionId,
      clientSecret,
      redirectUrl,
      packageId: pkg.id,
      creditsToGrant: totalCredits,
      baseCredits: pkg.credits,
      bonusCredits: pkg.bonusCredits,
      priceFiat: pkg.priceFiat,
      currency: pkg.currency,
      status: "INITIALIZED",
      idempotencyKey,
      createdAt: paymentTx.createdAt.toISOString(),
    };
  }

  /**
   * STEP 7, 8, 9, 10: Process and verify payment gateway webhook callback.
   * Backend-Authoritative: credits are minted ONLY when the gateway signature is verified.
   */
  static async handlePaymentWebhook(params: {
    rawPayload: string | object;
    signature: string;
    timestamp: number;
  }) {
    const { rawPayload, signature, timestamp } = params;

    // 1. Verify cryptographic signature
    const isValid = this.verifyWebhookSignature(rawPayload, signature, timestamp);
    if (!isValid) {
      throw new Error("Invalid or expired payment webhook signature. Unauthorized request rejected.");
    }

    const payload: PaymentWebhookPayload =
      typeof rawPayload === "string" ? JSON.parse(rawPayload) : (rawPayload as PaymentWebhookPayload);

    if (payload.eventType !== "payment.succeeded") {
      return {
        acknowledged: true,
        message: `Event type ${payload.eventType} acknowledged without balance minting.`,
      };
    }

    const {
      userId,
      purchaseId,
      gatewayTransactionId,
      gatewayEventId,
      amountFiatCents,
      currency,
      creditsPurchased,
      bonusCredits = 0,
      paymentMethod = "CARD",
    } = payload;

    const idempotencyKey = `webhook_pay_${purchaseId || gatewayTransactionId}`;

    // 2. Mint credits into authoritative wallet ledger atomically
    const depositResult = await WalletLedgerService.processDeposit({
      userId,
      amountFiatCents,
      currency,
      creditsPurchased,
      bonusCredits,
      gateway: "STRIPE",
      gatewayTransactionId,
      gatewayEventId,
      paymentMethod,
      idempotencyKey,
      metadata: {
        purchaseId,
        processedViaWebhook: true,
        verifiedAt: new Date().toISOString(),
      },
    });

    return {
      success: true,
      transactionId: depositResult.transactionId,
      idempotencyKey: depositResult.idempotencyKey,
      creditsMinted: depositResult.amountCredits,
      newWalletBalance: depositResult.fanRemainingBalance,
      purchasedBalance: depositResult.fanPurchasedBalance,
      bonusBalance: depositResult.fanBonusBalance,
      settledAt: depositResult.timestamp,
    };
  }

  /**
   * Query status of an internal purchase record.
   */
  static async getPurchaseStatus(purchaseId: string) {
    const paymentTx = await prisma.paymentTransaction.findUnique({
      where: { id: purchaseId },
      include: {
        wallet: true,
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    if (!paymentTx) {
      throw new Error(`Purchase record not found: ${purchaseId}`);
    }

    const totalCredits = paymentTx.creditsPurchased + paymentTx.bonusCredits;
    const isSettled = paymentTx.status === "SUCCEEDED";

    return {
      purchaseId: paymentTx.id,
      status: paymentTx.status,
      isSettled,
      creditsGranted: isSettled ? totalCredits : 0,
      totalCredits,
      baseCredits: paymentTx.creditsPurchased,
      bonusCredits: paymentTx.bonusCredits,
      amountFiat: paymentTx.amountFiatCents / 100,
      currency: paymentTx.currency,
      gatewayTransactionId: paymentTx.gatewayTransactionId,
      updatedWalletBalance: paymentTx.wallet?.balance || 0,
      createdAt: paymentTx.createdAt,
      updatedAt: paymentTx.updatedAt,
    };
  }
}
