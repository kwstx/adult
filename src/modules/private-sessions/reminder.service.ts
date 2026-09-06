import { PrivateBookingRecord, ReminderNotification } from "./types";
import { PrivateBookingService } from "./booking.service";
import { eventBus } from "@/modules/realtime/event-bus";

/**
 * AUTOMATED SESSION REMINDER ENGINE
 * 
 * Evaluates upcoming private bookings and delivers timely reminder alerts to
 * both the Fan and Creator prior to scheduled session time.
 */

class SessionReminderService {
  private notifications: ReminderNotification[] = [];

  /**
   * Check all bookings and dispatch reminders for sessions starting soon.
   */
  public checkAndDispatchReminders(advanceMinutes: number = 15): ReminderNotification[] {
    const now = Date.now();
    const bookings = PrivateBookingService.getBookings({});
    const newReminders: ReminderNotification[] = [];

    for (const booking of bookings) {
      if (booking.status !== "CONFIRMED" || booking.reminderSent) {
        continue;
      }

      const startTimeMs = new Date(booking.scheduledStartTime).getTime();
      const diffMinutes = Math.floor((startTimeMs - now) / (60 * 1000));

      // Trigger if session starts within the reminder window (0 to advanceMinutes)
      if (diffMinutes >= 0 && diffMinutes <= advanceMinutes) {
        // Mark booking reminder sent
        booking.reminderSent = true;
        booking.reminderSentAt = new Date().toISOString();
        booking.status = "REMINDER_SENT";

        // 1. Notification for Fan
        const fanNotification: ReminderNotification = {
          id: `rem_fan_${booking.id}_${Date.now()}`,
          bookingId: booking.id,
          recipientUserId: booking.fanId,
          recipientRole: "FAN",
          title: `Upcoming Private Session with ${booking.creator.displayName} ⏰`,
          message: `Your ${booking.durationMinutes}-minute private session starts at ${booking.displayStartTime} (in ${diffMinutes} min). Be ready to enter the private media room!`,
          scheduledSessionTime: booking.scheduledStartTime,
          minutesUntilSession: diffMinutes,
          roomUrl: `/private-room/${booking.id}`,
          isRead: false,
          sentAt: new Date().toISOString(),
        };

        // 2. Notification for Creator
        const creatorNotification: ReminderNotification = {
          id: `rem_creator_${booking.id}_${Date.now()}`,
          bookingId: booking.id,
          recipientUserId: booking.creator.userId,
          recipientRole: "CREATOR",
          title: `Upcoming Private Session with ${booking.fan.displayName} ⏰`,
          message: `Private session with ${booking.fan.displayName} starts at ${booking.displayStartTime} (in ${diffMinutes} min). Earnings: €${(booking.creatorNetCents / 100).toFixed(0)}.`,
          scheduledSessionTime: booking.scheduledStartTime,
          minutesUntilSession: diffMinutes,
          roomUrl: `/private-room/${booking.id}`,
          isRead: false,
          sentAt: new Date().toISOString(),
        };

        this.notifications.push(fanNotification, creatorNotification);
        newReminders.push(fanNotification, creatorNotification);

        // Broadcast real-time reminder events to user channels
        eventBus.publish(`user:${booking.fanId}`, {
          type: "NOTIFICATION" as any,
          payload: fanNotification,
        });

        eventBus.publish(`user:${booking.creator.userId}`, {
          type: "NOTIFICATION" as any,
          payload: creatorNotification,
        });
      }
    }

    return newReminders;
  }

  /**
   * Manually trigger a test or on-demand reminder for a specific booking.
   */
  public triggerImmediateReminder(bookingId: string): ReminderNotification[] {
    const booking = PrivateBookingService.getBookingById(bookingId);
    if (!booking) return [];

    const now = Date.now();
    const startTimeMs = new Date(booking.scheduledStartTime).getTime();
    const diffMinutes = Math.max(0, Math.floor((startTimeMs - now) / (60 * 1000)));

    booking.reminderSent = true;
    booking.reminderSentAt = new Date().toISOString();

    const fanNotification: ReminderNotification = {
      id: `rem_fan_${booking.id}_manual_${Date.now()}`,
      bookingId: booking.id,
      recipientUserId: booking.fanId,
      recipientRole: "FAN",
      title: `Private Session Reminder: ${booking.creator.displayName} ⏰`,
      message: `Your ${booking.durationMinutes}-minute private session is scheduled for ${booking.displayDate} at ${booking.displayStartTime}. Room access opens 5 min prior.`,
      scheduledSessionTime: booking.scheduledStartTime,
      minutesUntilSession: diffMinutes,
      roomUrl: `/private-room/${booking.id}`,
      isRead: false,
      sentAt: new Date().toISOString(),
    };

    const creatorNotification: ReminderNotification = {
      id: `rem_creator_${booking.id}_manual_${Date.now()}`,
      bookingId: booking.id,
      recipientUserId: booking.creator.userId,
      recipientRole: "CREATOR",
      title: `Private Session Reminder: ${booking.fan.displayName} ⏰`,
      message: `Your ${booking.durationMinutes}-minute private session with ${booking.fan.displayName} is at ${booking.displayStartTime}.`,
      scheduledSessionTime: booking.scheduledStartTime,
      minutesUntilSession: diffMinutes,
      roomUrl: `/private-room/${booking.id}`,
      isRead: false,
      sentAt: new Date().toISOString(),
    };

    this.notifications.push(fanNotification, creatorNotification);

    eventBus.publish(`user:${booking.fanId}`, {
      type: "NOTIFICATION" as any,
      payload: fanNotification,
    });

    eventBus.publish(`user:${booking.creator.userId}`, {
      type: "NOTIFICATION" as any,
      payload: creatorNotification,
    });

    return [fanNotification, creatorNotification];
  }

  /**
   * Get all reminders for a specific user.
   */
  public getUserReminders(userId: string): ReminderNotification[] {
    return this.notifications.filter((n) => n.recipientUserId === userId);
  }
}

const globalReminderStore = globalThis as unknown as {
  __sessionReminderService?: SessionReminderService;
};

export const sessionReminderService =
  globalReminderStore.__sessionReminderService ?? new SessionReminderService();

if (process.env.NODE_ENV !== "production") {
  globalReminderStore.__sessionReminderService = sessionReminderService;
}
