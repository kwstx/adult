/**
 * Progression & Relationship Subscriber
 *
 * Listens for authoritative fan actions (Gifts, Interactions, PPV Content, Messages)
 * and awards Creator-Fan Relationship XP.
 *
 * Responsibilities:
 * - Computes XP gain (10 XP per credit spent, 5 XP per message)
 * - Detects fan progression tier changes
 * - Emits authoritative `RELATIONSHIP_LEVEL_UP` domain event
 */

import { eventBus } from "../event-bus";
import {
  DomainEvent,
  GiftSentPayload,
  InteractionPurchasedPayload,
  ContentPurchasedPayload,
  MessageCreatedPayload,
  RelationshipLevelUpPayload,
} from "../types";

export interface FanRelationshipProgression {
  creatorId: string;
  fanUserId: string;
  fanDisplayName: string;
  totalXp: number;
  level: number;
  levelTitle: string;
}

export class ProgressionSubscriber {
  private static registered = false;
  private static progressionStore: Map<string, FanRelationshipProgression> = new Map();

  // Level XP Thresholds
  private static LEVEL_THRESHOLDS = [
    { level: 1, minXp: 0, title: "Supporter", perk: "Basic live room badges" },
    { level: 2, minXp: 500, title: "Bronze Supporter", perk: "Bronze badge + Chat color" },
    { level: 3, minXp: 1500, title: "Silver VIP", perk: "Silver badge + Front-row seat access" },
    { level: 4, minXp: 3000, title: "Gold Patron", perk: "Gold badge + Priority interaction menu" },
    { level: 5, minXp: 5000, title: "Diamond Inner Circle", perk: "Diamond 3D avatar highlight + Direct DMs" },
  ];

  public static register(): void {
    if (this.registered) return;
    this.registered = true;

    // 1. React to GIFT_SENT
    eventBus.on<GiftSentPayload>("GIFT_SENT", (event) => {
      const { creatorId, sender, gift } = event.payload;
      const xpGained = gift.creditAmount * 10;
      this.awardXpAndCheckLevelUp(creatorId, sender.userId, sender.displayName, xpGained, event.id);
    });

    // 2. React to INTERACTION_PURCHASED
    eventBus.on<InteractionPurchasedPayload>("INTERACTION_PURCHASED", (event) => {
      const { creatorId, senderId, senderName, actionItem } = event.payload;
      const xpGained = actionItem.creditCost * 10;
      this.awardXpAndCheckLevelUp(creatorId, senderId, senderName, xpGained, event.id);
    });

    // 3. React to CONTENT_PURCHASED
    eventBus.on<ContentPurchasedPayload>("CONTENT_PURCHASED", (event) => {
      const { creatorId, buyerUserId, buyerDisplayName, priceCredits } = event.payload;
      const xpGained = priceCredits * 10;
      this.awardXpAndCheckLevelUp(creatorId, buyerUserId, buyerDisplayName, xpGained, event.id);
    });

    // 4. React to MESSAGE_CREATED
    eventBus.on<MessageCreatedPayload>("MESSAGE_CREATED", (event) => {
      const { creatorId, senderId, senderName, messageType } = event.payload;
      if (messageType !== "SYSTEM_NOTICE" && senderId !== "system") {
        this.awardXpAndCheckLevelUp(creatorId, senderId, senderName, 5, event.id);
      }
    });
  }

  private static awardXpAndCheckLevelUp(
    creatorId: string,
    fanUserId: string,
    fanDisplayName: string,
    xpGained: number,
    sourceEventId: string
  ): void {
    const key = `${creatorId}:${fanUserId}`;
    let record = this.progressionStore.get(key);

    if (!record) {
      record = {
        creatorId,
        fanUserId,
        fanDisplayName,
        totalXp: 0,
        level: 1,
        levelTitle: "Supporter",
      };
      this.progressionStore.set(key, record);
    }

    const previousLevel = record.level;
    record.totalXp += xpGained;

    // Determine new level
    let resolvedTier = this.LEVEL_THRESHOLDS[0];
    for (const tier of this.LEVEL_THRESHOLDS) {
      if (record.totalXp >= tier.minXp) {
        resolvedTier = tier;
      }
    }

    record.level = resolvedTier.level;
    record.levelTitle = resolvedTier.title;

    // Check if leveled up
    if (resolvedTier.level > previousLevel) {
      const payload: RelationshipLevelUpPayload = {
        creatorId,
        fanUserId,
        fanDisplayName,
        previousLevel,
        newLevel: resolvedTier.level,
        levelTitle: resolvedTier.title,
        perkUnlocked: resolvedTier.perk,
        totalXp: record.totalXp,
        xpGained,
        updatedAt: new Date().toISOString(),
      };

      const userChannel = `user:${fanUserId}`;
      const roomChannel = `room:${creatorId}`;

      // Emit to fan private channel
      eventBus.publish(userChannel, {
        id: `lvl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: "RELATIONSHIP_LEVEL_UP",
        channel: userChannel,
        timestamp: Date.now(),
        payload,
        metadata: {
          source: "progression_subscriber",
          version: "1.0.0",
          causationId: sourceEventId,
        },
      });

      // Broadcast celebration banner in room
      eventBus.publish(roomChannel, {
        id: `room_lvl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: "RELATIONSHIP_LEVEL_UP",
        channel: roomChannel,
        timestamp: Date.now(),
        payload,
        metadata: {
          source: "progression_subscriber",
          version: "1.0.0",
          causationId: sourceEventId,
        },
      });
    }
  }

  public static getProgression(creatorId: string, fanUserId: string): FanRelationshipProgression | undefined {
    return this.progressionStore.get(`${creatorId}:${fanUserId}`);
  }

  public static setProgression(creatorId: string, fanUserId: string, initialXp: number): void {
    const key = `${creatorId}:${fanUserId}`;
    let resolvedTier = this.LEVEL_THRESHOLDS[0];
    for (const tier of this.LEVEL_THRESHOLDS) {
      if (initialXp >= tier.minXp) resolvedTier = tier;
    }

    this.progressionStore.set(key, {
      creatorId,
      fanUserId,
      fanDisplayName: "Fan",
      totalXp: initialXp,
      level: resolvedTier.level,
      levelTitle: resolvedTier.title,
    });
  }

  public static resetForTesting(): void {
    this.registered = false;
    this.progressionStore.clear();
  }
}
