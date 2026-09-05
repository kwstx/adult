"use client";

import React, { useState } from "react";
import { X, Target, Sparkles, Coins, Zap, Trophy, Heart } from "lucide-react";
import { useUser } from "@/lib/user-context";

interface InteractionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  creatorId: string;
  creatorName: string;
  goalTitle: string;
  goalProgress: number;
  goalTarget: number;
  onOpenGiftDrawer: () => void;
  onOpenWalletModal: () => void;
}

export function InteractionDrawer({
  isOpen,
  onClose,
  creatorId,
  creatorName,
  goalTitle,
  goalProgress,
  goalTarget,
  onOpenGiftDrawer,
  onOpenWalletModal,
}: InteractionDrawerProps) {
  const { currentUser, updateBalance } = useUser();
  const [chipAmount, setChipAmount] = useState(50);
  const [isChipping, setIsChipping] = useState(false);

  if (!isOpen) return null;

  const percentage = Math.min(100, Math.round((goalProgress / (goalTarget || 1)) * 100));
  const remaining = Math.max(0, goalTarget - goalProgress);

  const handleChipIn = async () => {
    if (currentUser.walletBalance < chipAmount) {
      onClose();
      onOpenWalletModal();
      return;
    }

    setIsChipping(true);
    try {
      const res = await fetch("/api/economic/tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fanUserId: currentUser.id,
          creatorId,
          credits: chipAmount,
          customMessage: `Chipped in ${chipAmount} tokens toward goal: ${goalTitle}! 🎯`,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        updateBalance(data.fanRemainingBalance);
        onClose();
      }
    } catch {
      // Error handling
    } finally {
      setIsChipping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center p-0 sm:p-4 animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 flex max-h-[85vh] sm:max-h-[600px] w-full max-w-lg flex-col rounded-t-3xl sm:rounded-3xl border border-zinc-800/90 bg-zinc-950/95 shadow-2xl backdrop-blur-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-4 bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white shadow-md">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">Live Stream Goal</h3>
              <p className="text-[11px] text-zinc-400">Collaborative audience milestone for {creatorName}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Main Goal Progress Card */}
          <div className="rounded-3xl bg-zinc-900/80 border border-zinc-800 p-5 shadow-inner">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-zinc-200">{goalTitle}</span>
              <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-black text-amber-400">
                {percentage}% Completed
              </span>
            </div>

            {/* Progress Bar */}
            <div className="h-3 w-full rounded-full bg-zinc-950 overflow-hidden p-0.5 border border-zinc-800 mb-3">
              <div
                className="h-full bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 rounded-full transition-all duration-500 shadow-md"
                style={{ width: `${percentage}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-400">
              <div className="flex items-center gap-1">
                <Coins className="h-3.5 w-3.5 text-amber-400" />
                <span className="font-extrabold text-white">{goalProgress.toLocaleString()}</span>
                <span>/ {goalTarget.toLocaleString()} Tokens</span>
              </div>
              <span>{remaining > 0 ? `${remaining.toLocaleString()} left` : "Goal Reached! 🎉"}</span>
            </div>
          </div>

          {/* Quick Chip In Options */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2 block">
              Chip In Instant Tokens
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[25, 50, 100, 250].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setChipAmount(amt)}
                  type="button"
                  className={`rounded-2xl py-2.5 text-xs font-extrabold transition-all ${
                    chipAmount === amt
                      ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
                      : "bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-850"
                  }`}
                >
                  +{amt} 🪙
                </button>
              ))}
            </div>
          </div>

          {/* Top Tippers Snapshot */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="h-4 w-4 text-amber-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Top Room Contributors
              </h4>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-zinc-300 font-medium">
                  <span className="text-amber-400 font-bold">#1</span> Alex Patron 💎
                </span>
                <span className="font-black text-amber-400">500 🪙</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-zinc-300 font-medium">
                  <span className="text-zinc-400 font-bold">#2</span> Neon Rider ⚡
                </span>
                <span className="font-black text-amber-400">180 🪙</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800/80 p-4 bg-zinc-900/70 flex items-center gap-3">
          <button
            onClick={() => {
              onClose();
              onOpenGiftDrawer();
            }}
            className="rounded-2xl bg-zinc-800 px-4 py-3 text-xs font-bold text-zinc-200 hover:bg-zinc-700 transition-colors"
          >
            Gift Menu
          </button>
          <button
            onClick={handleChipIn}
            disabled={isChipping}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-amber-500 py-3 font-bold text-white shadow-xl shadow-pink-600/30 hover:opacity-95 active:scale-95 disabled:opacity-40 transition-all"
          >
            <Sparkles className="h-4 w-4" />
            <span>Chip In {chipAmount} Tokens</span>
          </button>
        </div>
      </div>
    </div>
  );
}
