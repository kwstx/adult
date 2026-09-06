import { eventBus } from "@/modules/realtime/event-bus";
import { NotificationPayload, NotificationRecipient } from "../types";

export class RealtimeSseTransport {
  /**
   * Broadcasts real-time notification events to active SSE / WebSocket client connections.
   */
  public static deliverBatch(
    recipients: NotificationRecipient[],
    payload: NotificationPayload
  ): { deliveredCount: number } {
    let deliveredCount = 0;

    const notificationItem = {
      id: `rt_notif_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      actionUrl: payload.actionUrl,
      imageUrl: payload.imageUrl,
      senderUserId: payload.senderUserId,
      metadata: payload.metadata,
      createdAt: new Date().toISOString(),
      isRead: false,
    };

    for (const recipient of recipients) {
      const channel = `user:${recipient.userId}`;
      
      // Publish to internal event bus & user SSE stream
      eventBus.publish(channel, {
        type: "NOTIFICATION" as any,
        payload: {
          ...notificationItem,
          recipientUserId: recipient.userId,
        },
      });

      deliveredCount++;
    }

    return { deliveredCount };
  }
}
