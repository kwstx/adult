"use client";

import React from "react";
import { Sparkles, Gift, Flame, ArrowRight, Zap, Check } from "lucide-react";

interface FirstSessionGuidePillProps {
  watchSeconds: number;
  isRewardClaimed: boolean;
  hasMadePurchase: boolean;
  onOpenRewardModal: () => void;
  onOpenGiftDrawer: () => void;
}

export function FirstSessionGuidePill({
  watchSeconds,
  isRewardClaimed,
  hasMadePurchase,
  onOpenRewardModal,
  onOpenGiftDrawer,
}: FirstSessionGuidePillProps) {
  const watchProgress = Math.min(Math.round((watchSeconds / 25) * 100), 100);

  // State 1: Watching towards 25s milestone
  if (watchSeconds < 25 && !isRewardClaimed) {
    return (
      <div className="flex items-center gap-2 rounded-full bg-black/75 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-white border border-pink-500/30 shadow-lg pointer-events-auto">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500" />
        </span>
        <span>Watch live to unlock welcome gift: <strong className="text-amber-300">{25 - watchSeconds}s</strong></span>
        <div className="h-1.5 w-12 rounded-full bg-zinc-800 overflow-hidden ml-1">
          <div
            className="h-full bg-gradient-to-r from-pink-500 to-amber-400 transition-all duration-500"
            style={{ width: `${watchProgress}%` }}
          />
        </div>
      </div>
    );
  }

  // State 2: Reward unlocked, ready to claim
  if (!isRewardClaimed) {
    return (
      <button
        onClick={onOpenRewardModal}
        className="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 via-pink-600 to-rose-600 px-3.5 py-1 text-[11px] font-black text-white shadow-lg shadow-pink-600/40 hover:scale-105 active:scale-95 transition-transform pointer-events-auto animate-pulse"
      >
        <Gift className="h-3.5 w-3.5" />
        <span>🎁 50 Free Tokens Ready! Tap to Claim</span>
        <ArrowRight className="h-3 w-3" />
      </button>
    );
  }

  // State 3: Claimed, guide to first interaction/gift
  if (isRewardClaimed && !hasMadePurchase) {
    return (
      <button
        onClick={onOpenGiftDrawer}
        className="flex items-center gap-2 rounded-full bg-zinc-900/90 backdrop-blur-md px-3.5 py-1 text-[11px] font-bold text-amber-300 border border-amber-500/40 shadow-lg hover:border-amber-400 hover:scale-105 active:scale-95 transition-all pointer-events-auto"
      >
        <Zap className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
        <span>Try sending a gift with your 50 free tokens (Press G)</span>
        <ArrowRight className="h-3 w-3 text-pink-400" />
      </button>
    );
  }

  // State 4: First purchase made, streak active
  return (
    <div className="flex items-center gap-2 rounded-full bg-emerald-950/80 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-emerald-300 border border-emerald-500/40 shadow-lg pointer-events-auto">
      <Flame className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
      <span>🔥 Day 1 Streak Active! Supporter Level 2</span>
      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-black">
        <Check className="h-2.5 w-2.5" />
      </span>
    </div>
  );
}
