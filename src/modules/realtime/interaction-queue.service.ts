import prisma from "@/lib/db";
import { eventBus } from "./event-bus";
import {
  InteractionQueue,
  QueueItem,
  QueueItemData,
  QueueItemStatus,
  QueueItemFan,
  QueueItemInteraction,
  QueueItemPrice,
} from "@/modules/queue/interaction-queue.model";
import { WalletLedgerService } from "@/modules/economic/wallet-ledger.service";

// Initial seed queue for realistic stream environment (#1 and #2 already in queue)
const INITIAL_SEED_QUEUE_DATA: QueueItemData[] = [
  {
    id: "iq_seed_1",
    creatorId: "creator_maya",
    fan: {
      id: "fan_marcus",
      username: "marcus_cyber",
      displayName: "Marcus Neon ⚡",
      avatarUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
      fanLevel: 6,
      relationshipTier: "SUPERFAN",
      isVip: false,
      isSubscriber: true,
    },
    interaction: {
      id: "int_seed_2",
      title: "Wheel of Fortune Spin 🎡",
      description: "Spin the live interactive mystery prize wheel",
      actionType: "Visual",
      customMessage: "Spin for neon prize! ✨",
      durationSeconds: 15,
    },
    price: {
      amountCredits: 250,
      fiatEquivalentCents: 2000,
      platformFeeCredits: 50,
      creatorNetCredits: 200,
    },
    purchaseTime: new Date(Date.now() - 300000).toISOString(),
    position: 1,
    status: "ACCEPTED",
    creatorDecision: {
      decision: "ACCEPTED",
      decidedAt: new Date(Date.now() - 240000).toISOString(),
      creatorNote: "Ready to spin!",
    },
    potentialRefundState: {
      isRefunded: false,
      refundStatus: "NONE",
    },
    createdAt: new Date(Date.now() - 300000).toISOString(),
    updatedAt: new Date(Date.now() - 240000).toISOString(),
  },
  {
    id: "iq_seed_2",
    creatorId: "creator_maya",
    fan: {
      id: "fan_elena",
      username: "elena_v",
      displayName: "Elena Velvet 🌸",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      fanLevel: 3,
      relationshipTier: "SUPPORTER",
      isVip: false,
      isSubscriber: false,
    },
    interaction: {
      id: "int_seed_1",
      title: "Mini Freestyle Dance 💃",
      description: "30-second live custom dance performance on stream",
      actionType: "Request",
      customMessage: "Play some cyber bass!",
      durationSeconds: 30,
    },
    price: {
      amountCredits: 100,
      fiatEquivalentCents: 800,
      platformFeeCredits: 20,
      creatorNetCredits: 80,
    },
    purchaseTime: new Date(Date.now() - 120000).toISOString(),
    position: 2,
    status: "PENDING",
    creatorDecision: {
      decision: "PENDING",
    },
    potentialRefundState: {
      isRefunded: false,
      refundStatus: "NONE",
    },
    createdAt: new Date(Date.now() - 120000).toISOString(),
    updatedAt: new Date(Date.now() - 120000).toISOString(),
  },
];

export class InteractionQueueService {
  // Map of creatorId -> InteractionQueue instance
  private static creatorQueues: Map<string, InteractionQueue> = new Map();

  public static getOrInitQueue(creatorId: string): InteractionQueue {
    if (!this.creatorQueues.has(creatorId)) {
      let initialItems: QueueItemData[] = [];
      if (creatorId === "creator_maya" || creatorId === "mayavelvet") {
        initialItems = INITIAL_SEED_QUEUE_DATA.map((item) => ({ ...item, creatorId }));
      }
      const queue = new InteractionQueue(creatorId, initialItems);
      this.creatorQueues.set(creatorId, queue);
    }
    return this.creatorQueues.get(creatorId)!;
  }

