import { NextRequest, NextResponse } from "next/server";
import {
  InteractionPurchaseService,
  InteractionNotFoundError,
  InteractionInactiveError,
  PriceMismatchError,
  IneligibleFanError,
  InsufficientBalanceError,
  CapacityExceededError,
  FanBlockedError,
} from "@/modules/interaction/interaction-purchase.service";
import { recordRecommendationEvent } from "@/lib/recommendations/event-collector";

export const dynamic = "force-dynamic";

/**
 * POST /api/creators/[creatorId]/interactions/purchase
 * Authoritative Backend Verification & Interaction Purchasing Endpoint.
 *
 * It verifies:
 * 1. The interaction exists.
 * 2. The interaction is active.
 * 3. The price is still 100 (matches expectedPrice).
 * 4. The fan is eligible.
 * 5. The fan has sufficient balance.
 * 6. The interaction still has capacity.
 * 7. The fan isn't blocked.
 * 8. The transaction has not already happened (idempotency).
 *
 * Then the backend records the purchase, updates the queue, and broadcasts real-time events.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await context.params;
    const body = await req.json();

    const {
      interactionId,
      expectedPrice,
      fanUserId,
      fanDisplayName,
      fanAvatarUrl,
      customMessage,
      idempotencyKey,
    } = body;

    if (!interactionId) {
      return NextResponse.json(
        { error: "Missing required field: interactionId." },
        { status: 400 }
      );
    }

    if (expectedPrice === undefined || expectedPrice === null) {
      return NextResponse.json(
        { error: "Missing required field: expectedPrice." },
        { status: 400 }
      );
    }

    if (!fanUserId) {
      return NextResponse.json(
        { error: "Missing required field: fanUserId." },
        { status: 400 }
      );
    }

    const receipt = await InteractionPurchaseService.purchaseInteraction({
      creatorId,
      interactionId,
      expectedPrice: Number(expectedPrice),
      fanUserId,
      fanDisplayName,
      fanAvatarUrl,
      customMessage,
      idempotencyKey,
    });

    // Record recommendation telemetry event asynchronously
    recordRecommendationEvent({
      userId: fanUserId,
      creatorProfileId: creatorId,
      eventType: "INTERACTION",
      amountCredits: Number(expectedPrice),
      metadata: { interactionId, customMessage },
    }).catch(() => {});

    return NextResponse.json(
      {
        success: true,
        message: `Interaction purchased successfully! You are Position #${receipt.queuePosition} in the queue.`,
        receipt,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof InteractionNotFoundError) {
      return NextResponse.json({ error: error.message, code: "INTERACTION_NOT_FOUND" }, { status: 404 });
    }
    if (error instanceof InteractionInactiveError) {
      return NextResponse.json({ error: error.message, code: "INTERACTION_INACTIVE" }, { status: 400 });
    }
    if (error instanceof PriceMismatchError) {
      return NextResponse.json(
        {
          error: error.message,
          code: "PRICE_MISMATCH",
          expectedPrice: error.expectedPrice,
          currentPrice: error.currentPrice,
        },
        { status: 409 }
      );
    }
    if (error instanceof IneligibleFanError) {
      return NextResponse.json({ error: error.message, code: "FAN_INELIGIBLE" }, { status: 403 });
    }
    if (error instanceof InsufficientBalanceError) {
      return NextResponse.json(
        {
          error: error.message,
          code: "INSUFFICIENT_BALANCE",
          requiredCredits: error.requiredCredits,
          availableCredits: error.availableCredits,
        },
        { status: 402 }
      );
    }
    if (error instanceof CapacityExceededError) {
      return NextResponse.json({ error: error.message, code: "CAPACITY_EXCEEDED" }, { status: 409 });
    }
    if (error instanceof FanBlockedError) {
      return NextResponse.json({ error: error.message, code: "FAN_BLOCKED" }, { status: 403 });
    }

    return NextResponse.json(
      { error: error.message || "Failed to process interaction purchase." },
      { status: 500 }
    );
  }
}
