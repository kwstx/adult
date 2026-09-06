"use client";

import React, { useEffect, useState, useRef } from "react";
import { Trophy, Crown, ChevronRight, Zap } from "lucide-react";
import type { LeaderboardEntry } from "@/modules/realtime/types";

interface TopSupportersBottomBannerProps {
  leaderboard: LeaderboardEntry[];
  currentUserId?: string;
  onOpenFullLeaderboard: () => void;
  className?: string;
}

export function TopSupportersBottomBanner({
  leaderboard,
  currentUserId,
  onOpenFullLeaderboard,
  className = "",
}: TopSupportersBottomBannerProps) {
  const [pulseIndex, setPulseIndex] = useState<number | null>(null);
  const prevScoresRef = useRef<number[]>([]);

  const topThree = leaderboard.slice(0, 3);

  // Trigger pulse effect when scores change in real-time
  useEffect(() => {
    if (topThree.length === 0) return;
    const currentScores = topThree.map((t) => t.totalCredits);

    currentScores.forEach((score, idx) => {
      const prev = prevScoresRef.current[idx];
      if (prev !== undefined && score > prev) {
        setPulseIndex(idx);
        setTimeout(() => setPulseIndex(null), 2000);
      }
    });

    prevScoresRef.current = currentScores;
  }, [topThree]);

  if (topThree.length === 0) return null;

  return (
    <div
      onClick={onOpenFullLeaderboard}
      className={`group flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-zinc-950/80 backdrop-blur-md border border-white/10 hover:border-amber-500/50 shadow-xl cursor-pointer transition-all hover:scale-[1.01] ${className}`}
    >
      {/* Title / Badge */}
      <div className="flex items-center gap-1.5 text-amber-400 shrink-0">
        <Trophy className="h-3.5 w-3.5 fill-amber-400/20" />
        <span className="text-[10px] font-black tracking-wider uppercase text-amber-300">
          TOP SUPPORTERS
        </span>
      </div>

      <div className="h-3 w-[1px] bg-white/20 shrink-0" />

      {/* Horizontal Supporter Pills */}
      <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-none py-0.5">
        {topThree.map((entry, idx) => {
          const isPulse = pulseIndex === idx;
          const isFirst = idx === 0;

          return (
            <div
              key={entry.userId}
              className={`flex items-center gap-1.5 text-xs transition-all ${
                isPulse ? "scale-110 text-amber-300 font-bold" : "text-zinc-300"
              }`}
            >
              {/* Medal / Rank Indicator */}
              <span className="text-[11px]">
                {idx === 0 ? "👑" : idx === 1 ? "🥈" : "🥉"}
              </span>

              {/* Alex — 12,500 */}
              <span className={`font-semibold ${isFirst ? "text-amber-200" : "text-zinc-200"}`}>
                {entry.displayName}
              </span>
              <span className="text-zinc-500 font-mono text-[11px]">—</span>
              <span className="font-mono font-bold text-amber-400 text-[11px]">
                {entry.totalCredits.toLocaleString()}
              </span>

              {idx < topThree.length - 1 && (
                <span className="text-zinc-600 ml-1 select-none">•</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Right chevron indicator */}
      <div className="ml-auto flex items-center pl-1 text-zinc-500 group-hover:text-amber-300 transition-colors">
        <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </div>
  );
}
