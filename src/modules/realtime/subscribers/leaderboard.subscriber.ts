/**
 * Leaderboard Subscriber
 *
 * Listens for authoritative contribution events (Gifts, Paid Interactions)
 * and updates live room rankings via Redis Sorted Sets (ZSET) or memory store.
 *
 * Responsibilities:
 * - Incrementally updates room scores in O(log N) time
 * - Formats top 10 contributor standings
 * - Emits authoritative `LEADERBOARD_UPDATED` domain event
 */

import { eventBus } from "../event-bus";
import { LeaderboardService } from "../leaderboard.service";
import {
  DomainEvent,
  GiftSentPayload,
  InteractionPurchasedPayload,
} from "../types";

export class LeaderboardSubscriber {
  private static registered = false;

  public static register(): void {
    if (this.registered) return;
    this.registered = true;

    // 1. React to GIFT_SENT
    eventBus.on<GiftSentPayload>("GIFT_SENT", async (event) => {
      await this.handleGiftSent(event);
    });

    // 2. React to INTERACTION_PURCHASED
    eventBus.on<InteractionPurchasedPayload>("INTERACTION_PURCHASED", async (event) => {
      await this.handleInteractionPurchased(event);
    });
  }

  private static async handleGiftSent(event: DomainEvent<GiftSentPayload>): Promise<void> {
    const { creatorId, sender, gift } = event.payload;

    try {
      await LeaderboardService.recordContribution({
        creatorId,
        userId: sender.userId,
        username: sender.username,
        displayName: sender.displayName,
        avatarUrl: sender.avatarUrl,
        badge: sender.badge,
        credits: gift.creditAmount,
      });
    } catch (err) {
      console.error("[LeaderboardSubscriber] Failed to record gift contribution:", err);
    }
  }

  private static async handleInteractionPurchased(
    event: DomainEvent<InteractionPurchasedPayload>
  ): Promise<void> {
    const { creatorId, senderId, senderName, senderUsername, senderAvatarUrl, senderBadge, actionItem } =
      event.payload;

    try {
      await LeaderboardService.recordContribution({
        creatorId,
        userId: senderId,
        username: senderUsername || senderName.toLowerCase().replace(/\s+/g, ""),
        displayName: senderName,
        avatarUrl: senderAvatarUrl,
        badge: senderBadge,
        credits: actionItem.creditCost,
      });
    } catch (err) {
      console.error("[LeaderboardSubscriber] Failed to record interaction contribution:", err);
    }
  }

  public static resetForTesting(): void {
    this.registered = false;
    LeaderboardService.resetForTesting();
  }
}
