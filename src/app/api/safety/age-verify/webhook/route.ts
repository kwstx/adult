import { NextRequest, NextResponse } from "next/server";
import {
  AgeEntitlementService,
  AgeVerificationProviderName,
} from "@/modules/trust-safety/age-verification";

/**
 * POST /api/safety/age-verify/webhook
 * 
 * Authoritative Webhook Receiver for third-party age verification providers
 * (Persona, Veriff, etc.).
 * 
 * Cryptographically validates the vendor signature and transitions the user's
 * age entitlement state atomically.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const headersMap: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headersMap[key.toLowerCase()] = value;
    });

    // Detect provider from query or headers
    const url = new URL(req.url);
    const providerParam = url.searchParams.get("provider")?.toUpperCase() as
      | AgeVerificationProviderName
      | undefined;

    let providerName: AgeVerificationProviderName = "SANDBOX_MOCK";
    if (providerParam) {
      providerName = providerParam;
    } else if (headersMap["persona-signature"]) {
      providerName = "PERSONA";
    } else if (headersMap["x-hmac-signature"] || headersMap["x-auth-client"]) {
      providerName = "VERIFF";
    }

    const update = await AgeEntitlementService.handleProviderWebhook(
      providerName,
      headersMap,
      rawBody
    );

    return NextResponse.json({
      received: true,
      provider: update.provider,
      reference: update.providerReference,
      status: update.status,
    });
  } catch (error: any) {
    console.error("Age verification webhook error:", error);
    return NextResponse.json(
      { error: error.message || "Webhook processing failed." },
      { status: 400 }
    );
  }
}
