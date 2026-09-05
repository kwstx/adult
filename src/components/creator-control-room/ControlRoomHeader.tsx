"use client";

import React from "react";
import {
  Radio,
  Clock,
  Users,
  Coins,
  Sparkles,
  Flame,
  Activity,
  Zap,
  Play,
  Square,
  ShieldCheck,
} from "lucide-react";
import type { ControlRoomTelemetry, StreamGoal } from "@/types/control-room";

interface ControlRoomHeaderProps {
  telemetry: ControlRoomTelemetry;
  activeGoal: StreamGoal;
  onSimulateTip: (tokens?: number) => void;
  onOpenEditGoal: () => void;
}

// Format duration seconds to HH:MM:SS
function formatDuration(seconds: number) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs > 0 ? `${hrs.toString().padStart(2, "0")}:` : ""}${mins
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function ControlRoomHeader({
  telemetry,
  activeGoal,
  onSimulateTip,
  onOpenEditGoal,
}: ControlRoomHeaderProps) {
  return (
    <header className="w-full bg-zinc-950/95 border-b border-zinc-800/80 px-4 py-3 backdrop-blur-xl shrink-0 z-30 select-none">
      <div className="flex flex-wrap items-center justify-between gap-3 max-w-[1920px] mx-auto">
        {/* 1. Master LIVE Status & Duration Stopwatch */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {telemetry.isLive ? (
              <span className="flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1 text-xs font-black text-white shadow-lg shadow-rose-600/30 animate-pulse">
                <span className="h-2 w-2 rounded-full bg-white" />
                LIVE
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1 text-xs font-black text-zinc-400">
                <span className="h-2 w-2 rounded-full bg-zinc-500" />
                OFFLINE
              </span>
            )}
            <span className="flex items-center gap-1.5 rounded-2xl bg-zinc-900 border border-zinc-800 px-3 py-1 text-xs font-mono font-bold text-zinc-200">
              <Clock className="h-3.5 w-3.5 text-pink-400" />
              {formatDuration(telemetry.durationSeconds)}
            </span>
          </div>

          {/* Stream Quality Telemetry */}
          <div className="hidden xl:flex items-center gap-1.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 px-2.5 py-1 text-[11px] font-mono text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-zinc-200 font-bold">{telemetry.fps} FPS</span>
            <span>•</span>
            <span className="text-zinc-300">{telemetry.bitrateKbps} kbps</span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold">1080p60</span>
          </div>
        </div>

        {/* 2. Core Operational Metrics (Viewers, Revenue, Interactions, Goal) */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {/* Viewers */}
          <div className="flex items-center gap-2 rounded-2xl bg-zinc-900/80 border border-zinc-800 px-3.5 py-1.5 shadow-sm">
            <Users className="h-4 w-4 text-pink-400 shrink-0" />
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-black text-white">
                  {telemetry.viewerCount.toLocaleString()}
                </span>
                <span className="text-[10px] text-zinc-500 font-medium hidden sm:inline">
                  (Peak {telemetry.peakViewers})
                </span>
              </div>
              <span className="text-[9px] uppercase tracking-wider font-bold text-zinc-400 block -mt-0.5">
                Viewers
              </span>
            </div>
          </div>

          {/* Revenue */}
          <div className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500/10 via-zinc-900 to-zinc-900 border border-amber-500/30 px-3.5 py-1.5 shadow-sm">
            <Coins className="h-4 w-4 text-amber-400 shrink-0" />
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-black text-amber-400">
                  {telemetry.grossTokens.toLocaleString()} 🪙
                </span>
                <span className="text-[10px] font-bold text-emerald-400">
                  ${telemetry.netUsd.toFixed(2)} USD
                </span>
              </div>
              <span className="text-[9px] uppercase tracking-wider font-bold text-zinc-400 block -mt-0.5">
                Tonight&apos;s Revenue
              </span>
            </div>
          </div>

          {/* Completed Interactions */}
          <div className="flex items-center gap-2 rounded-2xl bg-zinc-900/80 border border-zinc-800 px-3.5 py-1.5 shadow-sm">
            <Sparkles className="h-4 w-4 text-purple-400 shrink-0" />
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-black text-white">
                  {telemetry.completedInteractionsCount}
                </span>
                <span className="text-[10px] text-purple-300 font-medium">Done</span>
              </div>
              <span className="text-[9px] uppercase tracking-wider font-bold text-zinc-400 block -mt-0.5">
                Interactions
              </span>
            </div>
          </div>

          {/* Active Goal Progress Mini-Card */}
          <button
            onClick={onOpenEditGoal}
            className="flex items-center gap-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-pink-500/40 px-3.5 py-1.5 text-left transition-all group"
            title="Click to edit stream milestone"
          >
            <Flame className="h-4 w-4 text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
            <div className="w-28 sm:w-36">
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="text-zinc-200 truncate pr-1">Goal: {activeGoal.percentage}%</span>
                <span className="text-amber-400">{activeGoal.currentTokens}/{activeGoal.targetTokens}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-zinc-800 mt-1 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-pink-500 to-amber-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, activeGoal.percentage)}%` }}
                />
              </div>
            </div>
          </button>
        </div>

        {/* 3. Simulator & Instant Test Suite */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onSimulateTip(250)}
            className="flex items-center gap-1.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-3 py-1.5 text-[11px] font-bold text-pink-300 hover:text-pink-200 shadow-sm transition-all"
            title="Simulate incoming fan tip event"
          >
            <Zap className="h-3.5 w-3.5 text-pink-400" />
            <span>Simulate Tip (+250🪙)</span>
          </button>
        </div>
      </div>
    </header>
  );
}
