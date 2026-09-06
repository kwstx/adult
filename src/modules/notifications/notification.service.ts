import prisma from "@/lib/db";
import { notificationQueue } from "./notification-queue.service";
import {
  EnqueueNotificationResult,
  NotificationChannel,
  NotificationPriority,
  AudienceTarget,
  NotificationPayload,
} from "./types";

export class NotificationService {
  /**
   * 1. LIVESTREAM GO-LIVE NOTIFICATION
   * Enqueues fan-out notifications to all followers without blocking creator's go-live request.
   * Execution time: < 5ms.
   */
  public static async notifyCreatorWentLive(params: {
    creatorProfileId: string;
    streamId?: string;
    streamTitle?: string;
    stageName?: string;
    avatarUrl?: string;
  }): Promise<EnqueueNotificationResult> {
    const { creatorProfileId, streamId, streamTitle, stageName, avatarUrl } = params;

    // Fetch creator details if not provided
    let creatorName = stageName;
    let creatorUser: any = null;

    if (!creatorName) {
      const creator = await prisma.creatorProfile.findUnique({
        where: { id: creatorProfileId },
        include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
      });
      creatorName = creator?.stageName || creator?.user?.displayName || "Creator";
      creatorUser = creator?.user;
    }

    const payload: NotificationPayload = {
      type: "CREATOR_WENT_LIVE",
      title: `${creatorName} is now LIVE! 🔴`,
      body: streamTitle ? `Streaming: "${streamTitle}" — Join the room now!` : `Join ${creatorName}'s livestream session!`,
      actionUrl: `/live/${creatorProfileId}`,
      imageUrl: avatarUrl || creatorUser?.avatarUrl || undefined,
      senderUserId: creatorUser?.id,
      metadata: {
        creatorProfileId,
        streamId,
        streamTitle,
      },
    };

    return notificationQueue.enqueue({
      eventType: "CREATOR_WENT_LIVE",
      priority: "HIGH",
      payload,
      audience: {
        type: "CREATOR_FOLLOWERS",
        creatorProfileId,
        tiers: ["ALL", "LIVE_ONLY"],
      },
      channels: ["IN_APP", "REALTIME_SSE", "WEB_PUSH"],
      idempotencyKey: `live_${creatorProfileId}_${streamId || Date.now().toString().slice(0, -4)}`,
      cooldownSeconds: 60, // Avoid multiple bursts if creator disconnects/reconnects
      maxRetries: 3,
    });
  }

  /**
   * 2. PRIVATE-SESSION REMINDER
   * Dispatches urgent session alerts to both Fan and Creator 15m / 5m before private show.
   */
  public static async notifyPrivateSessionReminder(params: {
    bookingId: string;
    fanUserId: string;
    creatorUserId: string;
    creatorDisplayName: string;
    fanDisplayName: string;
    scheduledStartTime: string;
    minutesUntil: number;
    roomUrl?: string;
  }): Promise<EnqueueNotificationResult> {
    const {
      bookingId,
      fanUserId,
      creatorUserId,
      creatorDisplayName,
      fanDisplayName,
      scheduledStartTime,
      minutesUntil,
      roomUrl = `/private-room/${bookingId}`,
    } = params;

    // Fan Notification
    await notificationQueue.enqueue({
      eventType: "PRIVATE_SESSION_REMINDER",
      priority: "URGENT",
      payload: {
        type: "PRIVATE_SESSION_REMINDER",
        title: `Private Session with ${creatorDisplayName} in ${minutesUntil}m! ⏰`,
        body: `Your scheduled 1-on-1 private room is opening soon. Click to enter room lobby.`,
        actionUrl: roomUrl,
        senderUserId: creatorUserId,
        metadata: { bookingId, scheduledStartTime, minutesUntil, role: "FAN" },
      },
      audience: { type: "SPECIFIC_USERS", userIds: [fanUserId] },
      channels: ["IN_APP", "REALTIME_SSE", "WEB_PUSH"],
      idempotencyKey: `rem_fan_${bookingId}_${minutesUntil}m`,
      cooldownSeconds: 300,
      maxRetries: 3,
    });

    // Creator Notification
    return notificationQueue.enqueue({
      eventType: "PRIVATE_SESSION_REMINDER",
      priority: "URGENT",
      payload: {
        type: "PRIVATE_SESSION_REMINDER",
        title: `Upcoming Private Session with ${fanDisplayName} in ${minutesUntil}m! ⏰`,
        body: `Private booking starts at ${new Date(scheduledStartTime).toLocaleTimeString()}. Prepare your camera and stage.`,
        actionUrl: roomUrl,
        senderUserId: fanUserId,
        metadata: { bookingId, scheduledStartTime, minutesUntil, role: "CREATOR" },
      },
      audience: { type: "SPECIFIC_USERS", userIds: [creatorUserId] },
      channels: ["IN_APP", "REALTIME_SSE", "WEB_PUSH"],
      idempotencyKey: `rem_creator_${bookingId}_${minutesUntil}m`,
      cooldownSeconds: 300,
      maxRetries: 3,
    });
  }

