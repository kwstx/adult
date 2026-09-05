import { NextRequest, NextResponse } from "next/server";
import { LedgerService } from "@/modules/economic/ledger.service";

/**
 * POST /api/economic/tip
 * Backend-authoritative tip processing endpoint.
 * Enforces atomic debit, creator credit, platform rake calculation,
 * and live stream goal progress updates.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fanUserId, creatorId, credits, menuItemId, customMessage } = body;

    if (!fanUserId || !creatorId || !credits) {
      return NextResponse.json(
        { error: "Missing required fields: fanUserId, creatorId, credits." },
        { status: 400 }
      );
    }

    const idempotencyKey = req.headers.get("x-idempotency-key") || undefined;

    const result = await LedgerService.processLiveTip({
      fanUserId,
      creatorId,
      credits: Number(credits),
      menuItemId,
      customMessage,
      idempotencyKey,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Tip processing failed:", error);
    if (error.name === "InsufficientCreditsError") {
      return NextResponse.json(
        { error: error.message, code: "INSUFFICIENT_CREDITS" },
        { status: 402 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to process tip." },
      { status: 500 }
    );
  }
}
