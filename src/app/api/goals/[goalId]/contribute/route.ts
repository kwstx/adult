import { NextRequest, NextResponse } from "next/server";
import { CollectiveGoalService } from "@/modules/goals/collective-goal.service";
import { InsufficientFundsError, WalletSuspendedError } from "@/modules/economic/wallet-ledger.service";

export const dynamic = "force-dynamic";

/**
 * POST /api/goals/[goalId]/contribute
 * Authoritative endpoint for fan contributions to a collective goal.
 *
 * Execution Steps:
 * 1. Fan contributes (e.g. 5,000 tokens).
 * 2. Backend executes atomic double-entry ledger deduction.
 * 3. Goal aggregate increments atomically.
 * 4. Real-time events (GOAL_UPDATED / GOAL_CONTRIBUTION_RECEIVED) broadcast to room.
 * 5. If threshold crossed:
 *    - Backend marks goal REACHED.
 *    - Predetermined unlock is generated.
 *    - GOAL_COMPLETED event is broadcasted to the entire room.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ goalId: string }> }
) {
  try {
    const { goalId } = await context.params;
    const body = await req.json();
    const { fanUserId, credits, message, isAnonymous } = body;

    if (!fanUserId || !credits) {
      return NextResponse.json(
        { error: "Missing required fields: fanUserId and credits." },
        { status: 400 }
      );
    }

    const idempotencyKey = req.headers.get("x-idempotency-key") || undefined;

    const result = await CollectiveGoalService.contributeToGoal({
      fanUserId,
      goalId,
      credits: Number(credits),
      message,
      isAnonymous: Boolean(isAnonymous),
      idempotencyKey,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Goal contribution error:", error);

    if (error instanceof InsufficientFundsError || error.name === "InsufficientFundsError") {
      return NextResponse.json(
        {
          error: error.message,
          code: "INSUFFICIENT_CREDITS",
          required: error.requiredCredits,
          available: error.availableCredits,
        },
        { status: 402 }
      );
    }

    if (error instanceof WalletSuspendedError || error.name === "WalletSuspendedError") {
      return NextResponse.json(
        { error: error.message, code: "WALLET_SUSPENDED" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to process goal contribution." },
      { status: 500 }
    );
  }
}
