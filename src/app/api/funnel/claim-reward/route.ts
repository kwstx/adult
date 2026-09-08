import { NextRequest, NextResponse } from "next/server";
import { FirstSessionService } from "@/modules/funnel/first-session.service";

/**
 * POST /api/funnel/claim-reward
 * Authoritatively claims the 50 Free Bonus Credits & 100 Platform XP
 * First-Session Welcome Drop into the fan's double-entry wallet.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, creatorProfileId } = body;

    if (!userId) {
      return NextResponse.json({ error: "Missing required field: userId" }, { status: 400 });
    }

    const idempotencyKey =
      req.headers.get("x-idempotency-key") || `claim_welcome_${userId}_${Date.now()}`;

    const result = await FirstSessionService.claimWelcomeReward({
      userId,
      creatorProfileId,
      idempotencyKey,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Funnel API] Error claiming welcome reward:", error);
    return NextResponse.json(
      { error: error.message || "Failed to claim welcome reward." },
      { status: 500 }
    );
  }
}
