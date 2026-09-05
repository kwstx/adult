import prisma from "@/lib/db";
import { eventBus } from "./event-bus";
import {
  InteractionPurchasedPayload,
  InteractionAcceptedPayload,
} from "./types";

export interface QueueItem {
  id: string;
  creatorId: string;
  senderId: string;
  senderName: string;
  menuItemId: string;
  title: string;
  creditCost: number;
  actionType: string;
  customMessage?: string;
  status: "QUEUED" | "ACCEPTED" | "COMPLETED" | "REJECTED";
  createdAt: string;
}

export class InteractionQueueService {
  // creatorId -> Map<queueId, QueueItem>
  private static creatorQueues: Map<string, Map<string, QueueItem>> = new Map();

  /**
   * Queue a purchased creator interaction item and broadcast to room.
   */
  public static async enqueueInteraction(params: {
    creatorId: string;
    senderId: string;
    senderName: string;
    menuItemId: string;
    title: string;
    creditCost: number;
    actionType: string;
    customMessage?: string;
  }): Promise<QueueItem> {
    const {
      creatorId,
      senderId,
      senderName,
      menuItemId,
      title,
      creditCost,
      actionType,
      customMessage,
    } = params;

    if (!this.creatorQueues.has(creatorId)) {
      this.creatorQueues.set(creatorId, new Map());
    }

    const queueId = `iq_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const queueItem: QueueItem = {
      id: queueId,
      creatorId,
      senderId,
      senderName,
      menuItemId,
      title,
      creditCost,
      actionType,
      customMessage,
      status: "QUEUED",
      createdAt: new Date().toISOString(),
    };

    this.creatorQueues.get(creatorId)!.set(queueId, queueItem);

    // Broadcast INTERACTION_PURCHASED event
    const payload: InteractionPurchasedPayload = {
      queueId,
      creatorId,
      senderId,
      senderName,
      actionItem: {
        id: menuItemId,
        title,
        creditCost,
        actionType,
      },
      customMessage,
      status: "QUEUED",
      purchasedAt: queueItem.createdAt,
    };

    eventBus.publish(`room:${creatorId}`, {
      type: "INTERACTION_PURCHASED",
      payload,
    });

    return queueItem;
  }

  /**
   * Creator accepts or triggers an interaction item from their queue.
   */
  public static async acceptInteraction(params: {
    creatorId: string;
    queueId: string;
    creatorNote?: string;
  }): Promise<QueueItem | null> {
    const { creatorId, queueId, creatorNote } = params;

    const queue = this.creatorQueues.get(creatorId);
    if (!queue || !queue.has(queueId)) return null;

    const item = queue.get(queueId)!;
    item.status = "ACCEPTED";

    // Broadcast INTERACTION_ACCEPTED event
    const payload: InteractionAcceptedPayload = {
      queueId,
      creatorId,
      actionTitle: item.title,
      actionType: item.actionType,
      senderName: item.senderName,
      creatorNote,
      acceptedAt: new Date().toISOString(),
    };

    eventBus.publish(`room:${creatorId}`, {
      type: "INTERACTION_ACCEPTED",
      payload,
    });

    return item;
  }

  /**
   * Get pending interaction queue for a creator.
   */
  public static getCreatorQueue(creatorId: string): QueueItem[] {
    const queue = this.creatorQueues.get(creatorId);
    if (!queue) return [];
    return Array.from(queue.values()).filter((i) => i.status === "QUEUED");
  }
}
