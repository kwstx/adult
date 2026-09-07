/**
 * ============================================================================
 * SANDBOX / MOCK AGE VERIFICATION ADAPTER
 * ============================================================================
 * 
 * High-fidelity simulated provider for local development, staging environments,
 * and automated testing without requiring live vendor API credentials.
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

export class MockAgeVerificationAdapter implements IAgeVerificationProvider {
  public readonly name: AgeVerificationProviderName = "SANDBOX_MOCK";
  private readonly secretKey: string;

  constructor(secretKey = process.env.PAYMENT_WEBHOOK_SECRET || "mock_secret_key_12345") {
    this.secretKey = secretKey;
  }

  async createSession(params: CreateSessionParams): Promise<ProviderSessionResponse> {
    const providerReference = `inq_mock_${crypto.randomBytes(12).toString("hex")}`;
    const sessionToken = `tok_sandbox_${crypto.randomBytes(16).toString("hex")}`;
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes validity

    const hostedVerificationUrl = `/api/safety/age-verify/mock-complete?ref=${providerReference}&userId=${encodeURIComponent(
      params.userId
    )}&method=${params.method}&level=${params.assuranceLevel}&jurisdiction=${params.jurisdictionCode}&returnUrl=${encodeURIComponent(
      params.redirectUrl
    )}`;

    return {
      provider: this.name,
      providerReference,
      sessionToken,
      hostedVerificationUrl,
      expiresAt,
      environment: "sandbox",
    };
  }

  async fetchVerificationStatus(providerReference: string): Promise<CanonicalVerificationUpdate> {
    // In mock mode, if the reference contains "_rejected", simulate rejection
    const isRejected = providerReference.includes("_rejected");
    const status: AgeVerificationStatus = isRejected ? "REJECTED" : "APPROVED";

    return {
      provider: this.name,
      providerReference,
      userId: "mock_user",
      status,
      assuranceLevel: AgeAssuranceLevel.LEVEL_3_DOCUMENT_LIVENESS,
      method: "ID_DOCUMENT_KYC",
      verifiedAt: status === "APPROVED" ? new Date() : undefined,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365), // 1 year
      countryCode: "US",
      rejectionReason: isRejected ? "Government ID expired or below 18 threshold." : undefined,
      rawProviderStatus: status,
    };
  }

  async verifyWebhookSignature(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string
  ): Promise<boolean> {
    const signature = headers["x-mock-signature"] || headers["x-webhook-signature"];
    if (!signature || typeof signature !== "string") {
      // In sandbox mode without signature header, allow if in development
      return process.env.NODE_ENV !== "production";
    }

    const expectedSignature = crypto
      .createHmac("sha256", this.secretKey)
      .update(rawBody)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature, "utf-8"),
      Buffer.from(expectedSignature, "utf-8")
    );
  }

  async parseWebhookPayload(payload: any): Promise<CanonicalVerificationUpdate> {
    const data = payload.data || payload;
    const providerReference = data.providerReference || data.inquiryId || `inq_${Date.now()}`;
    const userId = data.userId || "unknown_user";
    const status: AgeVerificationStatus =
      data.status === "APPROVED" || data.status === "passed" || data.status === "completed"
        ? "APPROVED"
        : data.status === "REJECTED" || data.status === "failed" || data.status === "declined"
        ? "REJECTED"
        : "IN_REVIEW";

    const assuranceLevel = (data.assuranceLevel as AgeAssuranceLevel) || AgeAssuranceLevel.LEVEL_3_DOCUMENT_LIVENESS;
    const method = (data.method as AgeVerificationMethod) || "ID_DOCUMENT_KYC";

    return {
      provider: this.name,
      providerReference,
      userId,
      status,
      assuranceLevel,
      method,
      verifiedAt: status === "APPROVED" ? new Date() : undefined,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      countryCode: data.countryCode || "US",
      rejectionReason: data.rejectionReason,
      rawProviderStatus: data.status,
      metadata: data.metadata,
    };
  }
}