  /**
   * Enqueue newly purchased interaction into creator's authoritative queue object.
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
    fanLevel?: number;
    relationshipTier?: string;
    isVip?: boolean;
    isSubscriber?: boolean;
    livestreamId?: string;
  }): Promise<QueueItemData> {
    const {
      creatorId,
      senderId,
      senderName,
      senderAvatar = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      menuItemId,
      title,
      creditCost,
      actionType,
      customMessage,
      durationSeconds = 30,
      fanLevel = 1,
      relationshipTier = "SUPPORTER",
      isVip = false,
      isSubscriber = false,
      livestreamId,
    } = params;

    const queue = this.getOrInitQueue(creatorId);

    const platformFee = Math.floor(creditCost * 0.2);
    const creatorNet = creditCost - platformFee;

    const fan: QueueItemFan = {
      id: senderId,
      username: senderName.toLowerCase().replace(/[^a-z0-9_]/g, ""),
      displayName: senderName,
      avatarUrl: senderAvatar,
      fanLevel,
      relationshipTier,
      isVip,
      isSubscriber,
    };

    const interaction: QueueItemInteraction = {
      id: menuItemId,
      title,
      actionType,
      durationSeconds,
      customMessage,
    };

    const price: QueueItemPrice = {
      amountCredits: creditCost,
      fiatEquivalentCents: creditCost * 8, // $0.08 per credit
      platformFeeCredits: platformFee,
      creatorNetCredits: creatorNet,
    };

    const queueItem = queue.enqueue({
      fan,
      interaction,
      price,
      livestreamId,
    });

    const itemData = queueItem.toJSON();

    // Mirror to alias if creator_maya
    if (creatorId === "creator_maya" || creatorId === "mayavelvet") {
      const alias = creatorId === "creator_maya" ? "mayavelvet" : "creator_maya";
      const aliasQueue = this.getOrInitQueue(alias);
      aliasQueue.enqueue({ fan, interaction, price, livestreamId });
    }

    // Broadcast state machine event to room
    eventBus.publish(`room:${creatorId}`, {
      type: "INTERACTION_PURCHASED",
      payload: {
        queueId: itemData.id,
        creatorId,
        senderId,
        senderName,
        senderAvatar,
        actionItem: {
          id: menuItemId,
          title,
          creditCost,
          actionType,
        },
        customMessage,
        queuePosition: itemData.position,
        durationSeconds,
        status: itemData.status,
        purchasedAt: itemData.purchaseTime,
        queueItem: itemData,
      },
    });

    eventBus.publish(`room:${creatorId}`, {
      type: "QUEUE_STATE_CHANGED",
      payload: {
        creatorId,
        action: "ENQUEUE",
        item: itemData,
        activeCount: queue.getActiveItems().length,
      },
    });

    return itemData;
  }

  /**
   * Creator transitions item: PENDING -> ACCEPTED
   */
  public static async acceptInteraction(params: {
    creatorId: string;
    queueId: string;
    creatorNote?: string;
  }): Promise<QueueItemData | null> {
    const { creatorId, queueId, creatorNote } = params;
    const queue = this.getOrInitQueue(creatorId);

    try {
      const item = queue.accept(queueId, creatorNote);
      const itemData = item.toJSON();

      eventBus.publish(`room:${creatorId}`, {
        type: "INTERACTION_ACCEPTED",
        payload: {
          queueId,
          creatorId,
          actionTitle: item.interaction.title,
          actionType: item.interaction.actionType,
          senderName: item.fan.displayName,
          creatorNote,
          acceptedAt: item.creatorDecision.decidedAt,
          queueItem: itemData,
        },
      });

      eventBus.publish(`room:${creatorId}`, {
        type: "QUEUE_STATE_CHANGED",
        payload: {
          creatorId,
          action: "ACCEPT",
          item: itemData,
        },
      });

      return itemData;
    } catch {
      return null;
    }
  }

