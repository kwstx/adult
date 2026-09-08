"use client";

import React from "react";
import { Flame, Sparkles, Trophy, X, ArrowRight, Calendar } from "lucide-react";

interface FirstSessionReturnBannerProps {
  isVisible: boolean;
  onClose: () => void;
  creatorName?: string;
}

export function FirstSessionReturnBanner({
  isVisible,
  onClose,
  creatorName = "Creator",
}: FirstSessionReturnBannerProps) {
  if (!isVisible) return null;

  return (
    <div className="absolute top-16 left-4 right-4 z-40 animate-slide-up pointer-events-auto">
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur-xl">
        {/* Glow */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-amber-500/20 blur-2xl" />

        {/* Dismiss Button */}
        <button
          onClick={onClose}
          className="absolute right-2.5 top-2.5 rounded-full p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 text-white shadow-lg shadow-amber-500/30">
            <Flame className="h-5 w-5" />
          </div>

          <div className="flex-1 pr-4">
            <div className="flex items-center gap-1.5 text-xs font-black text-amber-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>FIRST SESSION COMPLETED!</span>
            </div>

            <p className="mt-0.5 text-xs font-semibold text-white">
              🔥 1-Day Streak active with {creatorName}!
            </p>

            <p className="mt-1 text-[11px] text-zinc-300 leading-relaxed">
              Return tomorrow for your <strong className="text-amber-300">Day 2 Streak Bonus</strong> (+25% XP multiplier & Free Daily Wheel Spin).
            </p>

            <div className="mt-2.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 border border-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
                <Calendar className="h-3 w-3 text-pink-400" />
                Day 2 Unlock Ready in 24h
              </span>
              <button
                onClick={onClose}
                className="text-[10px] font-bold text-pink-400 hover:text-pink-300 underline transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
