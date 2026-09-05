import { NextRequest, NextResponse } from "next/server";
import { InteractionQueueService } from "@/modules/realtime/interaction-queue.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/realtime/[creatorId]/interaction
 * Fetch pending interaction queue items for the room.
 *
 * POST /api/realtime/[creatorId]/interaction
 * Creator accepts or fan purchases an interaction menu item.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ creatorId: string }> }
) {
  const { creatorId } = await context.params;
  const queue = InteractionQueueService.getCreatorQueue(creatorId);
  return NextResponse.json(queue);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await context.params;
    const body = await req.json();
    const { action } = body;

    if (action === "ACCEPT") {
      const { queueId, creatorNote } = body;
      if (!queueId) {
        return NextResponse.json({ error: "Missing queueId." }, { status: 400 });
      }

      const updated = await InteractionQueueService.acceptInteraction({
        creatorId,
        queueId,
        creatorNote,
      });

      if (!updated) {
        return NextResponse.json({ error: "Interaction item not found." }, { status: 404 });
      }

      return NextResponse.json({ success: true, item: updated });
    }

    if (action === "PURCHASE") {
      const {
        senderId,
        senderName,
        menuItemId,
        title,
        creditCost,
        actionType,
        customMessage,
      } = body;

      if (!senderId || !menuItemId || !creditCost) {
        return NextResponse.json(
          { error: "Missing required fields for interaction purchase." },
          { status: 400 }
        );
      }

      const item = await InteractionQueueService.enqueueInteraction({
        creatorId,
        senderId,
        senderName: senderName || "Fan",
        menuItemId,
        title: title || "Custom Interaction",
        creditCost: Number(creditCost),
        actionType: actionType || "CUSTOM",
        customMessage,
      });

      return NextResponse.json({ success: true, item });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Interaction operation failed." },
      { status: 500 }
    );
  }
}
