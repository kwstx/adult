"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Flame, Play, Clock } from "lucide-react";
import { DailyGameModal } from "./DailyGameModal";
import { DailyGameStatus } from "@/modules/games/types";

interface DailyGameBannerProps {
  userId?: string;
  creatorProfileId?: string;
  creatorStageName?: string;
  compact?: boolean;
}

export const DailyGameBanner: React.FC<DailyGameBannerProps> = ({
  userId = "usr_fan_alex",
  creatorProfileId,
  creatorStageName,
  compact = false,
}) => {
  const [status, setStatus] = useState<DailyGameStatus | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/games/daily/status?userId=${userId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setStatus(json.data);
      })
      .catch(() => null);
  }, [userId]);

  const canPlay = status?.canPlay ?? true;
  const streak = status?.currentStreakDays ?? 1;

  if (compact) {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 hover:text-amber-200 hover:border-amber-400 transition-all text-xs font-bold cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.2)]"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          <span>Daily Spin</span>
          {streak > 1 && (
            <span className="flex items-center gap-0.5 text-[10px] text-orange-400 font-extrabold bg-orange-950/60 px-1.5 py-0.5 rounded-full border border-orange-500/30">
              <Flame className="w-2.5 h-2.5 fill-orange-500" />
              {streak}d
            </span>
          )}
        </button>

        <DailyGameModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          userId={userId}
          creatorProfileId={creatorProfileId}
          creatorStageName={creatorStageName}
        />
      </>
    );
  }

  return (
    <>
      <div className="w-full relative overflow-hidden rounded-3xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-amber-500/30 p-5 shadow-[0_0_25px_rgba(245,158,11,0.12)] flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Ambient background glow */}
        <div className="absolute -top-12 -left-12 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4 z-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-zinc-950 shadow-lg shadow-amber-500/30 shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                Daily Free Cyber Wheel
              </h3>
              {streak > 1 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-400 text-[10px] font-extrabold">
                  <Flame className="w-3 h-3 fill-orange-500" />
                  {streak} Day Streak
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              100% free daily rewards: Fan XP, creator perks, front-row seats & temporary badges.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 z-10 w-full sm:w-auto justify-end">
          {canPlay ? (
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-zinc-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-zinc-950" />
              Spin Now (Free)
            </button>
          ) : (
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer hover:text-white"
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              View Cooldown
            </button>
          )}
        </div>
      </div>

      <DailyGameModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={userId}
        creatorProfileId={creatorProfileId}
        creatorStageName={creatorStageName}
      />
    </>
  );
};
