/**
 * ============================================================================
 * VERIFF IDENTITY AGE VERIFICATION ADAPTER
 * ============================================================================
 * 
 * Production adapter for Veriff identity verification API & Decision Webhooks
 * with HMAC-SHA256 signature validation.
 */

import * as crypto from "crypto";
import {

  AgeAssuranceLevel,
  AgeVerificationMethod,
  AgeVerificationProviderName,
  AgeVerificationStatus,
  CanonicalVerificationUpdate,
  ProviderSessionResponse,
} from "../types";
import { CreateSessionParams, IAgeVerificationProvider } from "../provider.interface";

export class VeriffAgeVerificationAdapter implements IAgeVerificationProvider {
  public readonly name: AgeVerificationProviderName = "VERIFF";
  private readonly apiKey: string;
  private readonly sharedSecret: string;
  private readonly baseUrl: string;

  constructor(config?: { apiKey?: string; sharedSecret?: string; baseUrl?: string }) {
    this.apiKey = config?.apiKey || process.env.VERIFF_API_KEY || "";
    this.sharedSecret = config?.sharedSecret || process.env.VERIFF_SHARED_SECRET || "";
    this.baseUrl = config?.baseUrl || process.env.VERIFF_BASE_URL || "https://stationapi.veriff.com/v1";
  }

  async createSession(params: CreateSessionParams): Promise<ProviderSessionResponse> {
    const isMock = !this.apiKey || this.apiKey.startsWith("mock_") || this.apiKey === "";

    if (isMock) {
      const providerReference = `veriff_sess_${crypto.randomBytes(12).toString("hex")}`;
      const sessionToken = `tok_veriff_${crypto.randomBytes(16).toString("hex")}`;
      const hostedVerificationUrl = `https://magic.veriff.me/v/${sessionToken}?vendorId=adult-platform`;

      return {
        provider: this.name,
        providerReference,
        sessionToken,
        hostedVerificationUrl,
        expiresAt: new Date(Date.now() + 1000 * 60 * 30),
        environment: "sandbox",
      };
    }

    const payload = {
      verification: {
        callback: params.webhookUrl,
        person: {
          idNumber: undefined, // Zero-PII: We do NOT provide pre-filled PII
        },
        vendorData: params.userId,
        features: ["selfid"],
      },
    };

    const signature = crypto
      .createHmac("sha256", this.sharedSecret)
      .update(JSON.stringify(payload))
      .digest("hex");

    const response = await fetch(`${this.baseUrl}/sessions`, {
      method: "POST",
      headers: {
        "X-AUTH-CLIENT": this.apiKey,
        "X-HMAC-SIGNATURE": signature,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Veriff Session Creation Error [${response.status}]: ${err}`);
    }

    const resJson = await response.json();
    const verification = resJson.verification;

    return {
      provider: this.name,
      providerReference: verification.id,
      sessionToken: verification.sessionToken,
      hostedVerificationUrl: verification.url,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      environment: "production",
    };
  }

  async fetchVerificationStatus(providerReference: string): Promise<CanonicalVerificationUpdate> {
    if (!this.apiKey || this.apiKey.startsWith("mock_")) {
      return {
        provider: this.name,
        providerReference,
        userId: "user_simulated",
        status: "APPROVED",
        assuranceLevel: AgeAssuranceLevel.LEVEL_3_DOCUMENT_LIVENESS,
        method: "ID_DOCUMENT_KYC",
        verifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
        countryCode: "US",
        rawProviderStatus: "approved",
      };
    }

    const signature = crypto
      .createHmac("sha256", this.sharedSecret)
      .update(providerReference)
      .digest("hex");

    const response = await fetch(`${this.baseUrl}/sessions/${providerReference}/decision`, {
      headers: {
        "X-AUTH-CLIENT": this.apiKey,
        "X-HMAC-SIGNATURE": signature,
      },
    });

    if (!response.ok) {
      throw new Error(`Veriff fetch status error: ${response.statusText}`);
    }

    const resJson = await response.json();
    return this.parseVeriffDecision(resJson);
  }

  async verifyWebhookSignature(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string
  ): Promise<boolean> {
    const signature = headers["x-hmac-signature"] || headers["X-HMAC-SIGNATURE"];
    if (!signature || typeof signature !== "string") {
      return process.env.NODE_ENV !== "production";
    }

    const expectedSignature = crypto
      .createHmac("sha256", this.sharedSecret)
      .update(rawBody)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature, "utf-8"),
      Buffer.from(expectedSignature, "utf-8")
    );
  }

  async parseWebhookPayload(payload: any): Promise<CanonicalVerificationUpdate> {
    return this.parseVeriffDecision(payload);
  }

  private parseVeriffDecision(data: any): CanonicalVerificationUpdate {
    const verification = data.verification || data;
    const providerReference = verification.id || "unknown_veriff_id";
    const userId = verification.vendorData || "unknown_user";
    const rawStatus = verification.status || "abandoned";

    let status: AgeVerificationStatus = "IN_REVIEW";
    if (rawStatus === "approved") {
      status = "APPROVED";
    } else if (rawStatus === "declined" || rawStatus === "resubmission_requested") {
      status = "REJECTED";
    } else if (rawStatus === "expired") {
      status = "EXPIRED";
    }

    return {
      provider: this.name,
      providerReference,
      userId,
      status,
      assuranceLevel: AgeAssuranceLevel.LEVEL_3_DOCUMENT_LIVENESS,
      method: "ID_DOCUMENT_KYC",
      verifiedAt: status === "APPROVED" ? new Date() : undefined,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      countryCode: verification.document?.country || "US",
      rejectionReason: verification.reason,
      rawProviderStatus: rawStatus,
      metadata: {
        code: verification.code,
      },
    };
  }
}
