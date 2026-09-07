import EventEmitter from "events";
import { redis, redisSubscriber } from "@/lib/redis";
import {
  DomainEvent,
  RealtimeEvent,
  RealtimeEventType,
  StandardEventType,
} from "./types";

export type EventHandler<T = any> = (event: DomainEvent<T>) => void | Promise<void>;
export type TypedEventHandler<T = any> = (event: DomainEvent<T>) => void | Promise<void>;

export interface EventBusMetrics {
  totalPublished: number;
  totalDelivered: number;
  activeChannelSubscribers: number;
  activeTypeSubscribers: number;
  wildcardSubscribers: number;
  redisConnected: boolean;
  publishedByType: Record<string, number>;
}

/**
 * PlatformEventBus
 *
 * High-performance, standardized domain event bus supporting:
 * 1. Strongly typed subscriptions by EventType (`bus.on("GIFT_SENT", handler)`)
 * 2. Channel subscriptions (`bus.subscribe("room:123", handler)`)
 * 3. Scoped subscriptions (`bus.onEventInChannel("GIFT_SENT", "room:123", handler)`)
 * 4. Wildcard listeners (`bus.onAny(handler)`)
 * 5. Error-isolated async dispatch (one failing subscriber never crashes others)
 * 6. Redis Pub/Sub clustering support with instant in-memory fallback
 */
export class PlatformEventBus {
  private emitter: EventEmitter;
  private channelSubscribers: Map<string, Set<EventHandler>> = new Map();
  private typeSubscribers: Map<string, Set<TypedEventHandler>> = new Map();
  private wildcardSubscribers: Set<EventHandler> = new Set();

