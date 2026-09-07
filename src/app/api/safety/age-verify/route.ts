import { NextRequest, NextResponse } from "next/server";
import { AgeVerificationService } from "@/modules/trust-safety/age-verification";

/**
 * POST /api/safety/age-verify
 * Legacy / Direct Age Assurance Verification Endpoint
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, method = "ID_DOCUMENT_KYC", dob, providerVerificationId, jurisdictionCode } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required fields: userId" },
        { status: 400 }
      );
    }

    const result = await AgeVerificationService.verifyUserAge({
      userId,
      method,
      dob,
      providerVerificationId,
      jurisdictionCode: jurisdictionCode || "DEFAULT",
    });

    return NextResponse.json({
      success: true,
      ...result,
      message: "Age assurance verification successfully completed.",
    });
  } catch (error: any) {
    console.error("Age verification error:", error);
    return NextResponse.json(
      { error: error.message || "Age verification failed." },
      { status: 400 }
    );
  }
}
