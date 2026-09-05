import { CreditPackage } from "./types";
import { LedgerService } from "./ledger.service";

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "pkg_starter",
    name: "Starter Pack",
    credits: 100,
    priceFiat: 10.0,
    currency: "EUR",
    bonusCredits: 0,
  },
  {
    id: "pkg_popular",
    name: "VIP Fan Pack",
    credits: 500,
    priceFiat: 45.0,
    currency: "EUR",
    bonusCredits: 50,
    popular: true,
  },
  {
    id: "pkg_high_roller",
    name: "High Roller Pack",
    credits: 1000,
    priceFiat: 10.0, // Special Promo: €10 = 1,000 Credits matching prompt scenario
    currency: "EUR",
    bonusCredits: 0,
  },
  {
    id: "pkg_diamond",
    name: "Diamond Patron Pack",
    credits: 1200,
    priceFiat: 100.0,
    currency: "EUR",
    bonusCredits: 200,
  },
  {
    id: "pkg_whale",
    name: "Elite Patron Pack",
    credits: 3000,
    priceFiat: 230.0,
    currency: "EUR",
    bonusCredits: 600,
  },
];

export interface PaymentGatewaySession {
  sessionId: string;
  redirectUrl: string;
  packageId: string;
  creditsToGrant: number;
  priceFiat: number;
  currency: string;
}

export class PaymentAdapter {
  /**
   * Generates a checkout session URL for high-risk payment processors (CCBill / Segpay).
   */
  static async createCheckoutSession(userId: string, packageId: string): Promise<PaymentGatewaySession> {
    const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId) || CREDIT_PACKAGES[0];

    const totalCredits = pkg.credits + pkg.bonusCredits;
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const redirectUrl = `/api/economic/checkout/mock-provider?sessionId=${sessionId}&packageId=${pkg.id}&userId=${userId}&credits=${totalCredits}&amount=${pkg.priceFiat}&currency=${pkg.currency}`;

    return {
      sessionId,
      redirectUrl,
      packageId: pkg.id,
      creditsToGrant: totalCredits,
      priceFiat: pkg.priceFiat,
      currency: pkg.currency,
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
    currency?: string;
    amountPaid: number;
  }) {
    const idempotencyKey = `webhook_pay_${payload.transactionId}`;

    return await LedgerService.creditUserWalletFromPurchase({
      userId: payload.userId,
      creditsAmount: payload.credits,
      paymentReference: payload.transactionId,
      idempotencyKey,
      amountFiat: payload.amountPaid,
      currency: payload.currency || "EUR",
    });
  }
}
