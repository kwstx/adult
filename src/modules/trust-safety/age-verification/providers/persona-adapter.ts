/**
 * ============================================================================
 * PERSONA IDENTITY AGE VERIFICATION ADAPTER
 * ============================================================================
 * 
 * Production adapter for Persona Identity (withgov.com) inquiry lifecycle,
 * hosted flow token generation, and HMAC-SHA256 webhook signature verification.
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

export class PersonaAgeVerificationAdapter implements IAgeVerificationProvider {
  public readonly name: AgeVerificationProviderName = "PERSONA";
  private readonly apiKey: string;
  private readonly webhookSecret: string;
  private readonly templateId: string;

  constructor(config?: { apiKey?: string; webhookSecret?: string; templateId?: string }) {
    this.apiKey = config?.apiKey || process.env.PERSONA_API_KEY || "";
    this.webhookSecret = config?.webhookSecret || process.env.PERSONA_WEBHOOK_SECRET || "";
    this.templateId = config?.templateId || process.env.PERSONA_TEMPLATE_ID || "itmpl_age_assurance_18plus";
  }

  async createSession(params: CreateSessionParams): Promise<ProviderSessionResponse> {
    const isMock = !this.apiKey || this.apiKey.startsWith("mock_") || this.apiKey === "";

    if (isMock) {
      // Fallback to simulated persona inquiry if API key is not configured in environment
      const providerReference = `inq_persona_${crypto.randomBytes(10).toString("hex")}`;
      const sessionToken = `tok_persona_${crypto.randomBytes(16).toString("hex")}`;
      const expiresAt = new Date(Date.now() + 1000 * 60 * 30);
      const hostedVerificationUrl = `https://withpersona.com/verify?inquiry-template-id=${this.templateId}&reference-id=${encodeURIComponent(
        params.userId
      )}&session-token=${sessionToken}`;

      return {
        provider: this.name,
        providerReference,
        sessionToken,
        hostedVerificationUrl,
        expiresAt,
        environment: "sandbox",
      };
    }

    // Call Persona REST API (Inquiries v1)
    const response = await fetch("https://withpersona.com/api/v1/inquiries", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Persona-Version": "2023-01-05",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        data: {
          attributes: {
            "inquiry-template-id": this.templateId,
            "reference-id": params.userId,
            "redirect-uri": params.redirectUrl,
            fields: {
              "user-id": params.userId,
              jurisdiction: params.jurisdictionCode,
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Persona API Error [${response.status}]: ${errText}`);
    }

    const resJson = await response.json();
    const inquiryId = resJson.data.id;
    const sessionToken = resJson.data.attributes["session-token"] || inquiryId;
    const hostedVerificationUrl = `https://withpersona.com/verify?inquiry-id=${inquiryId}&session-token=${sessionToken}`;

    return {
      provider: this.name,
      providerReference: inquiryId,
      sessionToken,
      hostedVerificationUrl,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
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

    const response = await fetch(`https://withpersona.com/api/v1/inquiries/${providerReference}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Persona-Version": "2023-01-05",
      },
    });

    if (!response.ok) {
      throw new Error(`Persona fetch inquiry error: ${response.statusText}`);
    }

    const resJson = await response.json();
    return this.parsePersonaInquiry(resJson.data);
  }

  async verifyWebhookSignature(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string
  ): Promise<boolean> {
    const signatureHeader = headers["persona-signature"] || headers["Persona-Signature"];
    if (!signatureHeader || typeof signatureHeader !== "string") {
      return process.env.NODE_ENV !== "production";
    }

    // Persona signature format: t=1612345678,v1=hex_digest
    const parts = signatureHeader.split(",");
    const tPart = parts.find((p) => p.startsWith("t="));
    const v1Part = parts.find((p) => p.startsWith("v1="));

    if (!tPart || !v1Part) return false;

    const timestamp = tPart.split("=")[1];
    const signature = v1Part.split("=")[1];
    const payloadToSign = `${timestamp}.${rawBody}`;

    const expectedSignature = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(payloadToSign)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature, "utf-8"),
      Buffer.from(expectedSignature, "utf-8")
    );
  }

  async parseWebhookPayload(payload: any): Promise<CanonicalVerificationUpdate> {
    const inquiryData = payload.data?.attributes?.payload?.data || payload.data;
    if (!inquiryData) {
      throw new Error("Invalid Persona webhook payload structure");
    }
    return this.parsePersonaInquiry(inquiryData);
  }

  private parsePersonaInquiry(inquiry: any): CanonicalVerificationUpdate {
    const attributes = inquiry.attributes || {};
    const inquiryId = inquiry.id;
    const userId = attributes["reference-id"] || attributes.fields?.["user-id"]?.value || "unknown";
    const rawStatus = attributes.status || "created";

    let status: AgeVerificationStatus = "IN_REVIEW";
    if (rawStatus === "approved" || rawStatus === "passed" || rawStatus === "completed") {
      status = "APPROVED";
    } else if (rawStatus === "declined" || rawStatus === "failed") {
      status = "REJECTED";
    } else if (rawStatus === "expired") {
      status = "EXPIRED";
    } else if (rawStatus === "pending" || rawStatus === "created") {
      status = "PENDING_SUBMISSION";
    }

    return {
      provider: this.name,
      providerReference: inquiryId,
      userId,
      status,
      assuranceLevel: AgeAssuranceLevel.LEVEL_3_DOCUMENT_LIVENESS,
      method: "ID_DOCUMENT_KYC",
      verifiedAt: status === "APPROVED" ? new Date() : undefined,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      countryCode: "US",
      rawProviderStatus: rawStatus,
      metadata: {
        inquiryTemplateId: attributes["inquiry-template-id"],
        behaviors: attributes["behaviors"],
      },
    };
  }
}
