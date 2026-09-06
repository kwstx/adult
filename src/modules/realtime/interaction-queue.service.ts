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
  senderAvatar?: string;
  menuItemId: string;
  title: string;
  creditCost: number;
  actionType: string;
  customMessage?: string;
  durationSeconds?: number;
  queuePosition: number;
  status: "QUEUED" | "ACCEPTED" | "EXECUTING" | "COMPLETED" | "SKIPPED" | "REJECTED";
  createdAt: string;
}

// Initial seed queue for realistic stream environment (#1 and #2 already in queue)
const INITIAL_SEED_QUEUE: QueueItem[] = [
  {
    id: "iq_seed_1",
    creatorId: "creator_maya",
    senderId: "fan_marcus",
    senderName: "Marcus Neon ⚡",
    senderAvatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
    menuItemId: "int_seed_2",
    title: "Wheel of Fortune Spin 🎡",
    creditCost: 250,
    actionType: "Visual",
    customMessage: "Spin for neon prize! ✨",
    durationSeconds: 15,
    queuePosition: 1,
    status: "QUEUED",
    createdAt: new Date(Date.now() - 300000).toISOString(),
  },
  {
    id: "iq_seed_2",
    creatorId: "creator_maya",
    senderId: "fan_elena",
    senderName: "Elena Velvet 🌸",
    senderAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    menuItemId: "int_seed_1",
    title: "Mini Freestyle Dance 💃",
    creditCost: 100,
    actionType: "Request",
    customMessage: "Play some cyber bass!",
    durationSeconds: 30,
    queuePosition: 2,
    status: "QUEUED",
    createdAt: new Date(Date.now() - 120000).toISOString(),
  },
];

export class InteractionQueueService {
  // creatorId -> Map<queueId, QueueItem>
  private static creatorQueues: Map<string, Map<string, QueueItem>> = new Map();

  private static getOrInitQueue(creatorId: string): Map<string, QueueItem> {
    if (!this.creatorQueues.has(creatorId)) {
      const initialMap = new Map<string, QueueItem>();
      if (creatorId === "creator_maya" || creatorId === "mayavelvet") {
        for (const item of INITIAL_SEED_QUEUE) {
          initialMap.set(item.id, { ...item, creatorId });
        }
      }
      this.creatorQueues.set(creatorId, initialMap);
    }
    return this.creatorQueues.get(creatorId)!;
  }

  /**
   * Calculate exact 1-based queue position for the next incoming item.
   */
  public static getNextQueuePosition(creatorId: string): number {
    const queue = this.getOrInitQueue(creatorId);
    const activeItems = Array.from(queue.values()).filter(
      (i) => i.status === "QUEUED" || i.status === "EXECUTING"
    );
    return activeItems.length + 1;
  }

  /**
   * Queue a purchased creator interaction item and broadcast to room.
   */
  public static async enqueueInteraction(params: {
    creatorId: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    menuItemId: string;
    title: string;
    creditCost: number;
    actionType: string;
    customMessage?: string;
    durationSeconds?: number;
  }): Promise<QueueItem> {
    const {
      creatorId,
      senderId,
      senderName,
      senderAvatar,
      menuItemId,
      title,
      creditCost,
      actionType,
      customMessage,
      durationSeconds = 30,
    } = params;

    const queue = this.getOrInitQueue(creatorId);
    const queuePosition = this.getNextQueuePosition(creatorId);

    const queueId = `iq_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const queueItem: QueueItem = {
      id: queueId,
      creatorId,
      senderId,
      senderName,
      senderAvatar:
        senderAvatar ||
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      menuItemId,
      title,
      creditCost,
      actionType,
      customMessage,
      durationSeconds,
      queuePosition,
      status: "QUEUED",
      createdAt: new Date().toISOString(),
    };

    queue.set(queueId, queueItem);

    // If this is creator_maya, also sync alias mayavelvet
    if (creatorId === "creator_maya" || creatorId === "mayavelvet") {
      const alias = creatorId === "creator_maya" ? "mayavelvet" : "creator_maya";
      const aliasQueue = this.getOrInitQueue(alias);
      aliasQueue.set(queueId, { ...queueItem, creatorId: alias });
    }

    // Broadcast INTERACTION_PURCHASED event to all connected room viewers and creator
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

    // Extended event payload for creator control room
    const extendedPayload = {
      ...payload,
      queuePosition,
      senderAvatar: queueItem.senderAvatar,
      durationSeconds,
    };

    eventBus.publish(`room:${creatorId}`, {
      type: "INTERACTION_PURCHASED",
      payload: extendedPayload,
    });

    // Also send system announcement in chat: "Alex — Ask me anything — 100 credits"
    eventBus.publish(`room:${creatorId}`, {
      type: "CHAT_MESSAGE",
      payload: {
        id: `chat_int_${Date.now()}`,
        senderId,
        senderName,
        senderAvatar: queueItem.senderAvatar,
        fanLevel: 14,
        relationshipTier: "ROYAL_PATRON",
        isVip: true,
        isSubscriber: true,
        isModerator: false,
        text: `✨ Purchased "${title}" (${creditCost} credits) — Position #${queuePosition} in queue!`,
        tipCredits: creditCost,
        timestamp: "Just now",
      },
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

    const queue = this.getOrInitQueue(creatorId);
    if (!queue.has(queueId)) return null;

    const item = queue.get(queueId)!;
    item.status = "EXECUTING";

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
   * Creator completes an interaction item.
   */
  public static async completeInteraction(creatorId: string, queueId: string): Promise<boolean> {
    const queue = this.getOrInitQueue(creatorId);
    if (!queue.has(queueId)) return false;

    const item = queue.get(queueId)!;
    item.status = "COMPLETED";
    return true;
  }

  /**
   * Get pending interaction queue for a creator.
   */
  public static getCreatorQueue(creatorId: string): QueueItem[] {
    const queue = this.getOrInitQueue(creatorId);
    return Array.from(queue.values()).filter(
      (i) => i.status === "QUEUED" || i.status === "EXECUTING"
    );
  }

  /**
   * Get specific queue item by queueId.
   */
  public static getQueueItem(creatorId: string, queueId: string): QueueItem | null {
    const queue = this.getOrInitQueue(creatorId);
    return queue.get(queueId) || null;
  }
}
