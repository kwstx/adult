/**
 * Authoritative Behavioral Event Stream Service
 *
 * Central event pipeline that translates high-level user actions into typed domain events
 * and fans them out to the 8 decoupled downstream engines:
 * 1. Analytics
 * 2. Notifications
 * 3. Recommendations
 * 4. Leaderboards
 * 5. XP & Progression
 * 6. Creator CRM
 * 7. Fraud Detection
 * 8. Creator Analytics
 */

import { eventBus } from "@/modules/realtime/event-bus";
import {
  BehavioralEventType,
  BehavioralEventEnvelope,
  UserJoinedLivePayload,
  UserFollowedCreatorPayload,
  UserBoughtContentPayload,
  UserSentGiftPayload,
  GoalProgressedPayload,
  LevelIncreasedPayload,
  SessionBookedPayload,
  EventStreamMetrics,
  EventActor,
} from "./types";
import { NotificationHubSubscriber } from "./subscribers/notification-hub.subscriber";
import { RecommendationHubSubscriber } from "./subscribers/recommendation-hub.subscriber";
import { CreatorCrmHubSubscriber } from "./subscribers/crm-hub.subscriber";
import { FraudHubSubscriber } from "./subscribers/fraud-hub.subscriber";
import { CreatorAnalyticsHubSubscriber } from "./subscribers/creator-analytics-hub.subscriber";
import { StructuredLogger } from "@/core/observability";

const MAX_RECENT_EVENTS = 100;
const recentEventsBuffer: BehavioralEventEnvelope[] = [];
let totalEventsEmitted = 0;
const eventsByTypeCounter: Record<string, number> = {};

export class EventStreamService {
  private static isInitialized = false;

  /**
   * Initializes and wires all 8 downstream event consumer engines.
   */
  public static initialize(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Register all specialized event hub subscribers
    NotificationHubSubscriber.register();
    RecommendationHubSubscriber.register();
    CreatorCrmHubSubscriber.register();
    FraudHubSubscriber.register();
    CreatorAnalyticsHubSubscriber.register();

    StructuredLogger.info("EventStreamService: All 8 Downstream Event Consumer Engines Initialized");
  }

  /**
   * Generic Behavioral Event Dispatcher
   */
  public static emit<T = any>(
    type: BehavioralEventType,
    payload: T,
    options: {
      actor: EventActor;
      creatorProfileId?: string | null;
      livestreamId?: string | null;
      entityId?: string | null;
      channel?: string;
      idempotencyKey?: string;
    }
  ): BehavioralEventEnvelope<T> {
    this.initialize();

    const timestamp = Date.now();
    const id = `evt_${timestamp}_${Math.random().toString(36).substring(2, 9)}`;
    const channel = options.channel || (options.livestreamId ? `room:${options.livestreamId}` : options.creatorProfileId ? `creator:${options.creatorProfileId}` : `user:${options.actor.userId}`);

    const envelope: BehavioralEventEnvelope<T> = {
      id,
      type,
      channel,
      timestamp,
      actor: options.actor,
      creatorProfileId: options.creatorProfileId,
      livestreamId: options.livestreamId,
      entityId: options.entityId,
      payload,
      metadata: {
        source: "behavioral_event_stream",
        version: "1.0.0",
        idempotencyKey: options.idempotencyKey,
      },
    };

    // 1. Maintain in-memory metrics and circular buffer
    totalEventsEmitted++;
    eventsByTypeCounter[type] = (eventsByTypeCounter[type] || 0) + 1;
    recentEventsBuffer.unshift(envelope);
    if (recentEventsBuffer.length > MAX_RECENT_EVENTS) {
      recentEventsBuffer.pop();
    }

    // 2. Structured Log
    StructuredLogger.info(`Event Stream: [${type}] Emitted`, {
      eventId: id,
      type,
      userId: options.actor.userId,
      creatorProfileId: options.creatorProfileId || undefined,
      channel,
    });

    // 3. Dispatch to Reactive Event Bus (Fans out to all 8 engines & Redis)
    eventBus.publish(channel, {
      id,
      type: type as any,
      channel,
      timestamp,
      actor: options.actor,
      entityId: options.entityId || undefined,
      payload,
      metadata: envelope.metadata,
    });

    return envelope;
  }

  // --------------------------------------------------------------------------
  // SPECIFIC BEHAVIORAL EMITTERS
  // --------------------------------------------------------------------------

