/**
 * Notifications Event Hub Subscriber
 *
 * Translates behavioral domain events into actionable in-app and push notifications:
 * - Creator notified on new follower
 * - Creator notified on gift/tip received
 * - Creator & Fan notified on private session booking
 * - Fan notified on level-up milestone achievement
 */

import { eventBus } from "@/modules/realtime/event-bus";
import { BehavioralEventEnvelope, UserFollowedCreatorPayload, UserSentGiftPayload, UserBoughtContentPayload, SessionBookedPayload, LevelIncreasedPayload } from "../types";
import { NotificationService } from "@/modules/notifications/notification.service";
import { StructuredLogger } from "@/core/observability";

export class NotificationHubSubscriber {
  private static registered = false;
  public static processedCount = 0;

  public static register(): void {
    if (this.registered) return;
    this.registered = true;

    // 1. User Followed Creator
    eventBus.on("USER_FOLLOWED_CREATOR", async (event) => {
      this.processedCount++;
      const payload = event.payload as UserFollowedCreatorPayload;
      StructuredLogger.info("Notification Hub: Processing Follower Alert", { userId: payload.userId, creatorProfileId: payload.creatorProfileId });

      try {
        await NotificationService.createInAppNotification({
          userId: payload.creatorProfileId,
          type: "FOLLOW_ACTIVITY" as any,
          title: "New Follower! 🎉",
          body: `${event.actor?.displayName || "A fan"} started following your profile.`,
          actionUrl: `/creators/${payload.creatorProfileId}/fans/${payload.userId}`,
          actorId: payload.userId,
          creatorProfileId: payload.creatorProfileId,
        });
      } catch {
        // Non-blocking notification dispatch
      }
    });

    // 2. User Sent Gift / Tip
    eventBus.on("USER_SENT_GIFT", async (event) => {
      this.processedCount++;
      const payload = event.payload as UserSentGiftPayload;
      StructuredLogger.info("Notification Hub: Processing Gift Alert", { amountCredits: payload.amountCredits, giftName: payload.giftName });

      try {
        await NotificationService.createInAppNotification({
          userId: payload.creatorProfileId,
          type: "ECONOMIC_TIP" as any,
          title: `Gift Received: ${payload.giftName} 💎`,
          body: `${event.actor?.displayName || "A fan"} sent you ${payload.amountCredits} credits${payload.customMessage ? `: "${payload.customMessage}"` : ""}`,
          actionUrl: `/creator/control-room`,
          actorId: payload.userId,
          creatorProfileId: payload.creatorProfileId,
        });
      } catch {
        // Non-blocking notification dispatch
      }
    });

    // 3. Private Session Booked
    eventBus.on("SESSION_BOOKED", async (event) => {
      this.processedCount++;
      const payload = event.payload as SessionBookedPayload;
      StructuredLogger.info("Notification Hub: Processing Session Booking Alert", { bookingId: payload.bookingId, fanId: payload.fanId });

      try {
        // Notify Creator
        await NotificationService.createInAppNotification({
          userId: payload.creatorProfileId,
          type: "SESSION_REMINDER" as any,
          title: "1-on-1 Session Booked! 📅",
          body: `A private session (${payload.durationMinutes} mins) has been booked for ${new Date(payload.scheduledStartTime).toLocaleTimeString()}.`,
          actionUrl: `/creator/private-sessions/${payload.bookingId}`,
          actorId: payload.fanId,
          creatorProfileId: payload.creatorProfileId,
        });

        // Notify Fan
        await NotificationService.createInAppNotification({
          userId: payload.fanId,
          type: "SESSION_REMINDER" as any,
          title: "Private Session Confirmed! ✨",
          body: `Your 1-on-1 session is scheduled for ${new Date(payload.scheduledStartTime).toLocaleTimeString()}.`,
          actionUrl: `/private-sessions/${payload.bookingId}`,
          creatorProfileId: payload.creatorProfileId,
        });
      } catch {
        // Non-blocking notification dispatch
      }
    });

    // 4. Level Increased Milestone
    eventBus.on("LEVEL_INCREASED", async (event) => {
      this.processedCount++;
      const payload = event.payload as LevelIncreasedPayload;
      StructuredLogger.info("Notification Hub: Processing Level-Up Alert", { newLevel: payload.newLevel, userId: payload.userId });

      try {
        await NotificationService.createInAppNotification({
          userId: payload.userId,
          type: "PROGRESSION_TIER" as any,
          title: `Level Up! You reached Level ${payload.newLevel} 🚀`,
          body: `Congratulations! Your devotion has unlocked new perks and status.`,
          actionUrl: `/profile/progression`,
          creatorProfileId: payload.creatorProfileId,
        });
      } catch {
        // Non-blocking notification dispatch
      }
    });
  }

  public static _reset(): void {
    this.processedCount = 0;
  }
}
