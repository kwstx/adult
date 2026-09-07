import { NextRequest, NextResponse } from "next/server";
import { RiskEngine } from "@/modules/fraud-prevention/risk-engine";
import { NetworkSignalService } from "@/modules/fraud-prevention/signals/network-signal.service";
import { RiskEvaluationContext } from "@/modules/fraud-prevention/types";

/**
 * POST /api/risk/evaluate
 * Evaluates the real-time risk score and action policy for any platform activity.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const clientIp = NetworkSignalService.extractClientIp(req.headers);
    const userAgent = req.headers.get("user-agent") || undefined;

    const context: RiskEvaluationContext = {
      ...body,
      ipAddress: body.ipAddress || clientIp,
      userAgent: body.userAgent || userAgent,
    };

    if (!context.actionType) {
      return NextResponse.json(
        { error: "Missing required field: actionType" },
        { status: 400 }
      );
    }

    const autoEnforce = body.autoEnforce !== false;
    const assessment = await RiskEngine.evaluate(context, { autoEnforce });

    return NextResponse.json({
      success: true,
      assessment,
    });
  } catch (error: any) {
    console.error("[API:RiskEvaluate] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to evaluate transaction risk." },
      { status: 500 }
    );
  }
}
