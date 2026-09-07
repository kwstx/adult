/**
 * Real-Time Event Architecture - Central Registry & Authoritative Dispatcher
 *
 * Bootstraps all decoupled domain subscribers and exposes authoritative event
 * publishing helpers with guaranteed metadata enrichment.
 */

import { eventBus, PlatformEventBus } from "./event-bus";
import {
  DomainEvent,
  RealtimeEventType,
  StandardEventType,
  EventActor,
  DomainEventMetadata,
} from "./types";
import { LiveRoomSubscriber } from "./subscribers/live-room.subscriber";
import { CreatorRevenueSubscriber } from "./subscribers/creator-revenue.subscriber";
import { FanWalletSubscriber } from "./subscribers/fan-wallet.subscriber";
import { LeaderboardSubscriber } from "./subscribers/leaderboard.subscriber";
import { GoalSubscriber } from "./subscribers/goal.subscriber";
import { ProgressionSubscriber } from "./subscribers/progression.subscriber";
import { AnalyticsSubscriber } from "./subscribers/analytics.subscriber";

export interface PublishEventOptions {
  channel?: string;
  actor?: EventActor;
  entityId?: string;
  correlationId?: string;
  causationId?: string;
  source?: string;
}

export class RealtimeEventRegistry {
  private static initialized = false;

  /**
   * Initializes and bootstraps all domain event subscribers.
   * Safe to call multiple times (idempotent).
   */
  public static initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    // 1. Register all domain subscribers
    LiveRoomSubscriber.register();
    CreatorRevenueSubscriber.register();
    FanWalletSubscriber.register();
    LeaderboardSubscriber.register();
    GoalSubscriber.register();
    ProgressionSubscriber.register();
    AnalyticsSubscriber.register();

    if (process.env.NODE_ENV !== "test") {
      console.log("[RealtimeEventRegistry] All 7 real-time domain subscribers initialized successfully.");
    }
  }

  /**
   * Publish an authoritative domain event.
   *
   * Automatically resolves target channel, assigns unique event ID, timestamps,
   * attaches actor and correlation metadata, and notifies all reactive subscribers.
   */
  public static publish<T = unknown>(
    type: RealtimeEventType | StandardEventType,
    payload: T,
    options?: PublishEventOptions
  ): DomainEvent<T> {
    // Ensure subscribers are wired
    this.initialize();

    const timestamp = Date.now();
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Resolve channel intelligently if not provided
    let channel = options?.channel;
    if (!channel) {
      const creatorId = (payload as any)?.creatorId;
      const userId = (payload as any)?.userId || (payload as any)?.buyerUserId || (payload as any)?.sender?.userId;

      if (creatorId) {
        channel = `room:${creatorId}`;
      } else if (userId) {
        channel = `user:${userId}`;
      } else {
        channel = "global";
      }
    }

    const metadata: DomainEventMetadata = {
      source: options?.source || "authoritative_backend",
      version: "1.0.0",
      correlationId: options?.correlationId,
      causationId: options?.causationId,
    };

    const domainEvent: DomainEvent<T> = {
      id: eventId,
      type,
      channel,
      timestamp,
      actor: options?.actor,
      entityId: options?.entityId,
      payload,
      metadata,
    };

    // Publish to the event bus
    eventBus.publish(channel, domainEvent);

    return domainEvent;
  }

  /**
   * Reset all subscribers and caches for isolated unit and integration testing.
   */
  public static resetForTesting(): void {
    this.initialized = false;
    eventBus.resetForTesting();
    LiveRoomSubscriber.resetForTesting();
    CreatorRevenueSubscriber.resetForTesting();
    FanWalletSubscriber.resetForTesting();
    LeaderboardSubscriber.resetForTesting();
    GoalSubscriber.resetForTesting();
    ProgressionSubscriber.resetForTesting();
    AnalyticsSubscriber.resetForTesting();
  }
}

// Automatically bootstrap subscribers on import
RealtimeEventRegistry.initialize();

/**
 * Convenience export for publishing authoritative domain events anywhere in the backend.
 */
export const publishAuthoritativeEvent = RealtimeEventRegistry.publish.bind(RealtimeEventRegistry);