  /** 1. User Joined Live */
  public static emitUserJoinedLive(
    payload: UserJoinedLivePayload,
    actor: EventActor
  ): BehavioralEventEnvelope<UserJoinedLivePayload> {
    return this.emit("USER_JOINED_LIVE", payload, {
      actor,
      creatorProfileId: payload.creatorProfileId,
      livestreamId: payload.livestreamId,
      entityId: payload.livestreamId,
    });
  }

  /** 2. User Followed Creator */
  public static emitUserFollowedCreator(
    payload: UserFollowedCreatorPayload,
    actor: EventActor
  ): BehavioralEventEnvelope<UserFollowedCreatorPayload> {
    return this.emit("USER_FOLLOWED_CREATOR", payload, {
      actor,
      creatorProfileId: payload.creatorProfileId,
      entityId: payload.creatorProfileId,
    });
  }

  /** 3. User Bought Content (PPV) */
  public static emitUserBoughtContent(
    payload: UserBoughtContentPayload,
    actor: EventActor
  ): BehavioralEventEnvelope<UserBoughtContentPayload> {
    return this.emit("USER_BOUGHT_CONTENT", payload, {
      actor,
      creatorProfileId: payload.creatorProfileId,
      entityId: payload.contentId,
      idempotencyKey: payload.orderId,
    });
  }

  /** 4. User Sent Gift / Tip */
  public static emitUserSentGift(
    payload: UserSentGiftPayload,
    actor: EventActor
  ): BehavioralEventEnvelope<UserSentGiftPayload> {
    return this.emit("USER_SENT_GIFT", payload, {
      actor,
      creatorProfileId: payload.creatorProfileId,
      livestreamId: payload.livestreamId,
      entityId: payload.giftId,
    });
  }

  /** 5. Collective Goal Progressed */
  public static emitGoalProgressed(
    payload: GoalProgressedPayload,
    actor: EventActor
  ): BehavioralEventEnvelope<GoalProgressedPayload> {
    return this.emit("GOAL_PROGRESSED", payload, {
      actor,
      creatorProfileId: payload.creatorProfileId,
      livestreamId: payload.livestreamId,
      entityId: payload.goalId,
    });
  }

  /** 6. Relationship / Fan Level Increased */
  public static emitLevelIncreased(
    payload: LevelIncreasedPayload,
    actor: EventActor
  ): BehavioralEventEnvelope<LevelIncreasedPayload> {
    return this.emit("LEVEL_INCREASED", payload, {
      actor,
      creatorProfileId: payload.creatorProfileId,
      entityId: payload.userId,
    });
  }

  /** 7. Private Session Booked */
  public static emitSessionBooked(
    payload: SessionBookedPayload,
    actor: EventActor
  ): BehavioralEventEnvelope<SessionBookedPayload> {
    return this.emit("SESSION_BOOKED", payload, {
      actor,
      creatorProfileId: payload.creatorProfileId,
      entityId: payload.bookingId,
      idempotencyKey: payload.orderId,
    });
  }

  // --------------------------------------------------------------------------
  // METRICS & TELEMETRY
  // --------------------------------------------------------------------------

  public static getMetrics(): EventStreamMetrics {
    return {
      totalPublished: totalEventsEmitted,
      eventsByType: { ...eventsByTypeCounter },
      eventsDispatchedToAnalytics: totalEventsEmitted,
      eventsDispatchedToNotifications: NotificationHubSubscriber.processedCount,
      eventsDispatchedToRecommendations: RecommendationHubSubscriber.processedCount,
      eventsDispatchedToLeaderboards: totalEventsEmitted,
      eventsDispatchedToProgression: totalEventsEmitted,
      eventsDispatchedToCrm: CreatorCrmHubSubscriber.processedCount,
      eventsDispatchedToFraud: FraudHubSubscriber.processedCount,
      eventsDispatchedToCreatorAnalytics: CreatorAnalyticsHubSubscriber.processedCount,
      recentEvents: [...recentEventsBuffer],
    };
  }

  public static _reset(): void {
    recentEventsBuffer.length = 0;
    totalEventsEmitted = 0;
    Object.keys(eventsByTypeCounter).forEach((k) => delete eventsByTypeCounter[k]);
    NotificationHubSubscriber._reset();
    RecommendationHubSubscriber._reset();
    CreatorCrmHubSubscriber._reset();
    FraudHubSubscriber._reset();
    CreatorAnalyticsHubSubscriber._reset();
  }
}
