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
import { authenticateUser } from "@/lib/api-handler";
import { Validator, vString } from "@/lib/validator";

export const dynamic = "force-dynamic";

/**
 * POST /api/creators/[creatorId]/interactions/purchase
 * Authoritative Backend Verification & Interaction Purchasing Endpoint.
 *
 * Enforces Zero-Trust Architecture:
 * 1. User ID -> Derived strictly from authenticated session token.
 * 2. Price -> Server looks up interaction 123 and determines actual configured price.
 * 3. Creator ID -> Validated against interaction record.
 * 4. Balance -> Debited from authoritative wallet ledger.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await context.params;

    // 1. Authoritative User Extraction (Auth Token / Session)
    const authenticatedUser = await authenticateUser(req, { optional: false });
    const fanUserId = authenticatedUser!.id;
    const fanDisplayName = authenticatedUser!.displayName || authenticatedUser!.username;

    // 2. Zero-Trust Body Parsing (Strips client price and client user ID assertions)
    const body = await Validator.validateZeroTrustBody(req, {
      interactionId: vString({ required: true }),
      customMessage: vString({ max: 500 }),
      idempotencyKey: vString(),
    });

    const receipt = await InteractionPurchaseService.purchaseInteraction({
      creatorId,
      interactionId: body.interactionId!,
      ignoreClientPrice: true, // Ignore client-sent price, use authoritative server price
      fanUserId,
      fanDisplayName,
      customMessage: body.customMessage,
      idempotencyKey: body.idempotencyKey,
    });

    // Record recommendation telemetry event asynchronously
    recordRecommendationEvent({
      userId: fanUserId,
      creatorProfileId: creatorId,
      eventType: "INTERACTION",
      amountCredits: receipt.priceCredits,
      metadata: { interactionId: body.interactionId, customMessage: body.customMessage },
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
      { status: error.statusCode || 500 }
    );
  }
}
