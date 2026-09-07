import { NextRequest, NextResponse } from "next/server";
import {
  AgeEntitlementService,
  AgeVerificationMethod,
  AgeVerificationProviderName,
} from "@/modules/trust-safety/age-verification";

/**
 * POST /api/safety/age-verify/session
 * 
 * Initiates an authoritative age verification session with a certified third-party provider
 * (Persona, Veriff, etc.) based on user jurisdiction and allowed assurance methods.
 * 
 * Returns hosted verification URL / client SDK token to the frontend.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      method = "ID_DOCUMENT_KYC",
      jurisdictionCode,
      redirectUrl = "/discover",
      providerName,
    } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required parameter: userId" },
        { status: 400 }
      );
    }

    // Determine client IP for country/jurisdiction fallback & salted hashing
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      req.headers.get("x-real-ip") ||
      undefined;

    const detectedJurisdiction =
      jurisdictionCode ||
      req.headers.get("x-jurisdiction-code") ||
      req.headers.get("cf-ipcountry") ||
      "DEFAULT";

    const session = await AgeEntitlementService.initiateVerificationSession({
      userId,
      method: method as AgeVerificationMethod,
      jurisdictionCode: detectedJurisdiction,
      redirectUrl,
      clientIp,
      providerName: providerName as AgeVerificationProviderName | undefined,
    });

    return NextResponse.json({
      success: true,
      provider: session.provider,
      providerReference: session.providerReference,
      sessionToken: session.sessionToken,
      hostedVerificationUrl: session.hostedVerificationUrl,
      expiresAt: session.expiresAt,
      environment: session.environment,
      message: "Age verification session initialized with provider.",
    });
  } catch (error: any) {
    console.error("Age verification session initiation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to initialize verification session." },
      { status: 400 }
    );
  }
}
