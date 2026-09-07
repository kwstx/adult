"use client";

import React from "react";
import { LiveStreamTelemetryMetrics } from "@/modules/analytics/types";
import { Users, Clock, Flame, UserPlus, Radio, Activity, Video } from "lucide-react";

interface LiveTelemetryCardProps {
  telemetry: LiveStreamTelemetryMetrics;
}

export const LiveTelemetryCard: React.FC<LiveTelemetryCardProps> = ({ telemetry }) => {
  const {
    liveViewersCurrent,
    averageWatchDurationFormatted,
    peakViewers,
    followersGained,
    totalStreamBroadcastMinutes,
    totalStreamCount,
  } = telemetry;

  return (
    <div className="rounded-3xl bg-zinc-950/80 border border-zinc-800/80 p-6 space-y-6 shadow-xl">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
            <Radio className="h-4 w-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Live Broadcast Telemetry
            </h3>
            <p className="text-[11px] text-zinc-400">Audience reach, viewership peaks & stream retention</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono font-bold border border-emerald-500/20">
          <Activity className="h-3 w-3 animate-pulse" />
          <span>REALTIME</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Live Viewers */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/60 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Live Viewers</span>
            <Users className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl lg:text-3xl font-black text-white font-mono">
            {liveViewersCurrent.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
            <span>● Active in live room right now</span>
          </div>
        </div>

        {/* Metric 2: Average Watch Duration */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/60 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Avg Watch Duration</span>
            <Clock className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl lg:text-3xl font-black text-white font-mono">
            {averageWatchDurationFormatted}
          </div>
          <div className="text-[10px] text-zinc-400">
            Across {totalStreamCount} broadcast sessions
          </div>
        </div>

        {/* Metric 3: Peak Viewers */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/60 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Peak Viewers</span>
            <Flame className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-2xl lg:text-3xl font-black text-rose-400 font-mono">
            {peakViewers.toLocaleString()}
          </div>
          <div className="text-[10px] text-zinc-400">
            Highest concurrency recorded
          </div>
        </div>

        {/* Metric 4: Followers Gained */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/60 space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Followers Gained</span>
            <UserPlus className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl lg:text-3xl font-black text-emerald-400 font-mono">
            +{followersGained.toLocaleString()}
          </div>
          <div className="text-[10px] text-zinc-400">
            {Math.round(totalStreamBroadcastMinutes / 60)} broadcast hours total
          </div>
        </div>
      </div>
    </div>
  );
};
