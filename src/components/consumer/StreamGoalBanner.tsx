"use client";

import React from "react";
import { Flame, Trophy, Sparkles } from "lucide-react";

interface StreamGoalBannerProps {
  title: string;
  currentProgress: number;
  target: number;
}

export function StreamGoalBanner({ title, currentProgress, target }: StreamGoalBannerProps) {
  const percentage = Math.min(100, Math.round((currentProgress / (target || 1)) * 100));
  const isCompleted = currentProgress >= target;

  return (
    <div className="w-full rounded-2xl bg-zinc-950/80 border border-zinc-800/80 p-3.5 backdrop-blur-md shadow-xl">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-pink-500/20 text-pink-400 shrink-0">
            {isCompleted ? <Trophy className="h-3.5 w-3.5 text-amber-400" /> : <Flame className="h-3.5 w-3.5" />}
          </span>
          <span className="truncate text-xs font-bold text-zinc-100">{title}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 pl-2">
          <span className="text-xs font-extrabold text-amber-400">
            {currentProgress} / {target}
          </span>
          <span className="text-[10px] font-semibold text-zinc-500">Tokens</span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-zinc-900 border border-zinc-800">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            isCompleted
              ? "bg-gradient-to-r from-amber-400 via-rose-500 to-pink-500 animate-pulse-glow"
              : "bg-gradient-to-r from-pink-600 via-rose-500 to-amber-400"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex items-center justify-between mt-1.5 text-[10px] font-medium text-zinc-400">
        <span>{percentage}% completed</span>
        <span>{Math.max(0, target - currentProgress)} tokens remaining</span>
      </div>
    </div>
  );
}
