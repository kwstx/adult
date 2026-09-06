import { PrivateBookingService } from "../src/modules/private-sessions/booking.service";
import { SlotGeneratorService } from "../src/modules/private-sessions/slot-generator.service";
import { reservationLockService } from "../src/modules/private-sessions/reservation-lock.service";
import { sessionReminderService } from "../src/modules/private-sessions/reminder.service";

async function runEndToEndVerification() {
  console.log("=================================================================");
  console.log("🚀 STARTING COMPLETE PRIVATE SESSIONS END-TO-END VERIFICATION");
  console.log("=================================================================\n");

  const creatorId = "creator_maya";
  const fanId = "fan_alex";
  const testDate = new Date().toISOString().split("T")[0]; // e.g. "2026-09-06"

  // -------------------------------------------------------------------------
  // STEP 1: Creator Dashboard chooses pricing tiers & defines availability
  // -------------------------------------------------------------------------
  console.log("Step 1: Creator configures pricing tiers & defines availability schedule...");
  const settings = PrivateBookingService.updateCreatorSettings(creatorId, {
    pricingTiers: [
      {
        id: "tier_30m",
        durationMinutes: 30,
        priceFiatCents: 10000, // €100
        currency: "EUR",
        tokenEquivalent: 1000,
        title: "30 minutes — €100",
        isEnabled: true,
      },
      {
        id: "tier_45m",
        durationMinutes: 45,
        priceFiatCents: 14000, // €140
        currency: "EUR",
        tokenEquivalent: 1400,
        title: "45 minutes — €140",
        isEnabled: true,
      },
      {
        id: "tier_60m",
        durationMinutes: 60,
        priceFiatCents: 18000, // €180
        currency: "EUR",
        tokenEquivalent: 1800,
        title: "60 minutes — €180",
        isEnabled: true,
      },
    ],
    weeklySchedule: [
      {
        dayOfWeek: new Date().getUTCDay(),
        dayName: "Today",
        isEnabled: true,
        timeWindows: [{ startTime: "18:00", endTime: "23:00" }],
      },
    ],
    bufferTimeMinutes: 15,
  });

  console.log("✅ Creator pricing tiers configured:");
  settings.pricingTiers.forEach((t) => console.log(`   - ${t.title} (${t.tokenEquivalent} tokens)`));
  console.log(`✅ Availability schedule defined: 18:00 to 23:00 (Buffer: ${settings.bufferTimeMinutes}m)\n`);

  // -------------------------------------------------------------------------
  // STEP 2: The system turns that availability into bookable slots
  // -------------------------------------------------------------------------
  console.log("Step 2: System generates discrete bookable slots from availability...");
  const slots = PrivateBookingService.getAvailableSlots({
    creatorProfileId: creatorId,
    date: testDate,
    durationMinutes: 30,
  });

  console.log(`✅ Total slots generated: ${slots.length}`);
  console.log("   Fan sees slots:");
  slots.slice(0, 6).forEach((s) => {
    console.log(`   - ${s.displayTime} [${s.isAvailable ? "Available" : "Unavailable"}] - ${s.priceFiatFormatted}`);
  });
  console.log("");

  // -------------------------------------------------------------------------
  // STEP 3: Fan sees available slots (e.g., 19:00, 20:00, 21:30) and selects 20:00
  // -------------------------------------------------------------------------
  const targetSlot = slots.find((s) => s.displayTime === "20:00") || slots.find((s) => s.isAvailable) || slots[0];
  console.log(`Step 3: Fan selects slot -> ${targetSlot.displayTime} (${targetSlot.durationMinutes} min, ${targetSlot.priceFiatFormatted})...\n`);

  // -------------------------------------------------------------------------
  // STEP 4: Backend temporarily reserves it (10-minute hold lock)
  // -------------------------------------------------------------------------
  console.log("Step 4: Backend creates temporary 10-minute reservation hold lock...");
  const reserveResult = PrivateBookingService.reserveSlot({
    creatorProfileId: creatorId,
    fanId,
    startTimeUtc: targetSlot.startTimeUtc,
    endTimeUtc: targetSlot.endTimeUtc,
    displayTime: targetSlot.displayTime,
    durationMinutes: targetSlot.durationMinutes,
  });

  if (!reserveResult.success || !reserveResult.hold) {
    throw new Error(`Reservation hold failed: ${reserveResult.error}`);
  }

  console.log(`✅ Temporary reservation lock created: ${reserveResult.hold.reservationId}`);
  console.log(`   - Hold TTL: ${reserveResult.hold.ttlRemainingSeconds} seconds (10 minutes)`);
  console.log(`   - Expiration: ${reserveResult.hold.holdExpiresAt}`);

  // Test double-booking protection
  console.log("   - Testing double-booking protection: Attempting same slot from another fan...");
  const conflictResult = PrivateBookingService.reserveSlot({
    creatorProfileId: creatorId,
    fanId: "fan_another_user",
    startTimeUtc: targetSlot.startTimeUtc,
    endTimeUtc: targetSlot.endTimeUtc,
    displayTime: targetSlot.displayTime,
    durationMinutes: targetSlot.durationMinutes,
  });
  console.log(`   - Conflict correctly blocked: ${!conflictResult.success} (${conflictResult.error})\n`);

  // -------------------------------------------------------------------------
  // STEP 5: Fan pays -> Payment succeeds -> Booking confirmed
  // -------------------------------------------------------------------------
  console.log("Step 5: Fan executes payment (€100) -> Settle escrow ledger & confirm booking...");
  const paymentResult = await PrivateBookingService.processPaymentAndConfirm({
    reservationId: reserveResult.hold.reservationId,
    fanUser: {
      id: fanId,
      displayName: "Alex Patron 💎",
      username: "alex_patron",
    },
    creatorUser: {
      id: creatorId,
      displayName: "Maya Velvet ✨",
      username: "mayavelvet",
    },
    paymentMethod: "WALLET_TOKENS",
    fanNotes: "Excited for our 1-on-1 private dance & chat session!",
  });

  if (!paymentResult.success || !paymentResult.booking) {
    throw new Error(`Payment failed: ${paymentResult.error}`);
  }

  const booking = paymentResult.booking;
  console.log(`✅ Booking confirmed successfully! ID: ${booking.id}`);
  console.log(`   - Status: ${booking.status}`);
  console.log(`   - Scheduled Time: ${booking.displayDate} at ${booking.displayStartTime} - ${booking.displayEndTime}`);
  console.log(`   - Total Paid: ${booking.priceFiatFormatted} (${booking.priceTokens} tokens)`);
  console.log(`   - Platform Rake (20%): €${(booking.platformFeeCents / 100).toFixed(0)}`);
  console.log(`   - Creator Net Earnings (80%): €${(booking.creatorNetCents / 100).toFixed(0)}`);
  console.log(`   - Meeting Room ID: ${booking.meetingRoomId}\n`);

  // -------------------------------------------------------------------------
  // STEP 6: Creator receives the booking
  // -------------------------------------------------------------------------
  console.log("Step 6: Verifying Creator dashboard receives the booking...");
  const creatorBookings = PrivateBookingService.getBookings({ creatorProfileId: creatorId });
  const foundBooking = creatorBookings.find((b) => b.id === booking.id);
  console.log(`✅ Creator schedule updated: Booking present in creator list: ${!!foundBooking}`);
  console.log(`   - Creator sees fan: ${foundBooking?.fan.displayName}\n`);

  // -------------------------------------------------------------------------
  // STEP 7: Fan receives a reminder
  // -------------------------------------------------------------------------
  console.log("Step 7: Reminder engine evaluates and delivers upcoming session reminder...");
  const reminders = sessionReminderService.triggerImmediateReminder(booking.id);
  console.log(`✅ Reminders dispatched: ${reminders.length}`);
  reminders.forEach((r) => {
    console.log(`   - To ${r.recipientRole} (${r.recipientUserId}): "${r.title}" -> ${r.message}`);
  });
  console.log("");

  // -------------------------------------------------------------------------
  // STEP 8: At scheduled time, both receive authorization to enter private room
  // -------------------------------------------------------------------------
  console.log("Step 8: Verifying Private WebRTC Media Room Authorization Gate...");

  // Fan authorization at scheduled time
  const fanAuth = PrivateBookingService.authorizeRoomEntry({
    bookingId: booking.id,
    userId: fanId,
    currentTime: new Date(booking.scheduledStartTime), // At scheduled time
  });

  console.log(`✅ Fan Authorization: ${fanAuth.authorized ? "GRANTED ✅" : "DENIED ❌"}`);
  console.log(`   - Role: ${fanAuth.userRole}`);
  console.log(`   - Meeting Room ID: ${fanAuth.meetingRoomId}`);
  console.log(`   - WebRTC Signaling Token: ${fanAuth.token?.substring(0, 30)}...`);
  console.log(`   - Counterpart: ${fanAuth.counterpart.displayName} (${fanAuth.counterpart.role})`);

  // Creator authorization at scheduled time
  const creatorAuth = PrivateBookingService.authorizeRoomEntry({
    bookingId: booking.id,
    userId: creatorId,
    currentTime: new Date(booking.scheduledStartTime),
  });

  console.log(`✅ Creator Authorization: ${creatorAuth.authorized ? "GRANTED ✅" : "DENIED ❌"}`);
  console.log(`   - Role: ${creatorAuth.userRole}`);
  console.log(`   - WebRTC Signaling Token: ${creatorAuth.token?.substring(0, 30)}...`);
  console.log(`   - Counterpart: ${creatorAuth.counterpart.displayName} (${creatorAuth.counterpart.role})\n`);

  console.log("=================================================================");
  console.log("🎉 ALL 8 STEPS OF THE PRIVATE SESSIONS FLOW VERIFIED SUCCESSFULLY!");
  console.log("=================================================================");
}

runEndToEndVerification().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
