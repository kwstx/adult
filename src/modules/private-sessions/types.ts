/**
 * AUTHORITATIVE PRIVATE SESSIONS TYPES & INTERFACES
 * 
 * Defines data structures for:
 * 1. Creator Pricing Tiers (30m — €100, 45m — €140, 60m — €180)
 * 2. Creator Availability Schedules (Weekly recurring + specific date overrides)
 * 3. Bookable Slot Generation Engine
 * 4. Temporary Reservation Holds (10-minute hold TTL to prevent double-booking)
 * 5. Confirmed Bookings & Escrow Payments
 * 6. Automated Reminder Notifications
 * 7. Time-Windowed Private WebRTC Media Room Authorization
 */

export interface SessionPricingTier {
  id: string;
  durationMinutes: number; // 30, 45, 60
  priceFiatCents: number;   // 10000 (€100.00), 14000 (€140.00), 18000 (€180.00)
  currency: string;        // "EUR"
  tokenEquivalent: number;  // 1000, 1400, 1800 tokens
  title: string;           // "30 minutes — €100"
  description?: string;
  isEnabled: boolean;
}

export interface DayAvailabilitySchedule {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  dayName: string;   // "Monday", "Tuesday", etc.
  isEnabled: boolean;
  timeWindows: Array<{
    startTime: string; // "18:00" (HH:MM format, 24h)
    endTime: string;   // "23:00"
  }>;
}

export interface CreatorSessionSettings {
  creatorProfileId: string;
  pricingTiers: SessionPricingTier[];
  weeklySchedule: DayAvailabilitySchedule[];
  bufferTimeMinutes: number;    // e.g. 15 minutes between sessions
  minimumNoticeHours: number;   // e.g. 2 hours advance notice required
  maxAdvanceDays: number;       // e.g. 14 days in advance
  timezone: string;             // "UTC", "Europe/Paris", "America/New_York"
  customWelcomeMessage?: string;
  updatedAt: string;
}

export interface BookableSlot {
  slotId: string;
  startTimeUtc: string; // ISO 8601: "2026-09-06T17:00:00.000Z"
  endTimeUtc: string;   // ISO 8601: "2026-09-06T17:30:00.000Z"
  displayTime: string;  // Local format: "19:00", "20:00", "21:30"
  displayEndTime: string; // "19:30", "20:45", "22:30"
  dateFormatted: string; // "2026-09-06"
  durationMinutes: number; // 30, 45, 60
  priceFiatCents: number;  // 10000 (€100)
  priceFiatFormatted: string; // "€100"
  priceTokens: number;     // 1000
  isAvailable: boolean;
  unavailabilityReason?: "BOOKED" | "HELD_IN_CHECKOUT" | "PAST" | "BUFFER_CONFLICT" | "NOTICE_TOO_SHORT";
}

export interface SlotReservationHold {
  reservationId: string;
  creatorProfileId: string;
  fanId: string;
  startTimeUtc: string;
  endTimeUtc: string;
  displayTime: string;
  durationMinutes: number;
  priceFiatCents: number;
  priceTokens: number;
  holdExpiresAt: string; // ISO 8601 timestamp (10 minutes from creation)
  ttlRemainingSeconds: number;
  status: "ACTIVE" | "EXPIRED" | "CONFIRMED" | "CANCELLED";
  createdAt: string;
}

export type BookingStatus =
  | "HOLD_PENDING_PAYMENT"
  | "CONFIRMED"
  | "REMINDER_SENT"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED_BY_FAN"
  | "CANCELLED_BY_CREATOR"
  | "REFUNDED"
  | "NO_SHOW";

