"use client";

import React, { useState, useEffect, useRef } from "react";
import { Trophy, Crown, Flame, Sparkles, ChevronRight, Zap } from "lucide-react";
import type { LeaderboardEntry } from "@/modules/realtime/types";

interface TopSupportersSideWidgetProps {
  leaderboard: LeaderboardEntry[];
  currentUserId?: string;
  creatorName: string;
  onOpenFullLeaderboard?: () => void;
  onSendGift?: (amount: number) => void;
  onSelectUser?: (userId: string) => void;
  className?: string;
}

export function TopSupportersSideWidget({
  leaderboard,
  currentUserId,
  creatorName,
  onOpenFullLeaderboard,
  onSendGift,
  onSelectUser,
  className = "",
}: TopSupportersSideWidgetProps) {
  const [activeTimeframe, setActiveTimeframe] = useState<"stream" | "all_time">("stream");
  const [highlightedUser, setHighlightedUser] = useState<string | null>(null);
  const prevLeaderboardRef = useRef<Map<string, number>>(new Map());

  // Detect score updates or rank changes to trigger live visual pulse
  useEffect(() => {
    if (!leaderboard || leaderboard.length === 0) return;

    const prevMap = prevLeaderboardRef.current;
    let changedUserId: string | null = null;

    for (const entry of leaderboard) {
      const prevCredits = prevMap.get(entry.userId);
      if (prevCredits !== undefined && entry.totalCredits > prevCredits) {
        changedUserId = entry.userId;
        break;
      }
    }

    // Update reference map
    const newMap = new Map<string, number>();
    leaderboard.forEach((e) => newMap.set(e.userId, e.totalCredits));
    prevLeaderboardRef.current = newMap;

    if (changedUserId) {
      setHighlightedUser(changedUserId);
      const timer = setTimeout(() => setHighlightedUser(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [leaderboard]);

  // Top 3 supporters for primary widget display
  const topThree = leaderboard.slice(0, 3);
  const currentUserEntry = leaderboard.find((e) => e.userId === currentUserId);

  return (
    <div
      className={`relative w-full max-w-[280px] rounded-2xl bg-zinc-950/85 backdrop-blur-xl border border-white/10 p-3.5 shadow-2xl text-white overflow-hidden transition-all duration-300 hover:border-amber-500/40 ${className}`}
    >
      {/* Ambient Top Glow */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 opacity-80" />

      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-inner">
            <Trophy className="h-3.5 w-3.5" />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              TOP SUPPORTERS
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
            </span>
          </div>
        </div>

        {onOpenFullLeaderboard && (
          <button
            onClick={onOpenFullLeaderboard}
            className="group flex items-center gap-0.5 text-[10px] font-bold text-zinc-400 hover:text-amber-300 transition-colors"
          >
            <span>View All</span>
            <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>

      {/* Standings List (Formatted as Alex — 12,500) */}
      <div className="flex flex-col gap-1.5">
        {topThree.length === 0 ? (
          <div className="py-4 text-center text-zinc-500 text-xs">
            <Sparkles className="h-4 w-4 mx-auto mb-1 text-zinc-600 animate-pulse" />
            No gifts yet. Be the first #1!
          </div>
        ) : (
          topThree.map((entry, idx) => {
            const isFirst = entry.rank === 1;
            const isSecond = entry.rank === 2;
            const isThird = entry.rank === 3;
            const isUser = entry.userId === currentUserId;
            const isRecentlyUpdated = highlightedUser === entry.userId;

            return (
              <div
                key={entry.userId}
                onClick={() => onSelectUser?.(entry.userId)}
                className={`group flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                  isRecentlyUpdated
                    ? "bg-amber-500/20 border-amber-400 scale-[1.02] shadow-lg shadow-amber-500/20"
                    : isFirst
                    ? "bg-amber-950/25 border-amber-500/30 hover:bg-amber-900/30"
                    : isSecond
                    ? "bg-zinc-900/60 border-zinc-700/40 hover:bg-zinc-800/60"
                    : "bg-zinc-900/40 border-zinc-800/40 hover:bg-zinc-800/50"
                }`}
              >
                {/* Left Side: Rank Indicator & Name */}
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-black ${
                      isFirst
                        ? "bg-gradient-to-tr from-amber-500 to-yellow-300 text-black shadow-sm"
                        : isSecond
                        ? "bg-zinc-300 text-black"
                        : isThird
                        ? "bg-amber-700 text-white"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {isFirst ? "1" : entry.rank}
                  </div>

                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`text-xs font-semibold truncate ${
                        isUser
                          ? "text-pink-300 font-bold"
                          : isFirst
                          ? "text-amber-200 font-bold"
                          : "text-zinc-200"
                      }`}
                    >
                      {entry.displayName}
                    </span>
                    {isFirst && <Crown className="h-3 w-3 text-amber-400 shrink-0 fill-amber-400/30" />}
                  </div>
                </div>

                {/* Right Side: Score in 'Alex — 12,500' format */}
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-zinc-500 text-xs font-mono">—</span>
                  <span
                    className={`text-xs font-mono font-bold ${
                      isRecentlyUpdated
                        ? "text-amber-300 animate-bounce"
                        : isFirst
                        ? "text-amber-300"
                        : "text-zinc-300"
                    }`}
                  >
                    {entry.totalCredits.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* User's Current Position if not in Top 3 */}
      {currentUserEntry && currentUserEntry.rank > 3 && (
        <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] px-2 py-1 rounded-lg bg-pink-950/30 border border-pink-500/20 text-pink-300">
          <div className="flex items-center gap-1.5">
            <span className="font-black text-pink-400">#{currentUserEntry.rank}</span>
            <span className="font-medium truncate">You ({currentUserEntry.displayName})</span>
          </div>
          <span className="font-mono font-bold">{currentUserEntry.totalCredits.toLocaleString()}</span>
        </div>
      )}

      {/* Quick CTA to compete on leaderboard */}
      {onSendGift && (
        <button
          onClick={() => onSendGift(100)}
          className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-black font-black text-[11px] shadow-lg shadow-amber-500/10 transition-transform active:scale-95"
        >
          <Zap className="h-3 w-3 fill-black" />
          <span>Send Gift to Rank Up</span>
        </button>
      )}
    </div>
  );
}