  /**
   * 3. SUBSCRIPTION RENEWAL NOTIFICATION
   * Alerts fan when membership renews or requires card attention.
   */
  public static async notifySubscriptionRenewal(params: {
    fanUserId: string;
    creatorProfileId: string;
    creatorName: string;
    tierName: string;
    priceCredits: number;
    status: "SUCCESS" | "FAILED" | "UPCOMING";
  }): Promise<EnqueueNotificationResult> {
    const { fanUserId, creatorProfileId, creatorName, tierName, priceCredits, status } = params;

    let title = `Subscription Renewed: ${creatorName} (${tierName}) ⭐`;
    let body = `Your ${tierName} tier membership has renewed for ${priceCredits} tokens. Thank you for your continued support!`;

    if (status === "FAILED") {
      title = `⚠️ Subscription Renewal Issue: ${creatorName}`;
      body = `Your ${tierName} tier renewal could not be processed due to insufficient funds. Please top up your wallet.`;
    } else if (status === "UPCOMING") {
      title = `Upcoming Renewal: ${creatorName} (${tierName})`;
      body = `Your membership will automatically renew in 48 hours for ${priceCredits} tokens.`;
    }

    return notificationQueue.enqueue({
      eventType: "SUB_RENEWAL",
      priority: "NORMAL",
      payload: {
        type: "SUB_RENEWAL",
        title,
        body,
        actionUrl: `/creators/${creatorProfileId}`,
        metadata: { creatorProfileId, tierName, priceCredits, status },
      },
      audience: { type: "SPECIFIC_USERS", userIds: [fanUserId] },
      channels: ["IN_APP", "REALTIME_SSE", "WEB_PUSH"],
      idempotencyKey: `sub_renew_${fanUserId}_${creatorProfileId}_${new Date().toISOString().slice(0, 10)}`,
      cooldownSeconds: 3600,
      maxRetries: 2,
    });
  }

  /**
   * 4. DIRECT & PAID MESSAGE NOTIFICATIONS
   * Dispatches instant alert when fan or creator sends a DM or Paid Message.
   */
  public static async notifyMessageReceived(params: {
    senderUserId: string;
    senderDisplayName: string;
    recipientUserId: string;
    messagePreview: string;
    conversationId: string;
    isPaid?: boolean;
    creditsAmount?: number;
  }): Promise<EnqueueNotificationResult> {
    const {
      senderUserId,
      senderDisplayName,
      recipientUserId,
      messagePreview,
      conversationId,
      isPaid,
      creditsAmount,
    } = params;

    const title = isPaid
      ? `💌 Paid Message from ${senderDisplayName} (+${creditsAmount} tokens)`
      : `💬 New message from ${senderDisplayName}`;

    return notificationQueue.enqueue({
      eventType: "MESSAGE_RECEIVED",
      priority: "HIGH",
      payload: {
        type: "MESSAGE_RECEIVED",
        title,
        body: messagePreview.length > 80 ? `${messagePreview.slice(0, 80)}...` : messagePreview,
        actionUrl: `/messages/${conversationId}`,
        senderUserId,
        metadata: { conversationId, isPaid, creditsAmount },
      },
      audience: { type: "CONVERSATION_PARTICIPANT", conversationId, recipientUserId },
      channels: ["IN_APP", "REALTIME_SSE", "WEB_PUSH"],
      idempotencyKey: `msg_${conversationId}_${Date.now()}`,
      cooldownSeconds: 1,
      maxRetries: 2,
    });
  }

  /**
   * 5. CONTENT RELEASE NOTIFICATION
   * Alerts followers/subscribers when creator posts a new gallery, video, or PPV set.
   */
  public static async notifyContentRelease(params: {
    creatorProfileId: string;
    creatorName: string;
    contentId: string;
    contentTitle: string;
    contentType: string;
    accessLevel: string;
    previewImageUrl?: string;
  }): Promise<EnqueueNotificationResult> {
    const {
      creatorProfileId,
      creatorName,
      contentId,
      contentTitle,
      contentType,
      accessLevel,
      previewImageUrl,
    } = params;

    const isPPV = accessLevel === "PPV_PURCHASE";
    const title = isPPV
      ? `💎 ${creatorName} dropped new PPV ${contentType}: "${contentTitle}"`
      : `📸 ${creatorName} published new ${contentType}: "${contentTitle}"`;

    return notificationQueue.enqueue({
      eventType: "CONTENT_RELEASE",
      priority: "NORMAL",
      payload: {
        type: "CONTENT_RELEASE",
        title,
        body: `Check out the latest release on ${creatorName}'s feed and vault.`,
        actionUrl: `/creators/${creatorProfileId}/storefront`,
        imageUrl: previewImageUrl,
        metadata: { creatorProfileId, contentId, contentType, accessLevel },
      },
      audience: {
        type: "CREATOR_FOLLOWERS",
        creatorProfileId,
        tiers: ["ALL"],
      },
      channels: ["IN_APP", "REALTIME_SSE", "WEB_PUSH"],
      idempotencyKey: `content_${contentId}`,
      cooldownSeconds: 300,
      maxRetries: 2,
    });
  }