export interface PrivateBookingRecord {
  id: string;
  reservationId?: string;
  creatorProfileId: string;
  creator: {
    id: string;
    userId: string;
    displayName: string;
    username: string;
    avatarUrl: string;
  };
  fanId: string;
  fan: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl: string;
  };
  scheduledStartTime: string; // ISO 8601
  scheduledEndTime: string;   // ISO 8601
  displayDate: string;        // "Sep 6, 2026"
  displayStartTime: string;   // "20:00"
  displayEndTime: string;     // "20:30"
  durationMinutes: number;    // 30, 45, 60
  priceFiatCents: number;     // 10000 (€100)
  priceFiatFormatted: string; // "€100"
  priceTokens: number;        // 1000
  platformFeeCents: number;   // 2000 (€20 - 20% platform rake)
  creatorNetCents: number;    // 8000 (€80)
  status: BookingStatus;
  meetingRoomId: string;      // Unique media room token for WebRTC
  fanNotes?: string;
  paymentMethod: "FIAT_CARD" | "WALLET_TOKENS";
  walletTransactionId?: string;
  paymentTransactionId?: string;
  reminderSent: boolean;
  reminderSentAt?: string;
  actualStartedAt?: string;
  actualEndedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderNotification {
  id: string;
  bookingId: string;
  recipientUserId: string;
  recipientRole: "FAN" | "CREATOR";
  title: string;
  message: string;
  scheduledSessionTime: string;
  minutesUntilSession: number;
  roomUrl: string;
  isRead: boolean;
  sentAt: string;
}

export interface PrivateRoomAuthorization {
  authorized: boolean;
  bookingId: string;
  meetingRoomId: string;
  userId: string;
  userRole: "CREATOR" | "FAN";
  scheduledStartTime: string;
  scheduledEndTime: string;
  durationMinutes: number;
  isEarly: boolean;
  secondsUntilStart: number;
  isExpired: boolean;
  token?: string;
  iceServers?: Array<{ urls: string | string[] }>;
  signalingEndpoint?: string;
  counterpart: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl: string;
    role: "CREATOR" | "FAN";
  };
  restrictionReason?: string;
}

export const DEFAULT_SESSION_TIERS: SessionPricingTier[] = [
  {
    id: "tier_30m",
    durationMinutes: 30,
    priceFiatCents: 10000, // €100
    currency: "EUR",
    tokenEquivalent: 1000,
    title: "30 minutes — €100",
    description: "Personal 1-on-1 private HD video session with creator",
    isEnabled: true,
  },
  {
    id: "tier_45m",
    durationMinutes: 45,
    priceFiatCents: 14000, // €140
    currency: "EUR",
    tokenEquivalent: 1400,
    title: "45 minutes — €140",
    description: "Extended private show with interactive requests and private chat",
    isEnabled: true,
  },
  {
    id: "tier_60m",
    durationMinutes: 60,
    priceFiatCents: 18000, // €180
    currency: "EUR",
    tokenEquivalent: 1800,
    title: "60 minutes — €180",
    description: "Ultimate VIP 1-hour private show and full attention",
    isEnabled: true,
  },
];

export const DEFAULT_WEEKLY_SCHEDULE: DayAvailabilitySchedule[] = [
  {
    dayOfWeek: 0, // Sunday
    dayName: "Sunday",
    isEnabled: true,
    timeWindows: [{ startTime: "18:00", endTime: "23:00" }],
  },
  {
    dayOfWeek: 1, // Monday
    dayName: "Monday",
    isEnabled: true,
    timeWindows: [{ startTime: "18:00", endTime: "23:00" }],
  },
  {
    dayOfWeek: 2, // Tuesday
    dayName: "Tuesday",
    isEnabled: true,
    timeWindows: [{ startTime: "18:00", endTime: "23:00" }],
  },
  {
    dayOfWeek: 3, // Wednesday
    dayName: "Wednesday",
    isEnabled: true,
    timeWindows: [{ startTime: "18:00", endTime: "23:00" }],
  },
  {
    dayOfWeek: 4, // Thursday
    dayName: "Thursday",
    isEnabled: true,
    timeWindows: [{ startTime: "18:00", endTime: "23:00" }],
  },
  {
    dayOfWeek: 5, // Friday
    dayName: "Friday",
    isEnabled: true,
    timeWindows: [{ startTime: "18:00", endTime: "23:30" }],
  },
  {
    dayOfWeek: 6, // Saturday
    dayName: "Saturday",
    isEnabled: true,
    timeWindows: [{ startTime: "18:00", endTime: "23:30" }],
  },
];
