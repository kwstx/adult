import { NextRequest, NextResponse } from "next/server";
import { InteractionService } from "@/modules/interaction/interaction.service";
import { CreateInteractionInput } from "@/types/interaction";

export const dynamic = "force-dynamic";

/**
 * GET /api/creators/[creatorId]/interactions
 * Fetch all active interaction configurations for the creator live room.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await context.params;
    const interactions = await InteractionService.getActiveInteractions(creatorId);
    return NextResponse.json({ success: true, interactions });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch interactions." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/creators/[creatorId]/interactions
 * Validates the creator configuration, activates the interaction,
 * and tells all viewers in real-time: "New interaction available"
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await context.params;
    const body = await req.json();

    const input: CreateInteractionInput = {
      type: body.type,
      name: body.name,
      description: body.description,
      price: Number(body.price),
      duration: Number(body.duration),
      quantity: body.quantity !== undefined && body.quantity !== null && body.quantity !== "" ? Number(body.quantity) : null,
      whoCanPurchase: body.whoCanPurchase || "ALL",
      requiresAcceptance: Boolean(body.requiresAcceptance),
      entersQueue: body.entersQueue !== undefined ? Boolean(body.entersQueue) : true,
      icon: body.icon,
    };

    // 1. Authoritative Backend Validation
    const validation = InteractionService.validateInteractionConfiguration(input);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.errors,
        },
        { status: 422 }
      );
    }

    // 2. Persist, Activate, and Broadcast Real-Time "New interaction available" Event
    const result = await InteractionService.createAndPublishInteraction({
      creatorProfileId: creatorId,
      input,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Interaction published and active. Real-time broadcast sent to room viewers.",
        interaction: result.interaction,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to publish interaction." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/creators/[creatorId]/interactions
 * Toggle active state or update stock.
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await context.params;
    const body = await req.json();
    const { interactionId, action } = body;

    if (!interactionId) {
      return NextResponse.json({ error: "Missing interactionId" }, { status: 400 });
    }

    if (action === "TOGGLE_ACTIVE") {
      const updated = InteractionService.toggleInteractionActive(creatorId, interactionId);
      return NextResponse.json({ success: true, interaction: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update interaction." },
      { status: 500 }
    );
  }
}
