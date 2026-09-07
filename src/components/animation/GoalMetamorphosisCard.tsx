"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Trophy,
  Flame,
  Sparkles,
  Crown,
  Lock,
  Unlock,
  ArrowRight,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { GoalMetamorphosisAnimationPayload } from "@/modules/animation/types";

export interface GoalMetamorphosisCardProps {
  goalId?: string;
  title: string;
  targetCredits: number;
  currentCredits: number;
  rewardDescription?: string;
  unlockDetails?: {
    type: string;
    title: string;
    description: string;
    actionLabel?: string;
  };
  topContributors?: Array<{
    fanId: string;
    displayName: string;
    amountContributed: number;
    rank: number;
  }>;
  onChipIn?: (amount: number) => void;
  onActionClick?: () => void;
  className?: string;
}

export function GoalMetamorphosisCard({
  goalId = "goal_default",
  title,
  targetCredits,
  currentCredits,
  rewardDescription = "“At 100,000 the special experience unlocks.”",
  unlockDetails = {
    type: "SPECIAL_EXPERIENCE",
    title: "Special Midnight Experience Unlocked!",
    description: "The 100% goal has been achieved by the community. Access is now live.",
    actionLabel: "Enter Experience",
  },
  topContributors,
  onChipIn,
  onActionClick,
  className = "",
}: GoalMetamorphosisCardProps) {
  const percentage = Math.min(100, Math.round((currentCredits / (targetCredits || 1)) * 100));
  const isCompleted = percentage >= 100;

  // Transition state machine: 'ACTIVE' -> 'BREACHING' -> 'UNLOCKED_HERO'
  const [transitionState, setTransitionState] = useState<"ACTIVE" | "BREACHING" | "UNLOCKED_HERO">(
    isCompleted ? "UNLOCKED_HERO" : "ACTIVE"
  );
  const [displayCredits, setDisplayCredits] = useState(currentCredits);
  const prevProgressRef = useRef(currentCredits);

  useEffect(() => {
    const start = prevProgressRef.current;
    const diff = currentCredits - start;
    if (diff === 0) return;

    const duration = 900;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);
      const val = Math.round(start + diff * ease);
      setDisplayCredits(val);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        prevProgressRef.current = currentCredits;
        setDisplayCredits(currentCredits);
      }
    };

    requestAnimationFrame(step);

    // If crossing the 100% threshold, initiate the full metamorphosis
    if (currentCredits >= targetCredits && transitionState === "ACTIVE") {
      setTransitionState("BREACHING");
      const timer = setTimeout(() => {
        setTransitionState("UNLOCKED_HERO");
      }, 700);
      return () => clearTimeout(timer);
    } else if (currentCredits < targetCredits) {
      setTransitionState("ACTIVE");
    }
  }, [currentCredits, targetCredits, transitionState]);

  // --------------------------------------------------------------------------
  // STATE 1: UNLOCKED HERO (Metamorphosed 100% Completed Component)
  // --------------------------------------------------------------------------
  if (transitionState === "UNLOCKED_HERO" || isCompleted) {
    return (
      <div
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-b from-zinc-950/98 via-amber-950/30 to-zinc-950/98 border-2 border-amber-400/90 p-5 shadow-[0_0_40px_rgba(245,158,11,0.35)] backdrop-blur-2xl transition-all duration-700 animate-in zoom-in-95 ${className}`}
      >
        {/* Iridescent Radiant Ambient Shimmer */}
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 opacity-40 blur-xl animate-pulse pointer-events-none" />

        <div className="relative z-10 flex flex-col space-y-4">
          {/* Header Badge */}
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-[11px] font-black uppercase tracking-wider text-amber-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              100% GOAL COMPLETED
            </div>

            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-300">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>{displayCredits.toLocaleString()} / {targetCredits.toLocaleString()} Tokens</span>
            </div>
          </div>

          {/* Unlocked Experience Card Body */}
          <div className="rounded-2xl bg-zinc-900/80 border border-amber-400/30 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 text-white shadow-lg text-2xl">
                <Unlock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-base font-black text-white tracking-tight">
                  {unlockDetails.title}
                </h3>
                <p className="text-xs text-zinc-300 mt-0.5">
                  {unlockDetails.description}
                </p>
              </div>
            </div>

            {/* Action CTA Button */}
            <button
              onClick={onActionClick}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-pink-500 to-rose-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-2 shrink-0"
            >
              <span>{unlockDetails.actionLabel || "Enter Experience"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Top Supporters Spotlight */}
          {topContributors && topContributors.length > 0 && (
            <div className="flex items-center justify-between text-[11px] pt-1 text-zinc-400 border-t border-white/10">
              <span className="font-bold text-zinc-300 flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                Top Champions:
              </span>
              <div className="flex items-center gap-3">
                {topContributors.slice(0, 3).map((c, i) => (
                  <span key={c.fanId || i} className="font-medium">
                    <span className="text-amber-300 font-bold">{c.displayName}</span> ({c.amountContributed.toLocaleString()} tok)
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // STATE 2: ACTIVE / IN-PROGRESS (< 100%)
  // --------------------------------------------------------------------------
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-950/95 to-zinc-900/90 border border-pink-500/30 p-4 backdrop-blur-xl shadow-[0_0_30px_rgba(236,72,153,0.12)] transition-all duration-300 hover:border-pink-500/50 ${
        transitionState === "BREACHING" ? "scale-105 border-amber-400 shadow-[0_0_50px_rgba(245,158,11,0.6)]" : ""
      } ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-pink-500/20 text-pink-400 shrink-0 border border-pink-500/30">
            <Flame className="h-4 w-4 text-rose-400" />
          </span>
          <div className="min-w-0">
            <span className="truncate text-xs font-black uppercase text-zinc-100 tracking-wider block">
              {title}
            </span>
          </div>
        </div>

        <div className="flex items-baseline gap-1 shrink-0 pl-2">
          <span className="text-sm sm:text-base font-black text-amber-400">
            {displayCredits.toLocaleString()}
          </span>
          <span className="text-xs font-bold text-zinc-500">
            / {targetCredits.toLocaleString()}
          </span>
          <span className="text-[10px] font-extrabold text-amber-400 uppercase">Tokens</span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="relative h-3.5 w-full overflow-hidden rounded-full bg-zinc-950 border border-zinc-800 p-0.5 shadow-inner">
        <div
          className="relative h-full rounded-full bg-gradient-to-r from-pink-600 via-rose-500 to-amber-400 shadow-[0_0_15px_rgba(244,63,94,0.4)] transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        >
          {/* Shimmering Stripes */}
          <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:16px_16px] animate-[shimmer_2s_linear_infinite]" />
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between mt-2.5 text-[11px] font-bold text-zinc-400">
        <span className="text-amber-400 font-extrabold flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5" />
          {percentage}% COMPLETED
        </span>
        <span className="truncate italic text-zinc-400 pl-2">
          {rewardDescription}
        </span>
      </div>
    </div>
  );
}
