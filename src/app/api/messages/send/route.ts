import { NextRequest, NextResponse } from "next/server";
import { PaidMessagingService } from "@/modules/messaging/paid-messaging.service";

/**
 * POST /api/messages/send
 * Backend-Authoritative Paid & Direct Messaging Endpoint
 *
 * Requirements enforced:
 * 1. Validates creator's pricing configuration (free vs. paid message rules).
 * 2. Validates exemptions (Subscribers, VIPs) and credit requirements.
 * 3. Enforces sufficient balance and executes atomic double-entry wallet debit/credit with platform rake.
 * 4. Grants message its paid status upon successful wallet transaction.
 * 5. Stores message in database conversation history.
 * 6. Delivers instantly via Real-time event bus.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      senderId,
      creatorId,
      body: messageText,
      mediaUrl,
      attachedCredits = 0,
      isPaidMessage = false,
      idempotencyKey,
    } = body;

    if (!senderId || !creatorId) {
      return NextResponse.json(
        { error: "Missing required fields: senderId and creatorId." },
        { status: 400 }
      );
    }

    if (!messageText?.trim() && !mediaUrl) {
      return NextResponse.json(
        { error: "A message body or media attachment must be provided." },
        { status: 400 }
      );
    }

    const result = await PaidMessagingService.sendPaidMessage({
      senderId,
      creatorId,
      body: messageText?.trim() || "",
      mediaUrl: mediaUrl || null,
      attachedCredits: Number(attachedCredits) || 0,
      isPaidMessage: Boolean(isPaidMessage),
      idempotencyKey,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("Message dispatch error:", error);

    if (error.name === "InsufficientFundsError" || error.name === "InsufficientCreditsError") {
      return NextResponse.json(
        {
          error: error.message,
          code: "INSUFFICIENT_CREDITS",
          requiredCredits: error.requiredCredits,
          availableCredits: error.availableCredits,
        },
        { status: 402 }
      );
    }

    if (error.name === "WalletSuspendedError") {
      return NextResponse.json(
        { error: error.message, code: "WALLET_SUSPENDED" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to deliver message." },
      { status: 500 }
    );
  }
}