  /**
   * Creator transitions item: ACCEPTED -> IN_PROGRESS
   */
  public static async startProgressInteraction(creatorId: string, queueId: string): Promise<QueueItemData | null> {
    const queue = this.getOrInitQueue(creatorId);
    try {
      const item = queue.startProgress(queueId);
      const itemData = item.toJSON();

      eventBus.publish(`room:${creatorId}`, {
        type: "INTERACTION_STARTED",
        payload: {
          queueId,
          creatorId,
          actionTitle: item.interaction.title,
          senderName: item.fan.displayName,
          startedAt: item.startTime,
          durationSeconds: item.interaction.durationSeconds,
          queueItem: itemData,
        },
      });

      eventBus.publish(`room:${creatorId}`, {
        type: "QUEUE_STATE_CHANGED",
        payload: {
          creatorId,
          action: "START_PROGRESS",
          item: itemData,
        },
      });

      return itemData;
    } catch {
      return null;
    }
  }

  /**
   * Creator transitions item: IN_PROGRESS -> COMPLETED
   */
  public static async completeInteraction(creatorId: string, queueId: string): Promise<QueueItemData | null> {
    const queue = this.getOrInitQueue(creatorId);
    try {
      const item = queue.complete(queueId);
      const itemData = item.toJSON();

      eventBus.publish(`room:${creatorId}`, {
        type: "INTERACTION_COMPLETED",
        payload: {
          queueId,
          creatorId,
          actionTitle: item.interaction.title,
          senderName: item.fan.displayName,
          completedAt: item.completionTime,
          credits: item.price.amountCredits,
          queueItem: itemData,
        },
      });

      eventBus.publish(`room:${creatorId}`, {
        type: "QUEUE_STATE_CHANGED",
        payload: {
          creatorId,
          action: "COMPLETE",
          item: itemData,
        },
      });

      return itemData;
    } catch {
      return null;
    }
  }

  /**
   * Creator transitions item: PENDING / ACCEPTED -> REJECTED (Triggers authoritative financial refund)
   */
  public static async rejectInteraction(params: {
    creatorId: string;
    queueId: string;
    reason: string;
  }): Promise<QueueItemData | null> {
    const { creatorId, queueId, reason } = params;
    const queue = this.getOrInitQueue(creatorId);
    const existing = queue.getItem(queueId);
    if (!existing) return null;

    // Process refund on wallet ledger
    const refundTxId = `ref_rej_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    await this.processFinancialRefund({
      fanUserId: existing.fan.id,
      creatorId,
      credits: existing.price.amountCredits,
      reason: `Interaction rejected: ${reason}`,
      refundTxId,
    });

    try {
      const item = queue.reject(queueId, reason, refundTxId);
      const itemData = item.toJSON();

      eventBus.publish(`room:${creatorId}`, {
        type: "INTERACTION_REJECTED",
        payload: {
          queueId,
          creatorId,
          senderId: item.fan.id,
          senderName: item.fan.displayName,
          actionTitle: item.interaction.title,
          reason,
          refundTxId,
          refundAmountCredits: item.price.amountCredits,
          queueItem: itemData,
        },
      });

      eventBus.publish(`room:${creatorId}`, {
        type: "QUEUE_STATE_CHANGED",
        payload: {
          creatorId,
          action: "REJECT",
          item: itemData,
        },
      });

      return itemData;
    } catch {
      return null;
    }
  }

  /**
   * Creator / Fan / System cancels item (Triggers authoritative financial refund)
   */
  public static async cancelInteraction(params: {
    creatorId: string;
    queueId: string;
    reason: string;
    actor?: "CREATOR" | "FAN" | "SYSTEM";
  }): Promise<QueueItemData | null> {
    const { creatorId, queueId, reason, actor = "CREATOR" } = params;
    const queue = this.getOrInitQueue(creatorId);
    const existing = queue.getItem(queueId);
    if (!existing) return null;

    const refundTxId = `ref_can_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    await this.processFinancialRefund({
      fanUserId: existing.fan.id,
      creatorId,
      credits: existing.price.amountCredits,
      reason: `Interaction cancelled by ${actor}: ${reason}`,
      refundTxId,
    });

    try {
      const item = queue.cancel(queueId, reason, actor, refundTxId);
      const itemData = item.toJSON();

      eventBus.publish(`room:${creatorId}`, {
        type: "INTERACTION_CANCELLED",
        payload: {
          queueId,
          creatorId,
          senderId: item.fan.id,
          senderName: item.fan.displayName,
          actionTitle: item.interaction.title,
          actor,
          reason,
          refundTxId,
          refundAmountCredits: item.price.amountCredits,
          queueItem: itemData,
        },
      });

      eventBus.publish(`room:${creatorId}`, {
        type: "QUEUE_STATE_CHANGED",
        payload: {
          creatorId,
          action: "CANCEL",
          item: itemData,
        },
      });

      return itemData;
    } catch {
      return null;
    }
  }

