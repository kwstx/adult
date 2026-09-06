import EventEmitter from "events";
import { RealtimeEvent } from "./types";

type EventHandler = (event: RealtimeEvent) => void;

class PlatformEventBus {
  private emitter: EventEmitter;
  private subscribers: Map<string, Set<EventHandler>> = new Map();

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(200);
  }

  /**
   * Broadcast an event to a specific channel (e.g. `room:c12345` or `global`).
   */
  public publish(channel: string, event: RealtimeEvent): void {
    const enrichedEvent: RealtimeEvent = {
      ...event,
      channel,
      timestamp: Date.now(),
    };

    // Emit on local node event bus
    this.emitter.emit(channel, enrichedEvent);

    // If connected to Redis in multi-instance cluster, also publish to Redis
    // (ioredis instance can be wired here if REDIS_URL is active)
  }

  /**
   * Subscribe a client or SSE connection to a channel.
   * Returns an unsubscribe teardown function.
   */
  public subscribe(channel: string, handler: EventHandler): () => void {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
    }
    this.subscribers.get(channel)!.add(handler);

    const listener = (event: RealtimeEvent) => {
      handler(event);
    };

    this.emitter.on(channel, listener);

    return () => {
      this.emitter.off(channel, listener);
      const set = this.subscribers.get(channel);
      if (set) {
        set.delete(handler);
        if (set.size === 0) {
          this.subscribers.delete(channel);
        }
      }
    };
  }

  /**
   * Get active subscriber count for telemetry
   */
  public getSubscriberCount(channel: string): number {
    return this.subscribers.get(channel)?.size || 0;
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
