import { NextRequest, NextResponse } from "next/server";
import { DeviceFingerprintService } from "@/modules/fraud-prevention/signals/device-fingerprint.service";
import { DeviceFingerprintData } from "@/modules/fraud-prevention/types";

/**
 * POST /api/risk/fingerprint
 * Ingests browser telemetry, computes canonical fingerprint hash,
 * and maintains identity graph across user accounts.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, telemetry } = body;

    const userAgent = req.headers.get("user-agent") || undefined;
    const fingerprintData: DeviceFingerprintData = {
      ...(telemetry || {}),
      userAgent: telemetry?.userAgent || userAgent,
      fingerprintHash: telemetry?.fingerprintHash || DeviceFingerprintService.generateFingerprintHash({
        ...telemetry,
        userAgent,
      }),
    };

    const analysis = await DeviceFingerprintService.analyzeAndRecordDevice(
      userId,
      fingerprintData
    );

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error: any) {
    console.error("[API:RiskFingerprint] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process device fingerprint." },
      { status: 500 }
    );
  }
}
