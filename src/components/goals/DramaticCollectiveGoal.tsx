"use client";

import React, { useState } from "react";
import { Flame, Trophy, Sparkles, Coins, Zap, ShieldCheck, Plus, ArrowUpRight, Crown } from "lucide-react";
import { useCollectiveGoal } from "@/hooks/useCollectiveGoal";
import { GoalCompletedCelebration } from "./GoalCompletedCelebration";
import { GoalContributionModal } from "./GoalContributionModal";

interface DramaticCollectiveGoalProps {
  creatorId?: string;
  initialGoalId?: string;
  className?: string;
  onUnlockExperience?: () => void;
}

export function DramaticCollectiveGoal({
  creatorId = "c1",
  initialGoalId,
  className = "",
  onUnlockExperience,
}: DramaticCollectiveGoalProps) {
  const {
    goal,
    displayCredits,
    displayPercentage,
    isLoading,
    isContributing,
    error,
    contribute,
    completedPayload,
    showCelebration,
    dismissCelebration,
    recentCheer,
  } = useCollectiveGoal({ creatorId, initialGoalId });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fastChipLoading, setFastChipLoading] = useState<number | null>(null);

  const isGoalReached = goal.status === "REACHED" || displayCredits >= goal.targetCredits;

  const handleFastChip = async (amount: number) => {
    setFastChipLoading(amount);
    await contribute(amount);
    setFastChipLoading(null);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-pink-500/30 bg-gradient-to-b from-zinc-950/95 via-zinc-900/90 to-zinc-950/95 p-5 sm:p-7 shadow-[0_0_50px_rgba(236,72,153,0.15)] backdrop-blur-2xl ring-1 ring-white/10 ${className}`}
    >
      {/* Background Ambient Glow & Cyber Grid */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-pink-600/20 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-amber-500/15 blur-3xl" />

      {/* Top Header Row */}
      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
          </span>
          <span className="text-[11px] font-black uppercase tracking-widest text-pink-400">
            LIVE COLLECTIVE GOAL
          </span>
        </div>

        <div className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1 text-[11px] font-bold text-zinc-300">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>{goal.contributorCount} Contributors</span>
        </div>
      </div>

      {/* Main Title: "MIDNIGHT GOAL" */}
      <div className="relative z-10 mt-3 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500/20 to-rose-500/20 border border-amber-500/40 text-amber-400">
            {isGoalReached ? <Trophy className="h-4 w-4 text-amber-300 animate-bounce" /> : <Flame className="h-4 w-4 text-rose-400" />}
          </div>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]">
            {goal.title || "MIDNIGHT GOAL"}
          </h2>
        </div>

        {/* Aggregate Counter: "68,500 / 100,000" */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-300 to-pink-400">
            {displayCredits.toLocaleString()}
          </span>
          <span className="text-sm sm:text-base font-bold text-zinc-500">
            / {goal.targetCredits.toLocaleString()}
          </span>
          <span className="text-xs font-extrabold uppercase text-amber-400">Tokens</span>
        </div>
      </div>

      {/* Dramatic Multi-Layered Glowing Progress Bar */}
      <div className="relative z-10 mt-5">
        <div className="relative h-5 sm:h-6 w-full overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-800 p-0.5 shadow-inner">
          {/* Subtle Segment Grid Overlays */}
          <div className="absolute inset-0 z-10 flex justify-between px-2 pointer-events-none opacity-20">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-full w-[1px] bg-white/60" />
            ))}
          </div>

          {/* Animated Gradient Fill Bar */}
          <div
            className={`relative h-full rounded-xl transition-all duration-300 ease-out ${
              isGoalReached
                ? "bg-gradient-to-r from-amber-400 via-rose-500 to-pink-500 shadow-[0_0_30px_rgba(245,158,11,0.6)] animate-pulse"
                : "bg-gradient-to-r from-pink-600 via-rose-500 to-amber-400 shadow-[0_0_20px_rgba(244,63,94,0.4)]"
            }`}
            style={{ width: `${Math.min(100, displayPercentage)}%` }}
          >
            {/* Shimmering Animated Stripes */}
            <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:24px_24px] animate-[move-bg_2s_linear_infinite]" />

            {/* Glowing Leading Edge Spark */}
            <div className="absolute right-0 top-0 bottom-0 w-2.5 bg-white/80 rounded-r-xl shadow-[0_0_12px_#fff]" />
          </div>
        </div>

        {/* Progress Bar Footnotes: Percentage & Remaining Tokens */}
        <div className="mt-2.5 flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-1.5 text-amber-400 font-extrabold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{displayPercentage}% COMPLETED</span>
          </div>

          <div className="text-zinc-400 font-medium">
            {isGoalReached ? (
              <span className="text-emerald-400 font-bold uppercase tracking-wide">
                🎉 Milestone Unlocked!
              </span>
            ) : (
              <span>{Math.max(0, goal.targetCredits - displayCredits).toLocaleString()} tokens remaining</span>
            )}
          </div>
        </div>
      </div>

      {/* Dramatic Tagline Banner: “At 100,000 the special experience unlocks.” */}
      <div className="relative z-10 mt-4 rounded-2xl border border-pink-500/20 bg-pink-950/20 p-3.5 sm:p-4 text-center">
        <p className="text-xs sm:text-sm font-semibold italic text-pink-200">
          {goal.rewardDescription || "“At 100,000 the special experience unlocks.”"}
        </p>
      </div>

      {/* Live Recent Cheer Toast Notification */}
      {recentCheer && (
        <div className="relative z-10 mt-3 flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-xs font-bold text-amber-300 animate-in slide-in-from-top-2 duration-300">
          <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          <span className="truncate">
            <span className="text-white">{recentCheer.displayName}</span> chipped in{" "}
            <span className="text-amber-400 font-black">+{recentCheer.amount.toLocaleString()}</span> tokens!
            {recentCheer.message && ` “${recentCheer.message}”`}
          </span>
        </div>
      )}

      {/* Error Message Toast */}
      {error && (
        <div className="relative z-10 mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2 text-xs font-bold text-rose-300">
          {error}
        </div>
      )}

      {/* Fast Action Quick-Chip Buttons & Custom Contribution Trigger */}
      <div className="relative z-10 mt-5 pt-4 border-t border-zinc-800/80">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
            Quick Chip-In
          </span>
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-[11px] font-bold text-pink-400 hover:text-pink-300 flex items-center gap-1 transition-colors"
          >
            <span>Custom Amount / Cheer</span>
            <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[500, 2500, 10000, 25000].map((amt) => {
            const isLoadingThis = fastChipLoading === amt;
            return (
              <button
                key={amt}
                onClick={() => handleFastChip(amt)}
                disabled={isContributing || isGoalReached}
                className="group relative flex items-center justify-center gap-1.5 rounded-2xl border border-zinc-800 bg-zinc-900/90 py-3 px-2 text-xs font-black uppercase tracking-wider text-white shadow-md hover:border-amber-500/50 hover:bg-gradient-to-r hover:from-amber-500/20 hover:to-pink-500/20 hover:text-amber-300 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoadingThis ? (
                  <Sparkles className="h-3.5 w-3.5 animate-spin text-amber-400" />
                ) : (
                  <Coins className="h-3.5 w-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                )}
                <span>+{amt.toLocaleString()}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Top Community Patrons Mini-Leaderboard */}
      {goal.topContributors && goal.topContributors.length > 0 && (
        <div className="relative z-10 mt-5 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400">
          <div className="flex items-center gap-1.5">
            <Crown className="h-3.5 w-3.5 text-amber-400" />
            <span className="font-bold text-zinc-300">Top Patron:</span>
            <span className="font-extrabold text-amber-400">
              {goal.topContributors[0]?.displayName} ({goal.topContributors[0]?.amountContributed.toLocaleString()} tokens)
            </span>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1 text-[11px] font-bold text-zinc-400 hover:text-white transition-colors"
          >
            <Plus className="h-3 w-3" />
            <span>Join Patrons</span>
          </button>
        </div>
      )}

      {/* Custom Contribution Modal */}
      <GoalContributionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onContribute={contribute}
        goalTitle={goal.title}
        targetCredits={goal.targetCredits}
        currentCredits={displayCredits}
      />

      {/* Dramatic Full-Screen Unlock Celebration Overlay */}
      <GoalCompletedCelebration
        payload={completedPayload}
        isOpen={showCelebration}
        onClose={dismissCelebration}
        onEnterUnlock={onUnlockExperience}
      />
    </div>
  );
}
