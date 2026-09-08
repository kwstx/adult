// ============================================================================
// BACKEND EVENT FUNNEL PIPELINE SERVICE
// Ingestion, Domain Event Mapping & Analytical Buffering for the 16 Stages
// ============================================================================

import { eventBus } from "@/modules/realtime/event-bus";
import { DomainEvent } from "@/modules/realtime/types";
import { FunnelEventPayload, FunnelEventType, FUNNEL_STAGES } from "./types";
import { redis } from "@/lib/redis";
import { recordRecommendationEvent } from "@/lib/recommendations/event-collector";

export class EventFunnelPipeline {
  private static registered = false;
  private static inMemoryEvents: FunnelEventPayload[] = [];
  private static readonly MAX_BUFFER_SIZE = 50000;
  private static persistToDb = true;

  public static setPersistToDb(enabled: boolean): void {
    this.persistToDb = enabled;
  }

  /**
   * Initializes real-time domain event listeners.
   */
  public static initialize(): void {
    if (this.registered) return;
    this.registered = true;

    eventBus.onAny((event: DomainEvent) => {
      this.ingestFromDomainEvent(event);
    });

    console.log("[EventFunnelPipeline] 🚀 16-Stage Backend Event Funnel initialized.");
  }

  /**
   * Ingests a funnel event explicitly.
   */
  public static async trackEvent(event: FunnelEventPayload): Promise<void> {
    const stageDef = FUNNEL_STAGES.find((s) => s.stage === event.eventType);
    const enrichedEvent: FunnelEventPayload = {
      ...event,
      eventId: event.eventId || `fevt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      stageIndex: stageDef ? stageDef.stageIndex : 0,
      timestamp: event.timestamp || new Date().toISOString(),
    };

    // 1. In-memory circular buffer for ultra-fast OLAP queries
    this.inMemoryEvents.push(enrichedEvent);
    if (this.inMemoryEvents.length > this.MAX_BUFFER_SIZE) {
      this.inMemoryEvents.shift();
    }

    // 2. Stream to Redis stream if connected
    if (redis && redis.status === "ready") {
      redis.xadd(
        "funnel:events:stream",
        "*",
        "stage",
        enrichedEvent.eventType,
        "payload",
        JSON.stringify(enrichedEvent)
      ).catch(() => {});
    }

    // 3. Asynchronously record into recommendationEvents table if enabled
    if (this.persistToDb) {
      let recEventType: any = "IMPRESSION";
      if (event.eventType === "LIVE_ENTERED" || event.eventType === "WATCH_STARTED") recEventType = "WATCH";
      if (event.eventType === "CREATOR_FOLLOWED") recEventType = "FOLLOW";
      if (event.eventType === "INTERACTION_MENU_OPENED" || event.eventType === "INTERACTION_VIEWED") recEventType = "INTERACTION";
      if (event.eventType === "PURCHASE_COMPLETED") recEventType = "GIFT";

      recordRecommendationEvent({
        sessionId: event.sessionId || `session_${event.userId || "anon"}`,
        userId: event.userId,
        creatorProfileId: event.creatorProfileId,
        livestreamId: event.livestreamId,
        eventType: recEventType,
        watchDurationSeconds: event.durationSeconds || 0,
        amountCredits: event.amountCredits,
        metadata: {
          funnelStage: event.eventType,
          stageIndex: enrichedEvent.stageIndex,
          ...event.metadata,
        },
      }).catch(() => {});
    }
  }

  /**
   * Automatically maps domain events into the 16 funnel stages.
   */
  public static ingestFromDomainEvent(event: DomainEvent): void {
    const payload = (event.payload as any) || {};
    const timestamp = event.timestamp || Date.now();

    switch (event.type) {
      case "USER_JOINED":
        this.trackEvent({
          eventType: "LIVE_ENTERED",
          userId: payload.userId,
          creatorProfileId: payload.creatorProfileId || payload.creatorId,
          livestreamId: payload.livestreamId,
          timestamp,
        });
        break;

      case "USER_LEFT":
        this.trackEvent({
          eventType: "LIVE_EXITED",
          userId: payload.userId,
          creatorProfileId: payload.creatorProfileId || payload.creatorId,
          livestreamId: payload.livestreamId,
          durationSeconds: payload.watchDurationSeconds || 0,
          timestamp,
        });
        break;

      case "GIFT_SENT":
      case "INTERACTION_PURCHASED":
        this.trackEvent({
          eventType: "PURCHASE_COMPLETED",
          userId: payload.fanUserId || payload.userId,
          creatorProfileId: payload.creatorProfileId || payload.creatorId,
          livestreamId: payload.livestreamId,
          amountCredits: payload.gift?.creditAmount || payload.actionItem?.creditCost || payload.credits || 50,
          timestamp,
        });
        this.trackEvent({
          eventType: "XP_EARNED",
          userId: payload.fanUserId || payload.userId,
          creatorProfileId: payload.creatorProfileId || payload.creatorId,
          xpAwarded: (payload.credits || 50) * 10,
          timestamp,
        });
        break;

      case "RELATIONSHIP_LEVEL_UP":
        this.trackEvent({
          eventType: "RELATIONSHIP_LEVEL_UP",
          userId: payload.fanId || payload.userId,
          creatorProfileId: payload.creatorProfileId,
          metadata: {
            newLevel: payload.newLevel,
            newTier: payload.newTier,
          },
          timestamp,
        });
        break;
    }
  }

  /**
   * Retrieves raw events matching query filters.
   */
  public static getRawEvents(filter?: {
    creatorProfileId?: string;
    startDate?: Date;
    endDate?: Date;
  }): FunnelEventPayload[] {
    let result = [...this.inMemoryEvents];

    if (filter?.creatorProfileId) {
      result = result.filter((e) => !e.creatorProfileId || e.creatorProfileId === filter.creatorProfileId);
    }

    if (filter?.startDate) {
      const startMs = filter.startDate.getTime();
      result = result.filter((e) => new Date(e.timestamp || 0).getTime() >= startMs);
    }

    if (filter?.endDate) {
      const endMs = filter.endDate.getTime();
      result = result.filter((e) => new Date(e.timestamp || 0).getTime() <= endMs);
    }

    return result;
  }

  /**
   * Clears buffer for clean testing.
   */
  public static resetForTesting(): void {
    this.inMemoryEvents = [];
    this.registered = false;
  }
}
