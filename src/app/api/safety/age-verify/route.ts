import { NextRequest, NextResponse } from "next/server";
import { AgeVerificationService } from "@/modules/trust-safety/age-verification";

/**
 * POST /api/safety/age-verify
 * 18+ Age Assurance KYC Verification
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, method, dob } = body;

    if (!userId || !method) {
      return NextResponse.json(
        { error: "Missing required fields: userId, method" },
        { status: 400 }
      );
    }

    const result = await AgeVerificationService.verifyUserAge({
      userId,
      method,
      dob,
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
