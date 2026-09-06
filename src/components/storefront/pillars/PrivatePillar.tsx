"use client";

import React, { useState } from "react";
import {
  Video,
  Clock,
  Calendar,
  Coins,
  ShieldCheck,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  Lock,
  ArrowRight,
} from "lucide-react";
import { PrivatePillarData, CreatorIdentity, CheckoutItemPayload, PrivateDurationTier } from "../types";

interface PrivatePillarProps {
  creator: CreatorIdentity;
  privateData: PrivatePillarData;
  onOpenCheckout: (item: CheckoutItemPayload) => void;
}

export function PrivatePillar({ creator, privateData, onOpenCheckout }: PrivatePillarProps) {
  const [selectedDuration, setSelectedDuration] = useState<PrivateDurationTier>(
    privateData.durationTiers[1] || privateData.durationTiers[0]
  );
  const [selectedDay, setSelectedDay] = useState(privateData.availableDays[0]?.day || "Monday");
  const [selectedSlot, setSelectedSlot] = useState(
    privateData.availableDays[0]?.slots[0] || "18:00 UTC"
  );
  const [customNotes, setCustomNotes] = useState("");

  const currentDaySlots =
    privateData.availableDays.find((d) => d.day === selectedDay)?.slots || [];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1. Header Hero */}
      <div className="rounded-3xl bg-gradient-to-r from-purple-950/40 via-zinc-950 to-zinc-950 border border-purple-500/30 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex items-center gap-1 rounded-full bg-purple-500/20 px-3 py-0.5 text-xs font-bold text-purple-300 border border-purple-500/30">
                <Video className="h-3.5 w-3.5 text-purple-400" />
                1-on-1 Private HD Video Session
              </span>
              <span className="flex items-center gap-1 text-xs text-zinc-400 font-semibold">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                End-to-End Encrypted WebRTC
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              Private 1-on-1 Video Shows & Direct Attention
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300 mt-1 max-w-2xl leading-relaxed">
              Book a dedicated private video session with {creator.displayName}. Crystal-clear 1080p WebRTC, private 2-way audio & video, and dedicated interactive requests.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-2xl bg-zinc-900/90 border border-zinc-800 p-3 shrink-0">
            <Coins className="h-5 w-5 text-amber-400" />
            <div>
              <p className="text-xs font-black text-white">{privateData.rateFormatted}</p>
              <p className="text-[10px] text-zinc-400">Escrow Protected</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Step 1: Select Duration */}
      <div className="space-y-3">
        <h4 className="text-sm font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
          <Clock className="h-4 w-4 text-purple-400" />
          Step 1: Choose Session Duration
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {privateData.durationTiers.map((tier) => {
            const isSelected = selectedDuration.durationMinutes === tier.durationMinutes;

            return (
              <div
                key={tier.durationMinutes}
                onClick={() => setSelectedDuration(tier)}
                className={`group relative flex flex-col justify-between rounded-3xl p-5 border cursor-pointer transition-all ${
                  isSelected
                    ? "bg-purple-950/30 border-purple-500 shadow-xl shadow-purple-500/20 ring-1 ring-purple-500"
                    : "bg-zinc-950 border-zinc-800/90 hover:border-zinc-700"
                }`}
              >
                {tier.popular && (
                  <span className="absolute -top-2.5 right-4 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 px-2.5 py-0.5 text-[9px] font-black uppercase text-white shadow-md">
                    Popular VIP
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 font-black text-sm border border-purple-500/20">
                      {tier.durationMinutes}m
                    </span>
                    <span className="text-lg font-black text-white">{tier.priceFiatFormatted}</span>
                  </div>

                  <h5 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                    {tier.title}
                  </h5>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{tier.desc}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-900 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs font-black text-amber-400">
                    <Coins className="h-3.5 w-3.5" />
                    {tier.totalCredits} Tokens
                  </span>
                  {isSelected && (
                    <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Step 2: Select Date & Time Slot */}
      <div className="space-y-3">
        <h4 className="text-sm font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-purple-400" />
          Step 2: Choose Available Slot
        </h4>

        <div className="rounded-3xl bg-zinc-950 border border-zinc-800/90 p-6 shadow-xl space-y-5">
          {/* Day Selector */}
          <div>
            <label className="text-xs font-bold text-zinc-400 block mb-2">Select Day:</label>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {privateData.availableDays.map((d) => (
                <button
                  key={d.day}
                  onClick={() => {
                    setSelectedDay(d.day);
                    if (d.slots[0]) setSelectedSlot(d.slots[0]);
                  }}
                  className={`rounded-2xl px-4 py-2 text-xs font-bold transition-all shrink-0 ${
                    selectedDay === d.day
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                      : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
                  }`}
                >
                  {d.day}
                </button>
              ))}
            </div>
          </div>

          {/* Time Slot Selector */}
          <div>
            <label className="text-xs font-bold text-zinc-400 block mb-2">
              Available Timeslots (UTC Timezone):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {currentDaySlots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setSelectedSlot(slot)}
                  className={`flex items-center justify-center gap-2 rounded-2xl py-3 text-xs font-bold border transition-all ${
                    selectedSlot === slot
                      ? "bg-purple-500/20 border-purple-500 text-purple-300 ring-1 ring-purple-500"
                      : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-850"
                  }`}
                >
                  <Clock className="h-3.5 w-3.5 text-zinc-400" />
                  <span>{slot}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Special Requests Field */}
          <div>
            <label className="text-xs font-bold text-zinc-400 block mb-2">
              Custom Notes / Preferences for Creator (Optional):
            </label>
            <textarea
              rows={2}
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="e.g. Cosplay theme, custom music request, or specific topics you'd like to talk about..."
              className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 p-3 text-xs text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* Reservation CTA Bar */}
          <div className="pt-4 border-t border-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-zinc-400">
                Selected: <strong className="text-white">{selectedDuration.durationMinutes} Mins</strong> on{" "}
                <strong className="text-purple-400">{selectedDay} @ {selectedSlot}</strong>
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Funds held securely in escrow until session successfully finishes.
              </p>
            </div>

            <button
              onClick={() =>
                onOpenCheckout({
                  checkoutType: "PRIVATE_BOOKING",
                  title: `1-on-1 Session (${selectedDuration.durationMinutes}m)`,
                  subtitle: `${selectedDay} @ ${selectedSlot} with ${creator.displayName}`,
                  priceCredits: selectedDuration.totalCredits,
                  priceFiatFormatted: selectedDuration.priceFiatFormatted,
                  badge: "1-on-1 Private",
                  creatorProfileId: creator.id,
                  durationMinutes: selectedDuration.durationMinutes,
                  slotTime: `${selectedDay} ${selectedSlot}`,
                  customNotesRequired: false,
                })
              }
              className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 px-6 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-xl shadow-purple-600/30 hover:brightness-110 active:scale-95 transition-all"
            >
              <Video className="h-4 w-4" />
              <span>Confirm & Reserve ({selectedDuration.totalCredits} Tokens)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Priority Direct Messaging Card */}
      <div className="rounded-3xl bg-zinc-950 border border-zinc-800/90 p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
            <MessageSquare className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Direct VIP Fan-to-Creator Messaging</h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Send guaranteed-priority text & photo messages directly to {creator.displayName}&apos;s verified inbox.
            </p>
          </div>
        </div>

        <Link
          href={`/messages?creatorId=${creator.id}`}
          className="flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-pink-500/50 px-5 py-3 text-xs font-bold text-pink-300 hover:text-white transition-colors shrink-0"
        >
          <span>Open Direct Chat ({privateData.messagePriceCredits} Tokens)</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
