/**
 * Live Room Subscriber
 *
 * Listens for authoritative domain events and manages room-scoped broadcasts
 * for 2,000+ connected live viewers (SSE / WebSockets).
 *
 * Responsibilities:
 * - Emits visual animations (Grand Diamond explosion, particle bursts) to room channel
 * - Inserts automated chat notices for tips, goals, and interactions
 * - Maintains active room status & viewer feed
 */

import { eventBus } from "../event-bus";
import {
  DomainEvent,
  GiftSentPayload,
  MessageCreatedPayload,
  UserJoinedPayload,
  UserLeftPayload,
  GoalProgressPayload,
  GoalCompletedPayload,
  LeaderboardUpdatedPayload,
  InteractionPurchasedPayload,
  InteractionAcceptedPayload,
  LiveStartedPayload,
  LiveEndedPayload,
} from "../types";

export class LiveRoomSubscriber {
  private static registered = false;
  private static roomStateCache: Map<
    string,
    {
      isLive: boolean;
      title: string;
      viewerCount: number;
      lastGiftAnimation?: string;
      lastActivityAt: number;
    }
  > = new Map();

  /**
   * Register all event listeners for the Live Room subsystem.
   */
  public static register(): void {
    if (this.registered) return;
    this.registered = true;

    // 1. React to GIFT_SENT
    eventBus.on<GiftSentPayload>("GIFT_SENT", (event) => {
      this.handleGiftSent(event);
    });

    // 2. React to MESSAGE_CREATED
    eventBus.on<MessageCreatedPayload>("MESSAGE_CREATED", (event) => {
      this.handleMessageCreated(event);
    });

    // 3. React to USER_JOINED & USER_LEFT
    eventBus.on<UserJoinedPayload>("USER_JOINED", (event) => {
      this.handleUserJoined(event);
    });
    eventBus.on<UserLeftPayload>("USER_LEFT", (event) => {
      this.handleUserLeft(event);
    });

    // 4. React to GOAL_PROGRESS & GOAL_COMPLETED
    eventBus.on<GoalProgressPayload>("GOAL_PROGRESS", (event) => {
      this.handleGoalProgress(event);
    });
    eventBus.on<GoalCompletedPayload>("GOAL_COMPLETED", (event) => {
      this.handleGoalCompleted(event);
    });

    // 5. React to LEADERBOARD_UPDATED
    eventBus.on<LeaderboardUpdatedPayload>("LEADERBOARD_UPDATED", (event) => {
      this.handleLeaderboardUpdated(event);
    });

    // 6. React to INTERACTION_PURCHASED & INTERACTION_ACCEPTED
    eventBus.on<InteractionPurchasedPayload>("INTERACTION_PURCHASED", (event) => {
      this.handleInteractionPurchased(event);
    });
    eventBus.on<InteractionAcceptedPayload>("INTERACTION_ACCEPTED", (event) => {
      this.handleInteractionAccepted(event);
    });

    // 7. React to LIVE_STARTED & LIVE_ENDED
    eventBus.on<LiveStartedPayload>("LIVE_STARTED", (event) => {
      this.handleLiveStarted(event);
    });
    eventBus.on<LiveEndedPayload>("LIVE_ENDED", (event) => {
      this.handleLiveEnded(event);
    });
  }

  private static handleGiftSent(event: DomainEvent<GiftSentPayload>): void {
    const { creatorId, sender, gift } = event.payload;
    const roomChannel = `room:${creatorId}`;

    // Update internal room cache
    const room = this.getOrCreateRoomState(creatorId);
    room.lastGiftAnimation = gift.animationType;
    room.lastActivityAt = Date.now();

    // Emit specialized visual animation trigger for the frontend live room overlay
    eventBus.publish(roomChannel, {
      id: `anim_${event.id}`,
      type: "ROOM_STATUS",
      channel: roomChannel,
      timestamp: Date.now(),
      payload: {
        action: "TRIGGER_ANIMATION",
        animationType: gift.animationType,
        tier: gift.tier,
        senderDisplayName: sender.displayName,
        giftName: gift.name,
        giftIcon: gift.icon,
        credits: gift.creditAmount,
      },
      metadata: {
        source: "live_room_subscriber",
        version: "1.0.0",
      },
    });
  }

