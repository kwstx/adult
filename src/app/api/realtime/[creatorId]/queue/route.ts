import { NextRequest, NextResponse } from "next/server";
import { InteractionQueueService } from "@/modules/realtime/interaction-queue.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/realtime/[creatorId]/queue
 * Fetch authoritative Queue backend object representation for a creator stream.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await context.params;
    const activeItems = InteractionQueueService.getCreatorQueue(creatorId);
    const allItems = InteractionQueueService.getAllCreatorItems(creatorId);

    return NextResponse.json({
      success: true,
      creatorId,
      queue: {
        activeCount: activeItems.length,
        totalCount: allItems.length,
        activeItems,
        historyItems: allItems.filter(
          (i) => i.status !== "PENDING" && i.status !== "ACCEPTED" && i.status !== "IN_PROGRESS"
        ),
        executingItem: activeItems.find((i) => i.status === "IN_PROGRESS") || null,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch interaction queue." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/realtime/[creatorId]/queue
 * Dispatch state machine actions to the authoritative Queue backend object.
 *
 * Supported Actions:
 * - ACCEPT: { action: "ACCEPT", queueId: string, creatorNote?: string }
 * - START_PROGRESS: { action: "START_PROGRESS", queueId: string }
 * - COMPLETE: { action: "COMPLETE", queueId: string }
 * - REJECT: { action: "REJECT", queueId: string, reason: string }
 * - CANCEL: { action: "CANCEL", queueId: string, reason: string, actor?: "CREATOR" | "FAN" }
 * - REFUND: { action: "REFUND", queueId: string, reason: string, partialCredits?: number }
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await context.params;
    const body = await req.json();
    const { action, queueId } = body;

    if (!action) {
      return NextResponse.json({ error: "Missing required field: action." }, { status: 400 });
    }

    if (!queueId) {
      return NextResponse.json({ error: "Missing required field: queueId." }, { status: 400 });
    }

    switch (action) {
      case "ACCEPT": {
        const item = await InteractionQueueService.acceptInteraction({
          creatorId,
          queueId,
          creatorNote: body.creatorNote,
        });
        if (!item) {
          return NextResponse.json({ error: "Failed to accept queue item or item not found." }, { status: 400 });
        }
        return NextResponse.json({ success: true, action: "ACCEPT", item });
      }

      case "START_PROGRESS": {
        const item = await InteractionQueueService.startProgressInteraction(creatorId, queueId);
        if (!item) {
          return NextResponse.json({ error: "Failed to start progress on queue item." }, { status: 400 });
        }
        return NextResponse.json({ success: true, action: "START_PROGRESS", item });
      }

      case "COMPLETE": {
        const item = await InteractionQueueService.completeInteraction(creatorId, queueId);
        if (!item) {
          return NextResponse.json({ error: "Failed to complete queue item." }, { status: 400 });
        }
        return NextResponse.json({ success: true, action: "COMPLETE", item });
      }

      case "REJECT": {
        const reason = body.reason || "Creator declined the interaction request.";
        const item = await InteractionQueueService.rejectInteraction({
          creatorId,
          queueId,
          reason,
        });
        if (!item) {
          return NextResponse.json({ error: "Failed to reject queue item." }, { status: 400 });
        }
        return NextResponse.json({
          success: true,
          action: "REJECT",
          item,
          refund: item.potentialRefundState,
        });
      }

      case "CANCEL": {
        const reason = body.reason || "Cancelled before fulfillment.";
        const actor = body.actor || "CREATOR";
        const item = await InteractionQueueService.cancelInteraction({
          creatorId,
          queueId,
          reason,
          actor,
        });
        if (!item) {
          return NextResponse.json({ error: "Failed to cancel queue item." }, { status: 400 });
        }
        return NextResponse.json({
          success: true,
          action: "CANCEL",
          item,
          refund: item.potentialRefundState,
        });
      }

      case "REFUND": {
        const reason = body.reason || "Direct refund issued by creator.";
        const partialCredits = body.partialCredits ? Number(body.partialCredits) : undefined;
        const item = await InteractionQueueService.refundInteraction({
          creatorId,
          queueId,
          reason,
          partialCredits,
        });
        if (!item) {
          return NextResponse.json({ error: "Failed to refund queue item." }, { status: 400 });
        }
        return NextResponse.json({
          success: true,
          action: "REFUND",
          item,
          refund: item.potentialRefundState,
        });
      }

      default:
        return NextResponse.json({ error: `Unknown queue action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to execute queue state transition." },
      { status: 500 }
    );
  }
}
