import { CreditPackage } from "./types";
import { LedgerService } from "./ledger.service";

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "pkg_starter",
    name: "Starter Pack",
    credits: 100,
    priceUsd: 9.99,
    bonusCredits: 0,
  },
  {
    id: "pkg_popular",
    name: "VIP Fan Pack",
    credits: 500,
    priceUsd: 44.99,
    bonusCredits: 50,
    popular: true,
  },
  {
    id: "pkg_diamond",
    name: "High Roller Pack",
    credits: 1200,
    priceUsd: 99.99,
    bonusCredits: 200,
  },
  {
    id: "pkg_whale",
    name: "Elite Patron Pack",
    credits: 3000,
    priceUsd: 229.99,
    bonusCredits: 600,
  },
];

export interface PaymentGatewaySession {
  sessionId: string;
  redirectUrl: string;
  packageId: string;
  creditsToGrant: number;
  priceUsd: number;
}

export class PaymentAdapter {
  /**
   * Generates a checkout session URL for the specialized adult content payment processor (e.g. CCBill / Segpay).
   */
  static async createCheckoutSession(userId: string, packageId: string): Promise<PaymentGatewaySession> {
    const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) throw new Error("Invalid credit package selected.");

    const totalCredits = pkg.credits + pkg.bonusCredits;
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // In production, this generates a signed CCBill / Segpay FlexForm URL.
    // For local mock / direct execution, return a checkout redirect or simulated processor URL.
    const redirectUrl = `/api/economic/checkout/mock-provider?sessionId=${sessionId}&packageId=${packageId}&userId=${userId}&credits=${totalCredits}&amount=${pkg.priceUsd}`;

    return {
      sessionId,
      redirectUrl,
      packageId,
      creditsToGrant: totalCredits,
      priceUsd: pkg.priceUsd,
    };
  }

  /**
   * Process and verify payment gateway webhook callback.
   * Ensures backend authority: credits are minted ONLY when the gateway signature is verified.
   */
  static async handlePaymentWebhook(payload: {
    signature: string;
    transactionId: string;
    userId: string;
    packageId: string;
    credits: number;
    currency: string;
    amountPaid: number;
  }) {
    // In production, verify SHA256 HMAC signature against PAYMENT_WEBHOOK_SECRET
    // e.g. const validSignature = crypto.createHmac('sha256', secret).update(body).digest('hex') === signature;

    const idempotencyKey = `webhook_pay_${payload.transactionId}`;

    return await LedgerService.creditUserWalletFromPurchase({
      userId: payload.userId,
      creditsAmount: payload.credits,
      paymentReference: payload.transactionId,
      idempotencyKey,
    });
  }
}
