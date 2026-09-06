"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Radio,
  Flame,
  Sparkles,
  Users,
  Coins,
  Clock,
  Zap,
  Volume2,
  VolumeX,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { LivePillarData, CreatorIdentity, CheckoutItemPayload } from "../types";

interface LivePillarProps {
  creator: CreatorIdentity;
  live: LivePillarData;
  onOpenCheckout: (item: CheckoutItemPayload) => void;
}

export function LivePillar({ creator, live, onOpenCheckout }: LivePillarProps) {
  const [isMuted, setIsMuted] = useState(true);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1. Live Broadcast Preview / Status Hero */}
      {live.isLive ? (
        <div className="rounded-3xl bg-zinc-950 border border-zinc-800/90 overflow-hidden shadow-2xl">
          <div className="relative aspect-video w-full max-h-[460px] bg-black">
            {/* Live Video Element */}
            <video
              src={live.playbackHlsUrl}
              autoPlay
              playsInline
              loop
              muted={isMuted}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />

            {/* Top Left Live Indicator */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span className="flex items-center gap-2 rounded-full bg-rose-600/90 backdrop-blur-xl px-3 py-1 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-rose-600/30 animate-pulse">
                <span className="h-2 w-2 rounded-full bg-white" />
                LIVE STREAM BROADCAST
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-xl px-3 py-1 text-xs font-bold text-zinc-200 border border-white/10">
                <Users className="h-3.5 w-3.5 text-pink-400" />
                {live.viewerCount.toLocaleString()} Viewers
              </span>
            </div>

            {/* Top Right Sound Toggle */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="flex items-center justify-center h-9 w-9 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 text-white hover:bg-black/80 transition-colors shadow-lg"
                title={isMuted ? "Unmute stream" : "Mute stream"}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </div>

            {/* Bottom Stream Title & Join Room CTA */}
            <div className="absolute bottom-4 left-4 right-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/70 backdrop-blur-xl p-4 rounded-2xl border border-white/10">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-black text-white truncate">
                  {live.streamTitle}
                </h3>
                <p className="text-xs text-zinc-400">
                  Interactive real-time chat, toy vibration triggers & VIP front-row seating enabled.
                </p>
              </div>

              <Link
                href={`/live/${creator.id}`}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-rose-600/30 hover:brightness-110 active:scale-95 transition-all shrink-0"
              >
                <span>Enter Live Room</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* Offline State Banner */
        <div className="rounded-3xl bg-zinc-950 border border-zinc-800/90 p-8 text-center shadow-xl">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-900 border border-zinc-800 mx-auto mb-4 text-zinc-500">
            <Radio className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-black text-white">Creator is Currently Offline</h3>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto mt-1 mb-4">
            Next scheduled broadcast: <strong className="text-pink-400">Tonight @ 21:00 UTC</strong>. You can still order live interactions, subscribe, or book private sessions below!
          </p>
          <div className="flex items-center justify-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full bg-pink-500/10 border border-pink-500/30 px-3.5 py-1 text-xs font-bold text-pink-400">
              <Sparkles className="h-3.5 w-3.5" />
              Notifications Enabled
            </span>
          </div>
        </div>
      )}

      {/* 2. Active Collective Stream Milestone Goal */}
      <div className="rounded-3xl bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800/90 p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                  Collective Stream Milestone
                </span>
                <span className="rounded-full bg-amber-500/20 px-2 py-0.2 text-[9px] font-bold text-amber-300">
                  {live.activeGoal.percentage}% Reached
                </span>
              </div>
              <h4 className="text-sm sm:text-base font-black text-white">
                {live.activeGoal.title}
              </h4>
            </div>
          </div>

          <button
            onClick={() =>
              onOpenCheckout({
                checkoutType: "INTERACTION",
                title: `Chip In: ${live.activeGoal.title}`,
                subtitle: "Collective Stream Milestone Contribution",
                priceCredits: 100,
                badge: "Goal Contribution",
                creatorProfileId: creator.id,
                customNotesRequired: true,
                customNotesLabel: "Optional supporter message on screen:",
              })
            }
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-600 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-95 transition-all shrink-0"
          >
            <Coins className="h-4 w-4" />
            <span>Chip In (100 Tokens)</span>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="h-3 w-full rounded-full bg-zinc-800 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-pink-500 shadow-md transition-all duration-500"
              style={{ width: `${live.activeGoal.percentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold">
            <span>{live.activeGoal.currentCredits.toLocaleString()} Tokens Contributed</span>
            <span>Target: {live.activeGoal.targetCredits.toLocaleString()} Tokens</span>
          </div>
        </div>
      </div>

      {/* 3. Live Interaction Menu (Tipping Triggers) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-pink-500" />
              Live Stream Interaction Menu
            </h3>
            <p className="text-xs text-zinc-400">
              Trigger real-time physical actions, sound effects, dances, and wheel spins directly on stream.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {live.interactionMenu.map((item) => (
            <div
              key={item.id}
              className="group flex flex-col justify-between rounded-3xl bg-zinc-950 border border-zinc-800/80 p-5 hover:border-pink-500/50 hover:shadow-xl hover:shadow-pink-500/10 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-900 text-2xl border border-zinc-800 group-hover:scale-110 transition-transform">
                    {item.iconUrl || "✨"}
                  </span>
                  <span className="flex items-center gap-1 rounded-xl bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-xs font-black text-amber-400">
                    <Coins className="h-3.5 w-3.5" />
                    {item.priceCredits}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white group-hover:text-pink-300 transition-colors">
                  {item.title}
                </h4>
                <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-900 flex items-center justify-between">
                <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                  <Clock className="h-3 w-3" />
                  {item.durationSeconds}s duration
                </span>

                <button
                  onClick={() =>
                    onOpenCheckout({
                      checkoutType: "INTERACTION",
                      title: item.title,
                      subtitle: item.description,
                      priceCredits: item.priceCredits,
                      badge: "Live Action",
                      creatorProfileId: creator.id,
                      interactionDefinitionId: item.id,
                      customNotesRequired: true,
                      customNotesLabel: "Custom dedication message to broadcast:",
                    })
                  }
                  className="rounded-xl bg-zinc-900 group-hover:bg-gradient-to-r group-hover:from-pink-600 group-hover:to-rose-600 px-3.5 py-1.5 text-xs font-black text-zinc-200 group-hover:text-white border border-zinc-800 group-hover:border-transparent transition-all"
                >
                  Trigger →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. VIP Front-Row Stage Seats */}
      <div className="rounded-3xl bg-zinc-950 border border-zinc-800/90 p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-400" />
              VIP Front-Row Stage Seats
            </h3>
            <p className="text-xs text-zinc-400">
              Claim a persistent highlighted front-row seat on stream with custom patron badge and spotlight.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {live.stageSeats.map((seat) => (
            <div
              key={seat.seatIndex}
              className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all ${
                seat.isOccupied
                  ? "bg-purple-950/20 border-purple-500/30"
                  : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
              }`}
            >
              <div className="relative mb-2">
                {seat.isOccupied && seat.currentUser ? (
                  <img
                    src={
                      seat.currentUser.avatarUrl ||
                      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80"
                    }
                    alt={seat.currentUser.displayName}
                    className="h-12 w-12 rounded-2xl object-cover ring-2 ring-purple-500"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-500 border border-zinc-700">
                    <Users className="h-5 w-5" />
                  </div>
                )}
              </div>

              <p className="text-xs font-bold text-white truncate max-w-[120px]">
                {seat.isOccupied && seat.currentUser
                  ? seat.currentUser.displayName
                  : `Seat #${seat.seatIndex + 1}`}
              </p>
              <p className="text-[10px] text-zinc-400">
                {seat.isOccupied ? "Occupied (VIP)" : `${seat.pricePerMinuteCredits} Tokens/min`}
              </p>

              {!seat.isOccupied && (
                <button
                  onClick={() =>
                    onOpenCheckout({
                      checkoutType: "INTERACTION",
                      title: `Claim Stage Seat #${seat.seatIndex + 1}`,
                      subtitle: "VIP Front-Row Broadcast Spotlight",
                      priceCredits: seat.pricePerMinuteCredits * 10,
                      badge: "10-Min Stage Seat",
                      creatorProfileId: creator.id,
                    })
                  }
                  className="mt-2 w-full rounded-xl bg-purple-600/80 hover:bg-purple-600 py-1 text-[11px] font-black text-white transition-colors"
                >
                  Claim Seat
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
