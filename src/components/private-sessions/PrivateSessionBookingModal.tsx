"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Coins,
  CreditCard,
  Lock,
  Sparkles,
  Video,
  X,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
  ArrowLeft,
  Bell,
  Wallet,
} from "lucide-react";
import { useUser } from "@/lib/user-context";
import {
  BookableSlot,
  PrivateBookingRecord,
  SessionPricingTier,
  SlotReservationHold,
} from "@/modules/private-sessions/types";
import Link from "next/link";

interface PrivateSessionBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorId?: string;
  creatorDisplayName?: string;
  creatorAvatarUrl?: string;
  creatorUsername?: string;
}

export function PrivateSessionBookingModal({
  isOpen,
  onClose,
  creatorId = "creator_maya",
  creatorDisplayName = "Maya Velvet ✨",
  creatorAvatarUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
  creatorUsername = "mayavelvet",
}: PrivateSessionBookingModalProps) {
  const { currentUser, updateBalance } = useUser();

  // Step state: 1 = Duration & Date, 2 = Slot Selection, 3 = Hold & Checkout, 4 = Confirmed
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form selections
  const [selectedDuration, setSelectedDuration] = useState<number>(30); // 30, 45, 60
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [availableSlots, setAvailableSlots] = useState<BookableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<BookableSlot | null>(null);
  const [activeHold, setActiveHold] = useState<SlotReservationHold | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<PrivateBookingRecord | null>(null);
  const [fanNotes, setFanNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"WALLET_TOKENS" | "FIAT_CARD">("WALLET_TOKENS");

  // Loading & Error States
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isReserving, setIsReserving] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Hold Timer countdown
  const [holdTimeLeft, setHoldTimeLeft] = useState<number>(600); // 10 minutes

  // Reset modal on open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedDuration(30);
      setSelectedSlot(null);
      setActiveHold(null);
      setConfirmedBooking(null);
      setErrorMessage(null);
      loadSlots(30, selectedDate);
    }
  }, [isOpen, creatorId]);

  // Load Bookable Slots from Backend
  const loadSlots = async (duration: number, date: string) => {
    try {
      setIsLoadingSlots(true);
      setErrorMessage(null);
      const res = await fetch(
        `/api/private-sessions/slots?creatorId=${creatorId}&date=${date}&duration=${duration}`
      );
      const data = await res.json();
      if (res.ok && data.slots) {
        setAvailableSlots(data.slots);
      } else {
        setAvailableSlots([]);
      }
    } catch (err) {
      console.error("Failed to load slots:", err);
      setErrorMessage("Failed to load available slots.");
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handleDurationChange = (duration: number) => {
    setSelectedDuration(duration);
    setSelectedSlot(null);
    loadSlots(duration, selectedDate);
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    loadSlots(selectedDuration, date);
  };

  // Step 2 -> 3: Fan selects slot -> Backend creates temporary 10-minute hold lock
  const handleSelectSlotAndHold = async (slot: BookableSlot) => {
    try {
      setIsReserving(true);
      setErrorMessage(null);
      setSelectedSlot(slot);

      const res = await fetch("/api/private-sessions/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorId,
          fanId: currentUser.id,
          startTimeUtc: slot.startTimeUtc,
          endTimeUtc: slot.endTimeUtc,
          displayTime: slot.displayTime,
          durationMinutes: slot.durationMinutes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to reserve slot.");
      }

      setActiveHold(data.hold);
      setHoldTimeLeft(data.hold.ttlRemainingSeconds || 600);
      setStep(3);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to reserve slot.");
    } finally {
      setIsReserving(false);
    }
  };

  // Step 3 Countdown timer for 10-minute hold lock
  useEffect(() => {
    if (step !== 3 || !activeHold) return;

    const interval = setInterval(() => {
      setHoldTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setErrorMessage("Your temporary hold has expired. Please choose a slot again.");
          setStep(1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [step, activeHold]);

  // Step 3 -> 4: Fan pays -> Payment succeeds -> Booking confirmed & creator notified
  const handlePayAndConfirm = async () => {
    if (!activeHold) return;

    try {
      setIsPaying(true);
      setErrorMessage(null);

      const res = await fetch("/api/private-sessions/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationId: activeHold.reservationId,
          fanUser: {
            id: currentUser.id,
            displayName: currentUser.displayName,
            username: currentUser.username,
            avatarUrl: currentUser.avatarUrl,
          },
          creatorUser: {
            id: creatorId,
            displayName: creatorDisplayName,
            username: creatorUsername,
            avatarUrl: creatorAvatarUrl,
          },
          paymentMethod,
          fanNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Payment execution failed.");
      }

      // Update local wallet balance if tokens paid
      if (paymentMethod === "WALLET_TOKENS") {
        updateBalance(Math.max(0, currentUser.walletBalance - activeHold.priceTokens));
      }

      setConfirmedBooking(data.booking);
      setStep(4);
    } catch (err: any) {
      setErrorMessage(err.message || "Payment failed. Please try again.");
    } finally {
      setIsPaying(false);
    }
  };

  if (!isOpen) return null;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800/80 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <img
              src={creatorAvatarUrl}
              alt={creatorDisplayName}
              className="h-10 w-10 rounded-2xl object-cover ring-1 ring-pink-500/50"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">{creatorDisplayName}</h3>
                <span className="flex items-center gap-1 rounded-full bg-pink-500/10 px-2 py-0.5 text-[10px] font-bold text-pink-400 border border-pink-500/20">
                  <Video className="h-3 w-3" />
                  1-on-1 Private
                </span>
              </div>
              <p className="text-xs text-zinc-400">Book Private HD Video Session</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-2xl bg-rose-500/15 border border-rose-500/30 p-3 text-xs font-bold text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* ========================================================= */}
          {/* STEP 1 & 2: DURATION, DATE & AVAILABLE SLOTS               */}
          {/* ========================================================= */}
          {(step === 1 || step === 2) && (
            <div className="space-y-6">
              {/* 1. Duration Selector (30m - €100, 45m - €140, 60m - €180) */}
              <div>
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-2.5">
                  1. Choose Duration & Tier
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { duration: 30, priceEur: 100, tokens: 1000 },
                    { duration: 45, priceEur: 140, tokens: 1400 },
                    { duration: 60, priceEur: 180, tokens: 1800 },
                  ].map((tier) => (
                    <button
                      key={tier.duration}
                      onClick={() => handleDurationChange(tier.duration)}
                      className={`rounded-2xl p-3.5 text-center border transition-all ${
                        selectedDuration === tier.duration
                          ? "bg-pink-600/15 border-pink-500 shadow-lg shadow-pink-500/10 ring-1 ring-pink-500 text-white"
                          : "bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                      }`}
                    >
                      <p className="text-xs font-black text-white">{tier.duration} Minutes</p>
                      <p className="text-base font-extrabold text-pink-400 mt-1">€{tier.priceEur}</p>
                      <p className="text-[10px] text-zinc-500">{tier.tokens} tokens</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Date Picker */}
              <div>
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-2.5">
                  2. Select Date
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              {/* 3. Available Bookable Slots */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    3. Available Slots ({availableSlots.filter((s) => s.isAvailable).length})
                  </label>
                  <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live System Availability
                  </span>
                </div>

                {isLoadingSlots ? (
                  <div className="py-8 text-center text-xs text-zinc-500">
                    Generating available time slots...
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="rounded-2xl bg-zinc-900/50 p-6 text-center text-xs text-zinc-400 border border-zinc-800">
                    No available slots on this date. Please select another date.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.slotId}
                        disabled={!slot.isAvailable || isReserving}
                        onClick={() => handleSelectSlotAndHold(slot)}
                        className={`rounded-2xl p-3 text-center border transition-all flex flex-col items-center justify-center ${
                          slot.isAvailable
                            ? "bg-zinc-900 hover:bg-pink-600/20 border-zinc-800 hover:border-pink-500 text-white cursor-pointer group"
                            : "bg-zinc-950 border-zinc-900 text-zinc-600 opacity-40 cursor-not-allowed"
                        }`}
                      >
                        <span className="text-sm font-black text-white group-hover:text-pink-300">
                          {slot.displayTime}
                        </span>
                        <span
                          className={`text-[10px] font-bold mt-0.5 ${
                            slot.isAvailable ? "text-emerald-400" : "text-zinc-600"
                          }`}
                        >
                          {slot.isAvailable ? "Available" : "Unavailable"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 3: TEMPORARY HOLD & CHECKOUT PAYMENT                 */}
          {/* ========================================================= */}
          {step === 3 && activeHold && (
            <div className="space-y-6">
              {/* Hold Lock Banner */}
              <div className="rounded-2xl bg-gradient-to-r from-amber-500/15 via-pink-500/15 to-transparent border border-amber-500/30 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-amber-400" />
                    <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
                      Slot Temporarily Held
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-black text-amber-400 border border-amber-500/30">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formatTimer(holdTimeLeft)}</span>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-300 mt-1.5">
                  The backend has temporarily reserved <strong className="text-white">{activeHold.displayTime}</strong> for you. Complete payment before the timer expires to confirm your booking.
                </p>
              </div>

              {/* Booking Summary Box */}
              <div className="rounded-2xl bg-zinc-900/80 p-4 border border-zinc-800 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Creator:</span>
                  <span className="font-bold text-white">{creatorDisplayName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Scheduled Time:</span>
                  <span className="font-bold text-pink-400">
                    {selectedDate} at {activeHold.displayTime} ({activeHold.durationMinutes} min)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Total Price:</span>
                  <span className="font-bold text-white">
                    €{(activeHold.priceFiatCents / 100).toFixed(0)} ({activeHold.priceTokens} tokens)
                  </span>
                </div>
              </div>

              {/* Fan Optional Notes */}
              <div>
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-1">
                  Private Session Notes (Optional)
                </label>
                <textarea
                  value={fanNotes}
                  onChange={(e) => setFanNotes(e.target.value)}
                  placeholder="Special requests, favorite topics, or questions for Maya..."
                  rows={2}
                  className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500"
                />
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-2">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentMethod("WALLET_TOKENS")}
                    className={`rounded-2xl p-3.5 text-left border transition-all ${
                      paymentMethod === "WALLET_TOKENS"
                        ? "bg-pink-600/15 border-pink-500 text-white ring-1 ring-pink-500"
                        : "bg-zinc-900/80 border-zinc-800 text-zinc-400"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-amber-400" />
                      <span className="text-xs font-bold">Wallet Tokens</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-1">
                      Balance: {currentUser.walletBalance.toLocaleString()} tokens
                    </p>
                  </button>

                  <button
                    onClick={() => setPaymentMethod("FIAT_CARD")}
                    className={`rounded-2xl p-3.5 text-left border transition-all ${
                      paymentMethod === "FIAT_CARD"
                        ? "bg-pink-600/15 border-pink-500 text-white ring-1 ring-pink-500"
                        : "bg-zinc-900/80 border-zinc-800 text-zinc-400"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-pink-400" />
                      <span className="text-xs font-bold">Credit Card / SEPA</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-1">Instant Fiat Checkout (€)</p>
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setStep(1)}
                  disabled={isPaying}
                  className="flex items-center gap-1 rounded-2xl bg-zinc-900 px-4 py-3 text-xs font-bold text-zinc-400 hover:text-white border border-zinc-800"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Change Slot
                </button>

                <button
                  onClick={handlePayAndConfirm}
                  disabled={isPaying}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 py-3 text-sm font-black text-white shadow-xl shadow-pink-600/30 hover:brightness-110 disabled:opacity-50"
                >
                  {isPaying ? (
                    "Authorizing Payment..."
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      <span>Pay €{(activeHold.priceFiatCents / 100).toFixed(0)} & Confirm Booking</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 4: BOOKING CONFIRMED RECEIPT                         */}
          {/* ========================================================= */}
          {step === 4 && confirmedBooking && (
            <div className="text-center space-y-6 py-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-pink-600 to-amber-500 text-white mx-auto shadow-xl shadow-pink-600/30 animate-bounce">
                <Sparkles className="h-8 w-8" />
              </div>

              <div>
                <h3 className="text-xl font-black text-white">Booking Confirmed! 🎉</h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                  The payment succeeded and the creator has received your booking.
                </p>
              </div>

              {/* Confirmation Details Card */}
              <div className="rounded-3xl bg-zinc-900/90 border border-zinc-800 p-5 text-left text-xs space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                  <span className="text-zinc-400">Booking Reference:</span>
                  <span className="font-mono text-zinc-300 font-bold">{confirmedBooking.id}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Creator:</span>
                  <span className="font-bold text-white">{confirmedBooking.creator.displayName}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Scheduled Time:</span>
                  <span className="font-bold text-pink-400">
                    {confirmedBooking.displayDate} at {confirmedBooking.displayStartTime} - {confirmedBooking.displayEndTime}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Duration:</span>
                  <span className="font-bold text-white">{confirmedBooking.durationMinutes} Minutes</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Amount Paid:</span>
                  <span className="font-bold text-emerald-400">
                    {confirmedBooking.priceFiatFormatted} ({confirmedBooking.priceTokens} Tokens)
                  </span>
                </div>
              </div>

              {/* Reminder Banner */}
              <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 flex items-center gap-3 text-left">
                <Bell className="h-5 w-5 text-emerald-400 shrink-0" />
                <p className="text-[11px] text-emerald-200">
                  <strong>Reminder Scheduled:</strong> You will receive a reminder before your session starts. At the scheduled time, both you and Maya will receive authorization to enter the private media room.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={onClose}
                  className="w-full sm:w-1/2 rounded-2xl bg-zinc-900 py-3 text-xs font-bold text-zinc-300 hover:text-white border border-zinc-800"
                >
                  Close
                </button>

                <Link
                  href={`/private-room/${confirmedBooking.id}`}
                  className="w-full sm:w-1/2 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 py-3 text-xs font-black text-white shadow-xl shadow-pink-600/30 hover:brightness-110"
                >
                  <Video className="h-4 w-4" />
                  <span>Go to Private Room</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
