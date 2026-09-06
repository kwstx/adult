import type { RecommendationEventType, RawEventPayload } from "./types";

export interface TrackerOptions {
  userId?: string | null;
  sessionId?: string;
  endpointUrl?: string;
  batchIntervalMs?: number;
  maxBatchSize?: number;
}

/**
 * Production-grade Client-Side Event Tracker for the Recommendation Engine
 * Buffers telemetry events, batches network requests, and reliably flushes on unload.
 */
export class RecommendationTracker {
  private userId: string | null = null;
  private sessionId: string;
  private endpointUrl: string;
  private batchIntervalMs: number;
  private maxBatchSize: number;
  private eventQueue: RawEventPayload[] = [];
  private timer: any = null;
  private isInitialized = false;

  constructor(options: TrackerOptions = {}) {
    this.userId = options.userId || null;
    this.sessionId =
      options.sessionId ||
      `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.endpointUrl = options.endpointUrl || "/api/recommendations/events";
    this.batchIntervalMs = options.batchIntervalMs || 3000;
    this.maxBatchSize = options.maxBatchSize || 10;

    if (typeof window !== "undefined") {
      this.initWindowListeners();
    }
  }

  public setUserId(userId: string | null) {
    this.userId = userId;
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  private initWindowListeners() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Flush remaining events before the page unloads
    const handleUnload = () => {
      this.flushImmediate();
    };

    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        this.flushImmediate();
      }
    });
  }

  /**
   * Core enqueue function
   */
  public enqueueEvent(event: RawEventPayload) {
    const enrichedEvent: RawEventPayload = {
      sessionId: this.sessionId,
      userId: event.userId !== undefined ? event.userId : this.userId,
      timestamp: Date.now(),
      ...event,
    };

    this.eventQueue.push(enrichedEvent);

    if (this.eventQueue.length >= this.maxBatchSize) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => {
        this.flush();
      }, this.batchIntervalMs);
    }
  }

  /**
   * Flushes queued events asynchronously via fetch
   */
  public async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.eventQueue.length === 0) return;

    const batchToSend = [...this.eventQueue];
    this.eventQueue = [];

    const payload = JSON.stringify({
      sessionId: this.sessionId,
      userId: this.userId,
      events: batchToSend,
    });

    try {
      await fetch(this.endpointUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });
    } catch (err) {
      console.warn("[Recommendation Tracker Flush Error]:", err);
      // Re-queue events on failure so data isn't lost
      this.eventQueue = [...batchToSend, ...this.eventQueue];
    }
  }

  /**
   * Synchronous / Beacon flush for unmount / unload
   */
  public flushImmediate(): void {
    if (this.eventQueue.length === 0) return;

    const batchToSend = [...this.eventQueue];
    this.eventQueue = [];

    const payload = JSON.stringify({
      sessionId: this.sessionId,
      userId: this.userId,
      events: batchToSend,
    });

    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(this.endpointUrl, blob);
    } else if (typeof fetch !== "undefined") {
      fetch(this.endpointUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  }

  // ==========================================================================
  // CONVENIENCE METHODS FOR THE 15 CORE EVENT TYPES
  // ==========================================================================

  public trackImpression(
    creatorProfileId: string,
    streamId?: string,
    category?: string,
    positionIndex?: number
  ) {
    this.enqueueEvent({
      eventType: "IMPRESSION",
      creatorProfileId,
      livestreamId: streamId,
      category,
      positionIndex,
    });
  }

  public trackSwipe(
    fromCreatorId?: string,
    toCreatorId?: string,
    positionIndex?: number
  ) {
    this.enqueueEvent({
      eventType: "SWIPE",
      creatorProfileId: toCreatorId,
      positionIndex,
      metadata: { fromCreatorId, toCreatorId },
    });
  }

  public trackWatch(
    creatorProfileId: string,
    watchDurationSeconds: number,
    streamId?: string,
    category?: string
  ) {
    this.enqueueEvent({
      eventType: "WATCH",
      creatorProfileId,
      livestreamId: streamId,
      watchDurationSeconds,
      dwellTimeMs: watchDurationSeconds * 1000,
      category,
    });
  }

  public trackExit(
    creatorProfileId: string,
    dwellTimeMs: number,
    streamId?: string
  ) {
    this.enqueueEvent({
      eventType: "EXIT",
      creatorProfileId,
      livestreamId: streamId,
      dwellTimeMs,
      watchDurationSeconds: Math.round(dwellTimeMs / 1000),
    });
  }

  public trackFollow(creatorProfileId: string, category?: string) {
    this.enqueueEvent({
      eventType: "FOLLOW",
      creatorProfileId,
      category,
    });
  }

  public trackUnfollow(creatorProfileId: string) {
    this.enqueueEvent({
      eventType: "UNFOLLOW",
      creatorProfileId,
    });
  }

  public trackLike(creatorProfileId: string, streamId?: string) {
    this.enqueueEvent({
      eventType: "LIKE",
      creatorProfileId,
      livestreamId: streamId,
    });
  }

  public trackChat(
    creatorProfileId: string,
    streamId?: string,
    messageLength?: number
  ) {
    this.enqueueEvent({
      eventType: "CHAT",
      creatorProfileId,
      livestreamId: streamId,
      metadata: { messageLength },
    });
  }

  public trackGift(
    creatorProfileId: string,
    amountCredits: number,
    streamId?: string,
    giftName?: string
  ) {
    this.enqueueEvent({
      eventType: "GIFT",
      creatorProfileId,
      livestreamId: streamId,
      amountCredits,
      metadata: { giftName },
    });
  }

  public trackInteraction(
    creatorProfileId: string,
    actionType: string,
    amountCredits = 0,
    streamId?: string
  ) {
    this.enqueueEvent({
      eventType: "INTERACTION",
      creatorProfileId,
      livestreamId: streamId,
      amountCredits,
      metadata: { actionType },
    });
  }

  public trackSubscription(
    creatorProfileId: string,
    tier = "VIP",
    amountCredits = 200
  ) {
    this.enqueueEvent({
      eventType: "SUBSCRIPTION",
      creatorProfileId,
      amountCredits,
      metadata: { tier },
    });
  }

  public trackContentPurchase(
    creatorProfileId: string,
    contentId: string,
    amountCredits: number
  ) {
    this.enqueueEvent({
      eventType: "CONTENT_PURCHASE",
      creatorProfileId,
      contentId,
      amountCredits,
    });
  }

  public trackPrivateSession(
    creatorProfileId: string,
    durationMinutes: number,
    amountCredits: number
  ) {
    this.enqueueEvent({
      eventType: "PRIVATE_SESSION",
      creatorProfileId,
      amountCredits,
      metadata: { durationMinutes },
    });
  }

  public trackSearch(searchQuery: string, category?: string) {
    this.enqueueEvent({
      eventType: "SEARCH",
      searchQuery,
      category,
    });
  }

  public trackCreatorProfileView(creatorProfileId: string) {
    this.enqueueEvent({
      eventType: "CREATOR_PROFILE_VIEW",
      creatorProfileId,
    });
  }
}

// Global singleton instance for easy client-wide usage
export const defaultTracker = new RecommendationTracker();
