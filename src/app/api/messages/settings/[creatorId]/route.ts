import { NextRequest, NextResponse } from "next/server";
import { PaidMessagingService } from "@/modules/messaging/paid-messaging.service";

/**
 * GET /api/messages/settings/[creatorId]
 * Fetches creator messaging configuration and optional fan pricing eligibility.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await context.params;
    const { searchParams } = new URL(req.url);
    const fanUserId = searchParams.get("fanUserId");

    const settings = await PaidMessagingService.getCreatorSettings(creatorId);

    let eligibility = undefined;
    if (fanUserId) {
      eligibility = await PaidMessagingService.validateMessageEligibility(
        fanUserId,
        creatorId
      );
    }

    return NextResponse.json({
      success: true,
      settings,
      eligibility,
    });
  } catch (error: any) {
    console.error("Fetch creator messaging settings error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch messaging settings." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/messages/settings/[creatorId]
 * Allows the creator to configure whether incoming messages are free or paid.
 */
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await context.params;
    const body = await req.json();

    const updated = await PaidMessagingService.updateCreatorSettings(creatorId, {
      paidMessagesEnabled: body.paidMessagesEnabled,
      messagePriceCredits: body.messagePriceCredits !== undefined ? Number(body.messagePriceCredits) : undefined,
      allowFreeSubscribers: body.allowFreeSubscribers,
      allowFreeVip: body.allowFreeVip,
      customWelcomeMessage: body.customWelcomeMessage,
    });

    return NextResponse.json({
      success: true,
      settings: updated,
      message: "Messaging settings updated successfully.",
    });
  } catch (error: any) {
    console.error("Update creator messaging settings error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update messaging settings." },
      { status: 500 }
    );
  }
}
