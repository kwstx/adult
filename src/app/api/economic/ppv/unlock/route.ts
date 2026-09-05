import { NextRequest, NextResponse } from "next/server";
import { LedgerService } from "@/modules/economic/ledger.service";

/**
 * POST /api/economic/ppv/unlock
 * Backend-authoritative PPV purchase endpoint.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fanUserId, ppvContentId } = body;

    if (!fanUserId || !ppvContentId) {
      return NextResponse.json(
        { error: "fanUserId and ppvContentId are required." },
        { status: 400 }
      );
    }

    const result = await LedgerService.unlockPPVContent(fanUserId, ppvContentId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("PPV Unlock failed:", error);
    if (error.name === "InsufficientCreditsError") {
      return NextResponse.json(
        { error: error.message, code: "INSUFFICIENT_CREDITS" },
        { status: 402 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to unlock PPV content." },
      { status: 500 }
    );
  }
}
