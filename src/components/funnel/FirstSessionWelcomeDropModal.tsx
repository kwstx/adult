"use client";

import React from "react";
import { Sparkles, Gift, Coins, Trophy, Zap, X, ArrowRight } from "lucide-react";

interface FirstSessionWelcomeDropModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClaim: () => void;
  isClaiming: boolean;
  creatorName?: string;
  onOpenGiftDrawer?: () => void;
}

export function FirstSessionWelcomeDropModal({
  isOpen,
  onClose,
  onClaim,
  isClaiming,
  creatorName = "Creator",
  onOpenGiftDrawer,
}: FirstSessionWelcomeDropModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-amber-500/40 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black p-6 text-center shadow-[0_0_80px_rgba(245,158,11,0.25)] animate-slide-up">
        {/* Ambient Glows */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-48 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-0 h-48 w-48 rounded-full bg-pink-600/20 blur-3xl" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Floating Gift Box Badge */}
        <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-amber-500 via-pink-500 to-rose-600 shadow-xl shadow-pink-600/30 ring-4 ring-amber-400/20 animate-bounce">
          <Gift className="h-10 w-10 text-white" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-400" />
          </span>
        </div>

        {/* Header Title */}
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-amber-300 border border-amber-500/30 mb-2">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          First-Session Discovery Gift
        </div>

        <h2 className="text-xl font-black text-white sm:text-2xl tracking-tight">
          Welcome to <span className="bg-gradient-to-r from-pink-400 via-amber-300 to-amber-400 bg-clip-text text-transparent">AuraLive</span>!
        </h2>
        <p className="mt-1 text-xs text-zinc-300 leading-relaxed max-w-xs mx-auto">
          You reached your first discovery milestone watching {creatorName}. Claim your welcome package:
        </p>

        {/* Reward Cards Grid */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          {/* Card 1: 50 Free Bonus Tokens */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 backdrop-blur-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 mb-1.5">
              <Coins className="h-5 w-5" />
            </div>
            <span className="text-lg font-black text-amber-300">+50 Tokens</span>
            <span className="text-[10px] font-semibold text-zinc-400 mt-0.5">Free Bonus Lot</span>
          </div>

          {/* Card 2: 100 Platform XP */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-purple-500/30 bg-purple-500/10 p-3.5 backdrop-blur-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20 text-purple-400 mb-1.5">
              <Zap className="h-5 w-5" />
            </div>
            <span className="text-lg font-black text-purple-300">+100 XP</span>
            <span className="text-[10px] font-semibold text-zinc-400 mt-0.5">Platform Quest XP</span>
          </div>
        </div>

        {/* Achievement Unlocked Pill */}
        <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-zinc-900/90 border border-zinc-800 p-2 text-xs text-zinc-300">
          <Trophy className="h-4 w-4 text-amber-400 shrink-0" />
          <span className="text-[11px] font-medium">Achievement: <strong className="text-white">First Discovery Pioneer 🌟</strong></span>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={async () => {
              await onClaim();
              if (onOpenGiftDrawer) {
                onOpenGiftDrawer();
              }
            }}
            disabled={isClaiming}
            className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-pink-600 to-rose-600 py-3 px-6 text-sm font-black text-white shadow-xl shadow-pink-600/30 hover:opacity-95 active:scale-95 disabled:opacity-50 transition-all"
          >
            {isClaiming ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Claiming Double-Entry Tokens...</span>
              </>
            ) : (
              <>
                <span>Claim 50 Free Tokens Now</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="text-xs font-semibold text-zinc-400 hover:text-white py-1 transition-colors"
          >
            Explore live feed first
          </button>
        </div>
      </div>
    </div>
  );
}
