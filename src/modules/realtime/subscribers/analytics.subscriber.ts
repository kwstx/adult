/**
 * Analytics & Telemetry Subscriber
 *
 * Listens across ALL authoritative domain events via wildcard listener (`onAny`)
 * and records normalized operational analytics & recommendation feature signals.
 *
 * Responsibilities:
 * - Decouples analytical logging from the synchronous transactional path
 * - Records event telemetry (Gifts, Messages, Presence, Interactions, Purchases)
 * - Feeds realtime aggregated metrics for discovery and recommendation engines
 */

import { eventBus } from "../event-bus";
import { DomainEvent, AnalyticsEventRecordPayload } from "../types";

export interface AnalyticsAggregates {
  totalEventsProcessed: number;
  eventsByType: Record<string, number>;
  totalGrossCreditsMoved: number;
  activeLiveRooms: Set<string>;
  activeUserSessions: Set<string>;
  recentEvents: AnalyticsEventRecordPayload[];
}

export class AnalyticsSubscriber {
  private static registered = false;
  private static aggregates: AnalyticsAggregates = {
    totalEventsProcessed: 0,
    eventsByType: {},
    totalGrossCreditsMoved: 0,
    activeLiveRooms: new Set(),
    activeUserSessions: new Set(),
    recentEvents: [],
  };

  public static register(): void {
    if (this.registered) return;
    this.registered = true;

    // Wildcard subscription to every single domain event
    eventBus.onAny((event) => {
      this.handleDomainEvent(event);
    });
  }

  private static handleDomainEvent(event: DomainEvent): void {
    this.aggregates.totalEventsProcessed++;
    this.aggregates.eventsByType[event.type] = (this.aggregates.eventsByType[event.type] || 0) + 1;

    let credits: number | null = null;
    let creatorId: string | null = (event.payload as any)?.creatorId || null;
    let userId: string | null =
      (event.payload as any)?.sender?.userId ||
      (event.payload as any)?.senderId ||
      (event.payload as any)?.user?.userId ||
      (event.payload as any)?.userId ||
      (event.payload as any)?.buyerUserId ||
      event.actor?.userId ||
      null;

    if (creatorId) {
      this.aggregates.activeLiveRooms.add(creatorId);
    }
    if (userId) {
      this.aggregates.activeUserSessions.add(userId);
    }

    // Extract credit magnitude for revenue metrics
    if (event.type === "GIFT_SENT") {
      credits = (event.payload as any)?.gift?.creditAmount || 0;
    } else if (event.type === "INTERACTION_PURCHASED") {
      credits = (event.payload as any)?.actionItem?.creditCost || 0;
    } else if (event.type === "CONTENT_PURCHASED") {
      credits = (event.payload as any)?.priceCredits || 0;
    }

    if (credits && credits > 0) {
      this.aggregates.totalGrossCreditsMoved += credits;
    }

    // Ingest into ring-buffer of recent telemetry records
    const record: AnalyticsEventRecordPayload = {
      eventId: event.id,
      eventType: event.type,
      creatorId,
      userId,
      livestreamId: (event.payload as any)?.livestreamId || null,
      amountCredits: credits,
      metadata: {
        channel: event.channel,
        source: event.metadata?.source,
      },
      timestamp: new Date(event.timestamp).toISOString(),
    };

    this.aggregates.recentEvents.push(record);
    if (this.aggregates.recentEvents.length > 200) {
      this.aggregates.recentEvents.shift();
    }
  }

  public static getAggregates(): AnalyticsAggregates {
    return {
      ...this.aggregates,
      activeLiveRooms: new Set(this.aggregates.activeLiveRooms),
      activeUserSessions: new Set(this.aggregates.activeUserSessions),
    };
  }

  public static resetForTesting(): void {
    this.registered = false;
    this.aggregates = {
      totalEventsProcessed: 0,
      eventsByType: {},
      totalGrossCreditsMoved: 0,
      activeLiveRooms: new Set(),
      activeUserSessions: new Set(),
      recentEvents: [],
    };
  }
}
