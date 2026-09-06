import {
  BookableSlot,
  CreatorSessionSettings,
  PrivateBookingRecord,
  SessionPricingTier,
} from "./types";
import { reservationLockService } from "./reservation-lock.service";

/**
 * AUTHORITATIVE BOOKABLE SLOT GENERATION ENGINE
 * 
 * Turns creator availability schedule into discrete bookable time slots.
 * Formats:
 * - Generates slots (e.g. 19:00, 20:00, 21:30)
 * - Validates against buffer times
 * - Filters past times and insufficient notice
 * - Filters conflicting bookings and active temporary holds
 */
export class SlotGeneratorService {
  /**
   * Generates bookable slots for a given creator, date, and duration.
   */
  static generateSlotsForDate(params: {
    creatorSettings: CreatorSessionSettings;
    dateIsoString: string; // "2026-09-06" or full ISO
    durationMinutes: number; // 30, 45, 60
    existingBookings: PrivateBookingRecord[];
    currentTime?: Date;
  }): BookableSlot[] {
    const {
      creatorSettings,
      dateIsoString,
      durationMinutes,
      existingBookings,
      currentTime = new Date(),
    } = params;

    // Parse the target date
    const dateObj = new Date(dateIsoString);
    const year = dateObj.getUTCFullYear();
    const month = dateObj.getUTCMonth();
    const day = dateObj.getUTCDate();
    const dayOfWeek = dateObj.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

    // Find the schedule for this day of week
    const daySchedule = creatorSettings.weeklySchedule.find(
      (s) => s.dayOfWeek === dayOfWeek
    );

    if (!daySchedule || !daySchedule.isEnabled || !daySchedule.timeWindows.length) {
      return [];
    }

    // Find pricing tier for this duration
    const tier = creatorSettings.pricingTiers.find(
      (t) => t.durationMinutes === durationMinutes && t.isEnabled
    ) || {
      id: `tier_${durationMinutes}m`,
      durationMinutes,
      priceFiatCents: durationMinutes === 30 ? 10000 : durationMinutes === 45 ? 14000 : 18000,
      currency: "EUR",
      tokenEquivalent: durationMinutes === 30 ? 1000 : durationMinutes === 45 ? 1400 : 1800,
      title: `${durationMinutes} minutes`,
      isEnabled: true,
    };

    const slots: BookableSlot[] = [];
    const bufferMinutes = creatorSettings.bufferTimeMinutes || 15;
    const minimumNoticeMs = (creatorSettings.minimumNoticeHours || 0) * 3600 * 1000;
    const nowMs = currentTime.getTime();

    // Loop through each availability window on this day
    for (const window of daySchedule.timeWindows) {
      const [startHour, startMin] = window.startTime.split(":").map(Number);
      const [endHour, endMin] = window.endTime.split(":").map(Number);

      const windowStartMs = Date.UTC(year, month, day, startHour, startMin, 0, 0);
      const windowEndMs = Date.UTC(year, month, day, endHour, endMin, 0, 0);

      const stepMinutes = durationMinutes >= 45 ? 45 : 30; // Clean step increments
      let currentSlotStartMs = windowStartMs;

      while (currentSlotStartMs + durationMinutes * 60 * 1000 <= windowEndMs) {
        const slotEndMs = currentSlotStartMs + durationMinutes * 60 * 1000;

        const slotStartDate = new Date(currentSlotStartMs);
        const slotEndDate = new Date(slotEndMs);

        const startIso = slotStartDate.toISOString();
        const endIso = slotEndDate.toISOString();

        // Format 24-hour display time (e.g. "19:00", "20:00", "21:30")
        const startHoursStr = slotStartDate.getUTCHours().toString().padStart(2, "0");
        const startMinutesStr = slotStartDate.getUTCMinutes().toString().padStart(2, "0");
        const endHoursStr = slotEndDate.getUTCHours().toString().padStart(2, "0");
        const endMinutesStr = slotEndDate.getUTCMinutes().toString().padStart(2, "0");

        const displayTime = `${startHoursStr}:${startMinutesStr}`;
        const displayEndTime = `${endHoursStr}:${endMinutesStr}`;

        // 1. Check if slot is in the past or within minimum notice window
        const isPastOrShortNotice = currentSlotStartMs < nowMs + minimumNoticeMs;

        // 2. Check conflict with confirmed bookings
        const isBooked = existingBookings.some((b) => {
          if (b.status === "CANCELLED_BY_FAN" || b.status === "CANCELLED_BY_CREATOR") {
            return false;
          }
          const bStart = new Date(b.scheduledStartTime).getTime() - bufferMinutes * 60 * 1000;
          const bEnd = new Date(b.scheduledEndTime).getTime() + bufferMinutes * 60 * 1000;
          return currentSlotStartMs < bEnd && slotEndMs > bStart;
        });

        // 3. Check conflict with active temporary reservation holds
        const isHeld = reservationLockService.isWindowHeld(
          creatorSettings.creatorProfileId,
          startIso,
          endIso
        );

        let isAvailable = true;
        let unavailabilityReason: BookableSlot["unavailabilityReason"] = undefined;

        if (isBooked) {
          isAvailable = false;
          unavailabilityReason = "BOOKED";
        } else if (isHeld) {
          isAvailable = false;
          unavailabilityReason = "HELD_IN_CHECKOUT";
        } else if (isPastOrShortNotice) {
          isAvailable = false;
          unavailabilityReason = "PAST";
        }

        const dateFormatted = `${year}-${(month + 1).toString().padStart(2, "0")}-${day
          .toString()
          .padStart(2, "0")}`;

        slots.push({
          slotId: `slot_${dateFormatted}_${displayTime.replace(":", "")}_${durationMinutes}`,
          startTimeUtc: startIso,
          endTimeUtc: endIso,
          displayTime,
          displayEndTime,
          dateFormatted,
          durationMinutes,
          priceFiatCents: tier.priceFiatCents,
          priceFiatFormatted: `€${(tier.priceFiatCents / 100).toFixed(0)}`,
          priceTokens: tier.tokenEquivalent,
          isAvailable,
          unavailabilityReason,
        });

        // Advance by duration + buffer or discrete step
        currentSlotStartMs += (stepMinutes + (isBooked ? bufferMinutes : 0)) * 60 * 1000;
      }
    }

    return slots;
  }
}