  /**
   * 6. GOAL COMPLETED CELEBRATION NOTIFICATION
   * Alerts contributors and room viewers when community tip milestone is reached.
   */
  public static async notifyGoalCompleted(params: {
    creatorProfileId: string;
    creatorName: string;
    goalId: string;
    goalTitle: string;
    targetCredits: number;
    unlockTitle: string;
  }): Promise<EnqueueNotificationResult> {
    const { creatorProfileId, creatorName, goalId, goalTitle, targetCredits, unlockTitle } = params;

    return notificationQueue.enqueue({
      eventType: "GOAL_COMPLETED",
      priority: "HIGH",
      payload: {
        type: "GOAL_COMPLETED",
        title: `🎉 Goal Reached! "${goalTitle}" (${targetCredits.toLocaleString()} tokens)`,
        body: `${creatorName}'s collective goal was reached! Unlock: ${unlockTitle}`,
        actionUrl: `/live/${creatorProfileId}`,
        metadata: { goalId, creatorProfileId, targetCredits, unlockTitle },
      },
      audience: {
        type: "GOAL_CONTRIBUTORS",
        goalId,
        includeRoomViewers: true,
        creatorProfileId,
      },
      channels: ["IN_APP", "REALTIME_SSE"],
      idempotencyKey: `goal_completed_${goalId}`,
      cooldownSeconds: 300,
      maxRetries: 2,
    });
  }

  /**
   * 7. CREATOR SPECIAL EVENT NOTIFICATION
   * Alerts subscribers & fans about scheduled shows or VIP ticketed stages.
   */
  public static async notifyCreatorEvent(params: {
    creatorProfileId: string;
    creatorName: string;
    eventId: string;
    eventTitle: string;
    scheduledStartTime: string;
    actionUrl?: string;
  }): Promise<EnqueueNotificationResult> {
    const { creatorProfileId, creatorName, eventId, eventTitle, scheduledStartTime, actionUrl } = params;

    return notificationQueue.enqueue({
      eventType: "CREATOR_EVENT",
      priority: "NORMAL",
      payload: {
        type: "CREATOR_EVENT",
        title: `🎭 Special Event: ${eventTitle} by ${creatorName}`,
        body: `Starts at ${new Date(scheduledStartTime).toLocaleString()}. Reserve your front-row seat!`,
        actionUrl: actionUrl || `/live/${creatorProfileId}`,
        metadata: { creatorProfileId, eventId, eventTitle, scheduledStartTime },
      },
      audience: {
        type: "EVENT_REGISTRANTS",
        eventId,
        creatorProfileId,
      },
      channels: ["IN_APP", "REALTIME_SSE", "WEB_PUSH"],
      idempotencyKey: `event_${eventId}`,
      cooldownSeconds: 600,
      maxRetries: 2,
    });
  }

  /**
   * 8. EXCLUSIVE DROP NOTIFICATION
   * Alerts VIP fans of limited-edition merch, passes, or digital collectibles.
   */
  public static async notifyDropRelease(params: {
    creatorProfileId: string;
    creatorName: string;
    dropId: string;
    dropTitle: string;
    limitedQuantity?: number;
    priceCredits: number;
    actionUrl?: string;
  }): Promise<EnqueueNotificationResult> {
    const { creatorProfileId, creatorName, dropId, dropTitle, limitedQuantity, priceCredits, actionUrl } = params;

    const qtyText = limitedQuantity ? `Only ${limitedQuantity} available!` : "Limited release!";
    return notificationQueue.enqueue({
      eventType: "DROP_RELEASE",
      priority: "HIGH",
      payload: {
        type: "DROP_RELEASE",
        title: `🔥 Exclusive Drop: "${dropTitle}" by ${creatorName}`,
        body: `${qtyText} Price: ${priceCredits} tokens. Claim yours before it sells out!`,
        actionUrl: actionUrl || `/creators/${creatorProfileId}/storefront`,
        metadata: { creatorProfileId, dropId, dropTitle, priceCredits, limitedQuantity },
      },
      audience: {
        type: "DROP_WAITLIST",
        dropId,
        creatorProfileId,
      },
      channels: ["IN_APP", "REALTIME_SSE", "WEB_PUSH"],
      idempotencyKey: `drop_${dropId}`,
      cooldownSeconds: 300,
      maxRetries: 2,
    });
  }

  /**
   * Generic Notification Enqueue Dispatcher
   */
  public static async sendNotification(params: {
    eventType: any;
    priority?: NotificationPriority;
    payload: NotificationPayload;
    audience: AudienceTarget;
    channels?: NotificationChannel[];
    idempotencyKey?: string;
    cooldownSeconds?: number;
  }): Promise<EnqueueNotificationResult> {
    const {
      eventType,
      priority = "NORMAL",
      payload,
      audience,
      channels = ["IN_APP", "REALTIME_SSE"],
      idempotencyKey = `custom_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      cooldownSeconds = 10,
    } = params;

    return notificationQueue.enqueue({
      eventType,
      priority,
      payload,
      audience,
      channels,
      idempotencyKey,
      cooldownSeconds,
      maxRetries: 3,
    });
  }
}