  private isRedisSubscribed = false;
  private metrics: EventBusMetrics = {
    totalPublished: 0,
    totalDelivered: 0,
    activeChannelSubscribers: 0,
    activeTypeSubscribers: 0,
    wildcardSubscribers: 0,
    redisConnected: false,
    publishedByType: {},
  };

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(500);
    this.initRedisPubSub();
  }

  /**
   * Initializes Redis Pub/Sub integration for horizontal multi-instance syncing.
   */
  private initRedisPubSub(): void {
    if (typeof window !== "undefined") return;

    try {
      if (redisSubscriber && typeof redisSubscriber.subscribe === "function") {
        redisSubscriber.subscribe("platform:events:broadcast", (err) => {
          if (err) {
            // Redis might be unavailable in local test / offline environment
            return;
          }
          this.isRedisSubscribed = true;
          this.metrics.redisConnected = true;
        });

        redisSubscriber.on("message", (channel, message) => {
          if (channel === "platform:events:broadcast") {
            try {
              const parsedEvent: DomainEvent = JSON.parse(message);
              // Dispatch locally without re-publishing to Redis
              this.dispatchLocal(parsedEvent, false);
            } catch (err) {
              console.error("[EventBus] Failed to deserialize Redis event:", err);
            }
          }
        });
      }
    } catch {
      // Graceful fallback for environments where Redis is not configured
    }
  }

  /**
   * Publish an authoritative domain event to a specific channel or global topic.
   */
  public publish<T = unknown>(channel: string, event: RealtimeEvent<T> | DomainEvent<T>): void {
    const timestamp = event.timestamp || Date.now();
    const eventId = (event as any).id || (event as any).payload?.eventId || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const enrichedEvent: DomainEvent<T> = {
      id: eventId,
      type: event.type,
      channel: channel || (event as any).channel || "global",
      timestamp,
      actor: (event as any).actor,
      entityId: (event as any).entityId,
      payload: event.payload as T,
      metadata: (event as any).metadata || {
        source: "authoritative_backend",
        version: "1.0.0",
        idempotencyKey: (event as any).payload?.idempotencyKey,
      },
    };

    // 1. Dispatch locally in-process
    this.dispatchLocal(enrichedEvent, true);
  }

  /**
   * Convenience helper to publish a full DomainEvent object.
   */
  public publishEvent<T = unknown>(event: DomainEvent<T>): void {
    this.publish(event.channel || "global", event);
  }

  /**
   * Internal dispatcher: dispatches to channel listeners, typed listeners, and wildcards.
   */
  private dispatchLocal<T>(event: DomainEvent<T>, broadcastToRedis = true): void {
    this.metrics.totalPublished++;
    this.metrics.publishedByType[event.type] = (this.metrics.publishedByType[event.type] || 0) + 1;

    // 1. Emit on in-process EventEmitter for backwards compatibility
    this.emitter.emit(event.channel, event);
    this.emitter.emit(`type:${event.type}`, event);
    this.emitter.emit(`scoped:${event.type}:${event.channel}`, event);

    // 2. Dispatch to typed subscribers
    const typeHandlers = this.typeSubscribers.get(event.type);
    if (typeHandlers && typeHandlers.size > 0) {
      for (const handler of Array.from(typeHandlers)) {
        this.safeInvoke(handler, event);
      }
    }

    // 3. Dispatch to wildcard subscribers
    if (this.wildcardSubscribers.size > 0) {
      for (const handler of Array.from(this.wildcardSubscribers)) {
        this.safeInvoke(handler, event);
      }
    }

    // 4. Publish to Redis Pub/Sub cluster if enabled
    if (broadcastToRedis && this.isRedisSubscribed && redis && typeof redis.publish === "function") {
      try {
        redis.publish("platform:events:broadcast", JSON.stringify(event)).catch(() => {
          // Non-blocking catch for Redis errors
        });
      } catch {
        // Ignore synchronous Redis publish exceptions
      }
    }
  }

  /**
   * Safe asynchronous invoker with complete error isolation.
   */
  private safeInvoke<T>(handler: EventHandler<T>, event: DomainEvent<T>): void {
    try {
      this.metrics.totalDelivered++;
      const result = handler(event);
      if (result && typeof (result as any).catch === "function") {
        (result as Promise<void>).catch((err) => {
          console.error(`[EventBus] Async subscriber error on event '${event.type}':`, err);
        });
      }
    } catch (syncErr) {
      console.error(`[EventBus] Sync subscriber error on event '${event.type}':`, syncErr);
    }
  }

  /**
   * Subscribe to all events on a specific channel (e.g. `room:123`, `user:456`, `creator:789`).
   */
  public subscribe<T = any>(channel: string, handler: EventHandler<T>): () => void {
    return this.subscribeChannel(channel, handler);
  }

  /**
   * Subscribe to a specific channel. Returns a teardown unsubscribe function.
   */
  public subscribeChannel<T = any>(channel: string, handler: EventHandler<T>): () => void {
    if (!this.channelSubscribers.has(channel)) {
      this.channelSubscribers.set(channel, new Set());
    }
    this.channelSubscribers.get(channel)!.add(handler);
    this.metrics.activeChannelSubscribers++;

    const listener = (event: DomainEvent<T>) => {
      this.safeInvoke(handler, event);
    };

    this.emitter.on(channel, listener);

    return () => {
      this.emitter.off(channel, listener);
      const set = this.channelSubscribers.get(channel);
      if (set) {
        set.delete(handler);
        this.metrics.activeChannelSubscribers--;
        if (set.size === 0) {
          this.channelSubscribers.delete(channel);
        }
      }
    };
  }

  /**
   * Subscribe to a specific standardized domain event type across ALL channels.
   * e.g. `eventBus.on("GIFT_SENT", (event) => { ... })`
   */
  public on<T = any>(
    eventType: RealtimeEventType | StandardEventType,
    handler: TypedEventHandler<T>
  ): () => void {
    if (!this.typeSubscribers.has(eventType)) {
      this.typeSubscribers.set(eventType, new Set());
    }
    this.typeSubscribers.get(eventType)!.add(handler);
    this.metrics.activeTypeSubscribers++;

    return () => {
      const set = this.typeSubscribers.get(eventType);
      if (set) {
        set.delete(handler);
        this.metrics.activeTypeSubscribers--;
        if (set.size === 0) {
          this.typeSubscribers.delete(eventType);
        }
      }
    };
  }

  /**
   * Subscribe to a specific event type within a specific channel.
   * e.g. `eventBus.onEventInChannel("GIFT_SENT", "room:creator_123", handler)`
   */
  public onEventInChannel<T = any>(
    eventType: RealtimeEventType | StandardEventType,
    channel: string,
    handler: TypedEventHandler<T>
  ): () => void {
    const key = `scoped:${eventType}:${channel}`;
    const listener = (event: DomainEvent<T>) => {
      this.safeInvoke(handler, event);
    };

    this.emitter.on(key, listener);

    return () => {
      this.emitter.off(key, listener);
    };
  }

  /**
   * Subscribe to ALL domain events (Wildcard listener for analytics, audit logging, monitoring).
   */
  public onAny(handler: EventHandler): () => void {
    this.wildcardSubscribers.add(handler);
    this.metrics.wildcardSubscribers++;

    return () => {
      this.wildcardSubscribers.delete(handler);
      this.metrics.wildcardSubscribers--;
    };
  }

  /**
   * Get active subscriber count for a specific channel.
   */
  public getSubscriberCount(channel: string): number {
    return this.channelSubscribers.get(channel)?.size || 0;
  }

  /**
   * Get active subscriber count for a specific event type.
   */
  public getTypeSubscriberCount(eventType: string): number {
    return this.typeSubscribers.get(eventType)?.size || 0;
  }

  /**
   * Get telemetry metrics.
   */
  public getMetrics(): EventBusMetrics {
    return {
      ...this.metrics,
      activeChannelSubscribers: Array.from(this.channelSubscribers.values()).reduce((sum, s) => sum + s.size, 0),
      activeTypeSubscribers: Array.from(this.typeSubscribers.values()).reduce((sum, s) => sum + s.size, 0),
      wildcardSubscribers: this.wildcardSubscribers.size,
    };
  }

  /**
   * Reset subscribers (primarily for clean test fixture isolation).
   */
  public resetForTesting(): void {
    this.emitter.removeAllListeners();
    this.channelSubscribers.clear();
    this.typeSubscribers.clear();
    this.wildcardSubscribers.clear();
    this.metrics = {
      totalPublished: 0,
      totalDelivered: 0,
      activeChannelSubscribers: 0,
      activeTypeSubscribers: 0,
      wildcardSubscribers: 0,
      redisConnected: this.isRedisSubscribed,
      publishedByType: {},
    };
  }
}

// Global Singleton for the Next.js process
const globalEventBus = globalThis as unknown as {
  __platformEventBus?: PlatformEventBus;
};

export const eventBus = globalEventBus.__platformEventBus ?? new PlatformEventBus();
export const realtimeEventBus = eventBus;

if (process.env.NODE_ENV !== "production") {
  globalEventBus.__platformEventBus = eventBus;
}

export default eventBus;