  private static handleMessageCreated(event: DomainEvent<MessageCreatedPayload>): void {
    const { creatorId } = event.payload;
    const room = this.getOrCreateRoomState(creatorId);
    room.lastActivityAt = Date.now();
  }

  private static handleUserJoined(event: DomainEvent<UserJoinedPayload>): void {
    const { creatorId, viewerCount } = event.payload;
    const room = this.getOrCreateRoomState(creatorId);
    room.viewerCount = viewerCount;
  }

  private static handleUserLeft(event: DomainEvent<UserLeftPayload>): void {
    const { creatorId, viewerCount } = event.payload;
    const room = this.getOrCreateRoomState(creatorId);
    room.viewerCount = viewerCount;
  }

  private static handleGoalProgress(event: DomainEvent<GoalProgressPayload>): void {
    const { creatorId } = event.payload;
    const room = this.getOrCreateRoomState(creatorId);
    room.lastActivityAt = Date.now();
  }

  private static handleGoalCompleted(event: DomainEvent<GoalCompletedPayload>): void {
    const { creatorId, title, unlock } = event.payload;
    const roomChannel = `room:${creatorId}`;

    // Update room activity
    const room = this.getOrCreateRoomState(creatorId);
    room.lastActivityAt = Date.now();

    // Broadcast celebration banner event to live room viewers
    eventBus.publish(roomChannel, {
      id: `anim_goal_${event.id}`,
      type: "ROOM_STATUS",
      channel: roomChannel,
      timestamp: Date.now(),
      payload: {
        action: "GOAL_CELEBRATION_BANNER",
        title,
        unlockTitle: unlock?.title,
        celebrationTheme: event.payload.celebrationTheme || "GOLDEN_CHAMPION",
      },
      metadata: { source: "live_room_subscriber", version: "1.0.0" },
    });
  }

  private static handleLeaderboardUpdated(event: DomainEvent<LeaderboardUpdatedPayload>): void {
    const { creatorId } = event.payload;
    const room = this.getOrCreateRoomState(creatorId);
    room.lastActivityAt = Date.now();
  }

  private static handleInteractionPurchased(event: DomainEvent<InteractionPurchasedPayload>): void {
    const { creatorId, senderName, actionItem } = event.payload;
    const roomChannel = `room:${creatorId}`;

    // Emit system notice
    eventBus.publish(roomChannel, {
      id: `sys_int_${Date.now()}`,
      type: "ROOM_STATUS",
      channel: roomChannel,
      timestamp: Date.now(),
      payload: {
        action: "INTERACTION_QUEUED_NOTICE",
        senderName,
        actionTitle: actionItem.title,
        creditCost: actionItem.creditCost,
      },
      metadata: { source: "live_room_subscriber", version: "1.0.0" },
    });
  }

  private static handleInteractionAccepted(event: DomainEvent<InteractionAcceptedPayload>): void {
    const { creatorId, senderName, actionTitle } = event.payload;
    const roomChannel = `room:${creatorId}`;

    eventBus.publish(roomChannel, {
      id: `sys_int_acc_${Date.now()}`,
      type: "ROOM_STATUS",
      channel: roomChannel,
      timestamp: Date.now(),
      payload: {
        action: "INTERACTION_ACCEPTED_NOTICE",
        senderName,
        actionTitle,
      },
      metadata: { source: "live_room_subscriber", version: "1.0.0" },
    });
  }

  private static handleLiveStarted(event: DomainEvent<LiveStartedPayload>): void {
    const { creatorId, title } = event.payload;
    const room = this.getOrCreateRoomState(creatorId);
    room.isLive = true;
    room.title = title;
    room.lastActivityAt = Date.now();
  }

  private static handleLiveEnded(event: DomainEvent<LiveEndedPayload>): void {
    const { creatorId } = event.payload;
    const room = this.getOrCreateRoomState(creatorId);
    room.isLive = false;
    room.lastActivityAt = Date.now();
  }

  private static getOrCreateRoomState(creatorId: string) {
    if (!this.roomStateCache.has(creatorId)) {
      this.roomStateCache.set(creatorId, {
        isLive: false,
        title: "",
        viewerCount: 0,
        lastActivityAt: Date.now(),
      });
    }
    return this.roomStateCache.get(creatorId)!;
  }

  public static getRoomState(creatorId: string) {
    return this.roomStateCache.get(creatorId);
  }

  public static resetForTesting(): void {
    this.registered = false;
    this.roomStateCache.clear();
  }
}
