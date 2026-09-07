/**
 * Creator Revenue Subscriber
 *
 * Listens for authoritative monetizable domain events (Gifts, Interactions, PPV Content)
 * and updates the Creator Operating System / Streamer HUD in real-time.
 *
 * Responsibilities:
 * - Aggregates stream session gross credits, net earnings (80%), and platform rake
 * - Streams live revenue ticker events to private creator channel `creator:<creatorId>`
 * - Eliminates polling on creator dashboard analytics
 */

import { eventBus } from "../event-bus";
import {
  DomainEvent,
  GiftSentPayload,
  InteractionPurchasedPayload,
  ContentPurchasedPayload,
  CreatorRevenueUpdatePayload,
} from "../types";

export interface CreatorSessionRevenue {
  creatorId: string;
  totalGrossCredits: number;
  totalNetCredits: number;
  totalPlatformRakeCredits: number;
  giftCount: number;
  interactionCount: number;
  contentSaleCount: number;
  lastUpdated: number;
}

export class CreatorRevenueSubscriber {
  private static registered = false;
  private static revenueCache: Map<string, CreatorSessionRevenue> = new Map();
  private static readonly PLATFORM_RAKE_RATE = 0.20; // 20% platform rake

  public static register(): void {
    if (this.registered) return;
    this.registered = true;

    // 1. React to GIFT_SENT
    eventBus.on<GiftSentPayload>("GIFT_SENT", (event) => {
      this.handleGiftSent(event);
    });

    // 2. React to INTERACTION_PURCHASED
    eventBus.on<InteractionPurchasedPayload>("INTERACTION_PURCHASED", (event) => {
      this.handleInteractionPurchased(event);
    });

    // 3. React to CONTENT_PURCHASED
    eventBus.on<ContentPurchasedPayload>("CONTENT_PURCHASED", (event) => {
      this.handleContentPurchased(event);
    });
  }

  private static handleGiftSent(event: DomainEvent<GiftSentPayload>): void {
    const { creatorId, gift, creatorEarningsDelta } = event.payload;
    const gross = creatorEarningsDelta?.grossCredits ?? gift.creditAmount;
    const net = creatorEarningsDelta?.netCredits ?? Math.floor(gross * (1 - this.PLATFORM_RAKE_RATE));
    const rake = creatorEarningsDelta?.platformRakeCredits ?? (gross - net);

    const revenue = this.getOrCreateRevenue(creatorId);
    revenue.totalGrossCredits += gross;
    revenue.totalNetCredits += net;
    revenue.totalPlatformRakeCredits += rake;
    revenue.giftCount += 1;
    revenue.lastUpdated = Date.now();

    this.broadcastToCreatorHUD(creatorId, {
      creatorId,
      eventType: "GIFT_SENT",
      grossCredits: gross,
      netCredits: net,
      platformRakeCredits: rake,
      totalSessionCredits: revenue.totalNetCredits,
      sourceEventId: event.id,
      timestamp: new Date().toISOString(),
    });
  }

  private static handleInteractionPurchased(event: DomainEvent<InteractionPurchasedPayload>): void {
    const { creatorId, actionItem } = event.payload;
    const gross = actionItem.creditCost;
    const net = Math.floor(gross * (1 - this.PLATFORM_RAKE_RATE));
    const rake = gross - net;

    const revenue = this.getOrCreateRevenue(creatorId);
    revenue.totalGrossCredits += gross;
    revenue.totalNetCredits += net;
    revenue.totalPlatformRakeCredits += rake;
    revenue.interactionCount += 1;
    revenue.lastUpdated = Date.now();

    this.broadcastToCreatorHUD(creatorId, {
      creatorId,
      eventType: "INTERACTION_PURCHASED",
      grossCredits: gross,
      netCredits: net,
      platformRakeCredits: rake,
      totalSessionCredits: revenue.totalNetCredits,
      sourceEventId: event.id,
      timestamp: new Date().toISOString(),
    });
  }

  private static handleContentPurchased(event: DomainEvent<ContentPurchasedPayload>): void {
    const { creatorId, priceCredits } = event.payload;
    const gross = priceCredits;
    const net = Math.floor(gross * (1 - this.PLATFORM_RAKE_RATE));
    const rake = gross - net;

    const revenue = this.getOrCreateRevenue(creatorId);
    revenue.totalGrossCredits += gross;
    revenue.totalNetCredits += net;
    revenue.totalPlatformRakeCredits += rake;
    revenue.contentSaleCount += 1;
    revenue.lastUpdated = Date.now();

    this.broadcastToCreatorHUD(creatorId, {
      creatorId,
      eventType: "CONTENT_PURCHASED",
      grossCredits: gross,
      netCredits: net,
      platformRakeCredits: rake,
      totalSessionCredits: revenue.totalNetCredits,
      sourceEventId: event.id,
      timestamp: new Date().toISOString(),
    });
  }

  private static broadcastToCreatorHUD(creatorId: string, payload: CreatorRevenueUpdatePayload): void {
    const creatorChannel = `creator:${creatorId}`;
    eventBus.publish(creatorChannel, {
      id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: "ROOM_STATUS",
      channel: creatorChannel,
      timestamp: Date.now(),
      payload: {
        type: "REVENUE_TICKER_UPDATE",
        ...payload,
      },
      metadata: {
        source: "creator_revenue_subscriber",
        version: "1.0.0",
      },
    });
  }

  private static getOrCreateRevenue(creatorId: string): CreatorSessionRevenue {
    if (!this.revenueCache.has(creatorId)) {
      this.revenueCache.set(creatorId, {
        creatorId,
        totalGrossCredits: 0,
        totalNetCredits: 0,
        totalPlatformRakeCredits: 0,
        giftCount: 0,
        interactionCount: 0,
        contentSaleCount: 0,
        lastUpdated: Date.now(),
      });
    }
    return this.revenueCache.get(creatorId)!;
  }

  public static getSessionRevenue(creatorId: string): CreatorSessionRevenue {
    return this.getOrCreateRevenue(creatorId);
  }

  public static resetForTesting(): void {
    this.registered = false;
    this.revenueCache.clear();
  }
}
