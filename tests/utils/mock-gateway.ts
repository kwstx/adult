/**
 * PAYMENT GATEWAY & WEBHOOK SIMULATION HARNESS
 * 
 * Simulates Stripe / CCBill payment gateway callbacks, cryptographically signed
 * HMAC payloads, dispute notifications, and replay attack scenarios.
 */

import crypto from "crypto";
import { PaymentWebhookPayload } from "@/modules/economic/payment.adapter";

export const TEST_WEBHOOK_SECRET = "whsec_adult_platform_live_secret_key";

export class MockGateway {
  /**
   * Generates a valid cryptographic signature for a webhook payload.
   */
  public static signPayload(
    payload: string | object,
    timestamp: number = Date.now(),
    secret: string = TEST_WEBHOOK_SECRET
  ): string {
    const serialized = typeof payload === "string" ? payload : JSON.stringify(payload);
    const signaturePayload = `${timestamp}.${serialized}`;
    return crypto.createHmac("sha256", secret).update(signaturePayload).digest("hex");
  }

  /**
   * Builds a complete signed webhook request object.
   */
  public static createSignedWebhook(params: {
    eventType?: "payment.succeeded" | "payment.failed" | "payment.disputed";
    userId: string;
    amountFiatCents: number;
    creditsPurchased: number;
    bonusCredits?: number;
    purchaseId?: string;
    gatewayTransactionId?: string;
    timestamp?: number;
    secret?: string;
    corruptSignature?: boolean;
  }) {
    const timestamp = params.timestamp ?? Date.now();
    const purchaseId = params.purchaseId || `pur_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const gatewayTransactionId = params.gatewayTransactionId || `ch_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const payload: PaymentWebhookPayload = {
      eventType: params.eventType || "payment.succeeded",
      gatewayTransactionId,
      gatewayEventId: `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      purchaseId,
      userId: params.userId,
      packageId: "pkg_1000",
      amountFiatCents: params.amountFiatCents,
      currency: "EUR",
      creditsPurchased: params.creditsPurchased,
      bonusCredits: params.bonusCredits || 0,
      paymentMethod: "CARD",
      timestamp,
    };

    const serializedPayload = JSON.stringify(payload);
    let signature = this.signPayload(serializedPayload, timestamp, params.secret || TEST_WEBHOOK_SECRET);

    if (params.corruptSignature) {
      signature = signature.replace(/^[0-9a-f]/, (c) => (c === "a" ? "b" : "a"));
    }

    return {
      payload,
      rawBody: serializedPayload,
      headers: {
        "x-signature": signature,
        "x-timestamp": String(timestamp),
        "content-type": "application/json",
      },
    };
  }
}
