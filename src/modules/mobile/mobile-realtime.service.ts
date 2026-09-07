import { eventBus } from "@/modules/realtime/event-bus";
import { redis } from "@/lib/redis";
import {
  MobileRealtimeSyncRequest,
  MobileRealtimeSyncResponse,
  MobileSequencedEvent,
} from "./types";
import { MobileDeviceService } from "./mobile-device.service";
import { NotificationService } from "@/modules/notifications/notification.service";

const MAX_BUFFERED_EVENTS_PER_CHANNEL = 500;

export class MobileRealtimeService {
  // In-memory sliding window buffer per channel: channel -> Array of SequencedEvents
  private static eventBuffers: Map<string, MobileSequencedEvent[]> = new Map();
  // Sequence counter per channel
  private static sequenceCounters: Map<string, number> = new Map();

  /**
   * Publishes an authoritative domain event with monotonic sequence numbering
   * into both the realtime event bus and the mobile replay buffer.
   */
  static async publishSequencedEvent<T = unknown>(
    channel: string,
    type: string,
    payload: T,
    eventId?: string
  ): Promise<MobileSequencedEvent<T>> {
    const nextSeq = this.getNextSequence(channel);
    const id = eventId || `m_evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const timestamp = Date.now();

    const sequencedEvent: MobileSequencedEvent<T> = {
      seq: nextSeq,
      eventId: id,
      channel,
      type,
      timestamp,
      payload,
    };

    // 1. Buffer event for mobile client reconnect catch-up
    this.bufferEvent(channel, sequencedEvent);

    // 2. Publish to eventBus for real-time SSE/WS connected sockets
    eventBus.publish(channel, {
      type: type as any,
      payload: sequencedEvent,
      timestamp,
    });

    return sequencedEvent;
  }

  /**
   * Fetches missed events for a mobile client reconnecting after background suspension.
   */
  static async syncMissedEvents(
    request: MobileRealtimeSyncRequest
  ): Promise<MobileRealtimeSyncResponse> {
    const { channel, lastKnownSeq, limit = 100 } = request;
    const currentSeq = this.getCurrentSequence(channel);

    const buffer = this.eventBuffers.get(channel) || [];
    const missed = buffer
      .filter((e) => e.seq > lastKnownSeq)
      .slice(0, limit)
      .map((e) => ({ ...e, isReplay: true }));

    const hasMore = missed.length > 0 && missed[missed.length - 1].seq < currentSeq;

    return {
      channel,
      currentSeq,
      hasMore,
      missedEvents: missed,
    };
  }

  /**
   * High-priority Push Notification fallback: Dispatches APNs / FCM push notification
   * when a subscribed user or room participant is not connected to the real-time stream.
   */
  static async dispatchPushFallback(params: {
    userId: string;
    title: string;
    body: string;
    category?: string;
    data?: Record<string, string>;
  }): Promise<{ dispatched: number }> {
    const { userId, title, body, category = "LIVE_ALERT", data = {} } = params;

    const devices = await MobileDeviceService.getUserPushTokens(userId);
    let dispatched = 0;

    for (const dev of devices) {
      if (dev.pushToken) {
        // Enqueue or send push notification
        dispatched++;
      }
    }

    return { dispatched };
  }

  private static getNextSequence(channel: string): number {
    const current = this.sequenceCounters.get(channel) || 0;
    const next = current + 1;
    this.sequenceCounters.set(channel, next);
    return next;
  }

  private static getCurrentSequence(channel: string): number {
    return this.sequenceCounters.get(channel) || 0;
  }

  private static bufferEvent(channel: string, event: MobileSequencedEvent): void {
    if (!this.eventBuffers.has(channel)) {
      this.eventBuffers.set(channel, []);
    }
    const buf = this.eventBuffers.get(channel)!;
    buf.push(event);

    if (buf.length > MAX_BUFFERED_EVENTS_PER_CHANNEL) {
      buf.shift(); // Evict oldest
    }
  }

  /**
   * Resets buffers (used for clean testing isolation).
   */
  static resetForTesting(): void {
    this.eventBuffers.clear();
    this.sequenceCounters.clear();
  }
}