  /**
   * Creator / Mod direct refund (Triggers authoritative financial refund)
   */
  public static async refundInteraction(params: {
    creatorId: string;
    queueId: string;
    reason: string;
    partialCredits?: number;
  }): Promise<QueueItemData | null> {
    const { creatorId, queueId, reason, partialCredits } = params;
    const queue = this.getOrInitQueue(creatorId);
    const existing = queue.getItem(queueId);
    if (!existing) return null;

    const refundAmount = partialCredits !== undefined ? partialCredits : existing.price.amountCredits;
    const refundTxId = `ref_dir_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    await this.processFinancialRefund({
      fanUserId: existing.fan.id,
      creatorId,
      credits: refundAmount,
      reason: `Direct refund: ${reason}`,
      refundTxId,
    });

    try {
      const item = queue.refund(queueId, reason, refundTxId, refundAmount);
      const itemData = item.toJSON();

      eventBus.publish(`room:${creatorId}`, {
        type: "INTERACTION_REFUNDED",
        payload: {
          queueId,
          creatorId,
          senderId: item.fan.id,
          senderName: item.fan.displayName,
          actionTitle: item.interaction.title,
          reason,
          refundTxId,
          refundAmountCredits: refundAmount,
          queueItem: itemData,
        },
      });

      eventBus.publish(`room:${creatorId}`, {
        type: "QUEUE_STATE_CHANGED",
        payload: {
          creatorId,
          action: "REFUND",
          item: itemData,
        },
      });

      return itemData;
    } catch {
      return null;
    }
  }

  /**
   * Financial refund executor across ledger & database.
   */
  private static async processFinancialRefund(params: {
    fanUserId: string;
    creatorId: string;
    credits: number;
    reason: string;
    refundTxId: string;
  }): Promise<void> {
    const { fanUserId, creatorId, credits, reason, refundTxId } = params;

    // Database persistence if available
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost:5432")) {
      try {
        await prisma.$transaction(async (tx: any) => {
          const fanWallet = await tx.wallet.findUnique({ where: { userId: fanUserId } });
          if (fanWallet) {
            await tx.wallet.update({
              where: { id: fanWallet.id },
              data: {
                balance: { increment: credits },
                lifetimeSpentCredits: { decrement: BigInt(credits) },
              },
            });

            await tx.walletTransaction.create({
              data: {
                id: refundTxId,
                destinationWalletId: fanWallet.id,
                transactionType: "REFUND",
                direction: "CREDIT",
                amountCredits: credits,
                idempotencyKey: refundTxId,
                status: "COMPLETED",
                note: reason,
              },
            });
          }
        }).catch(() => null);
      } catch {
        // Safe fallback
      }
    }
  }

  /**
   * Get active queue items for a creator.
   */
  public static getCreatorQueue(creatorId: string): QueueItemData[] {
    const queue = this.getOrInitQueue(creatorId);
    return queue.getActiveItems();
  }

  /**
   * Get all items (including history) for a creator.
   */
  public static getAllCreatorItems(creatorId: string): QueueItemData[] {
    const queue = this.getOrInitQueue(creatorId);
    return queue.getAllItems();
  }

  /**
   * Get specific queue item by queueId.
   */
  public static getQueueItem(creatorId: string, queueId: string): QueueItemData | null {
    const queue = this.getOrInitQueue(creatorId);
    const item = queue.getItem(queueId);
    return item ? item.toJSON() : null;
  }
}
