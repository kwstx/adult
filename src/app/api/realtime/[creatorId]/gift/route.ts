import { NextRequest, NextResponse } from "next/server";
import { GiftProcessorService, InsufficientFundsError } from "@/modules/realtime/gift-processor.service";

export const dynamic = "force-dynamic";

/**
 * POST /api/realtime/[creatorId]/gift
 * Authoritative backend gift endpoint.
 *
 * Flow:
 * 1. Sarah's browser sends "Send gift X to livestream Y" with credits amount.
 * 2. Backend verifies permissions, wallet balance, and idempotency.
 * 3. Backend executes atomic double-entry ledger transaction.
 * 4. Backend recalculates live leaderboard and goal status.
 * 5. Backend creates and broadcasts the authoritative GIFT_SENT event.
 * 6. Returns transaction confirmation and updated fan balance.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await context.params;
    const body = await req.json();
    const {
      fanUserId,
      credits,
      giftId,
      giftName,
      giftIcon,
      customMessage,
    } = body;

    if (!fanUserId || !credits) {
      return NextResponse.json(
        { error: "Missing required parameters: fanUserId and credits." },
        { status: 400 }
      );
    }

    const idempotencyKey = req.headers.get("x-idempotency-key") || undefined;

    const result = await GiftProcessorService.processLiveGift({
      fanUserId,
      creatorId,
      credits: Number(credits),
      giftId,
      giftName,
      giftIcon,
      customMessage,
      idempotencyKey,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Gift processing error:", error);

    if (error instanceof InsufficientFundsError || error.name === "InsufficientFundsError") {
      return NextResponse.json(
        {
          error: error.message,
          code: "INSUFFICIENT_CREDITS",
          required: error.required,
          available: error.available,
        },
        { status: 402 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to process gift." },
      { status: 500 }
    );
  }
}
