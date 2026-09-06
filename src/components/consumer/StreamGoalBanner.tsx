"use client";

import React, { useState, useEffect, useRef } from "react";
import { Flame, Trophy, Sparkles, Coins, Zap } from "lucide-react";

interface StreamGoalBannerProps {
  title: string;
  currentProgress: number;
  target: number;
  rewardDescription?: string;
  onChipIn?: (amount: number) => void;
  onClick?: () => void;
}

export function StreamGoalBanner({
  title,
  currentProgress,
  target,
  rewardDescription = "“At 100,000 the special experience unlocks.”",
  onChipIn,
  onClick,
}: StreamGoalBannerProps) {
  const percentage = Math.min(100, Math.round((currentProgress / (target || 1)) * 100));
  const isCompleted = currentProgress >= target;

  // Animated counting
  const [displayCredits, setDisplayCredits] = useState(currentProgress);
  const currentRef = useRef(currentProgress);

  useEffect(() => {
    const start = currentRef.current;
    const diff = currentProgress - start;
    if (diff === 0) return;

    const duration = 800;
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
        currentRef.current = currentProgress;
        setDisplayCredits(currentProgress);
      }
    };

    requestAnimationFrame(step);
  }, [currentProgress]);

  return (
    <div
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-950/95 to-zinc-900/90 border border-pink-500/30 p-3.5 backdrop-blur-xl shadow-[0_0_30px_rgba(236,72,153,0.12)] transition-all hover:border-pink-500/50 cursor-pointer"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-pink-500/20 text-pink-400 shrink-0 border border-pink-500/30">
            {isCompleted ? <Trophy className="h-3.5 w-3.5 text-amber-300 animate-bounce" /> : <Flame className="h-3.5 w-3.5 text-rose-400" />}
          </span>
          <div className="min-w-0">
            <span className="truncate text-xs font-black uppercase text-zinc-100 tracking-wide block">
              {title}
            </span>
          </div>
        </div>

        <div className="flex items-baseline gap-1 shrink-0 pl-2">
          <span className="text-xs sm:text-sm font-black text-amber-400">
            {displayCredits.toLocaleString()}
          </span>
          <span className="text-[10px] font-bold text-zinc-500">
            / {target.toLocaleString()}
          </span>
          <span className="text-[9px] font-extrabold text-amber-400 uppercase">Tokens</span>
        </div>
      </div>

      {/* Dramatic Progress Bar */}
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-zinc-950 border border-zinc-800 p-0.5 shadow-inner">
        <div
          className={`relative h-full rounded-full transition-all duration-500 ease-out ${
            isCompleted
              ? "bg-gradient-to-r from-amber-400 via-rose-500 to-pink-500 shadow-[0_0_20px_rgba(245,158,11,0.6)] animate-pulse"
              : "bg-gradient-to-r from-pink-600 via-rose-500 to-amber-400 shadow-[0_0_15px_rgba(244,63,94,0.35)]"
          }`}
          style={{ width: `${percentage}%` }}
        >
          {/* Shimmering Stripes */}
          <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:16px_16px] animate-[move-bg_2s_linear_infinite]" />
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between mt-2 text-[10px] font-bold text-zinc-400">
        <span className="text-amber-400/90 font-extrabold flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          {percentage}% COMPLETED
        </span>
        <span className="truncate italic text-zinc-400 pl-2">
          {rewardDescription}
        </span>
      </div>
    </div>
  );
}
