"use client";

import React from "react";
import { Trophy, Crown, Flame, Sparkles, X, ChevronRight } from "lucide-react";
import type { LeaderboardEntry } from "@/modules/realtime/types";

interface LiveRoomLeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
  leaderboard: LeaderboardEntry[];
  currentUserId?: string;
  creatorName: string;
}

export function LiveRoomLeaderboard({
  isOpen,
  onClose,
  leaderboard,
  currentUserId,
  creatorName,
}: LiveRoomLeaderboardProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-0 sm:p-4">
      <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-zinc-950 border border-zinc-800 p-6 text-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 duration-300">
        {/* Glow Header */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-pink-500 to-purple-600" />

        <div className="flex items-center justify-between pb-4 border-b border-zinc-850">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Live Leaderboard</h3>
              <p className="text-[11px] text-zinc-400">Top contributors for {creatorName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Standings List */}
        <div className="mt-4 flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
          {leaderboard.length === 0 ? (
            <div className="py-8 text-center text-zinc-500 text-xs">
              No gifts sent yet. Be the first to take #1 on the leaderboard! ✨
            </div>
          ) : (
            leaderboard.map((entry) => {
              const isCurrentUser = entry.userId === currentUserId;
              const isFirst = entry.rank === 1;
              const isSecond = entry.rank === 2;
              const isThird = entry.rank === 3;

              return (
                <div
                  key={entry.userId}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                    isCurrentUser
                      ? "bg-pink-950/40 border-pink-500/60 shadow-lg shadow-pink-500/10"
                      : isFirst
                      ? "bg-amber-950/20 border-amber-500/40"
                      : "bg-zinc-900/50 border-zinc-800/80"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Rank Badge */}
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-black text-xs ${
                        isFirst
                          ? "bg-gradient-to-tr from-amber-500 to-yellow-300 text-black shadow-md shadow-amber-500/40"
                          : isSecond
                          ? "bg-gradient-to-tr from-slate-300 to-zinc-100 text-black shadow-md"
                          : isThird
                          ? "bg-gradient-to-tr from-amber-700 to-amber-600 text-white shadow-md"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {isFirst ? "1 👑" : entry.rank}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate">
                          {entry.displayName}
                        </span>
                        {isCurrentUser && (
                          <span className="rounded bg-pink-500/30 px-1.5 py-0.2 text-[9px] font-black text-pink-300">
                            YOU
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-400 font-medium">
                        @{entry.username}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-black text-amber-300">
                      {entry.totalCredits.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-400">tokens</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-zinc-850 flex items-center justify-between text-[11px] text-zinc-400">
          <span>Updates live upon every gift event</span>
          <span className="font-bold text-pink-400">Real-Time Sync ⚡</span>
        </div>
      </div>
    </div>
  );
}
