"use client";

import React, { useState } from "react";
import { useLiveWatchTracker } from "@/hooks/useLiveWatchTracker";
import { useXpProgressionListener } from "@/hooks/useXpProgressionListener";
import { LevelUpCelebrationModal } from "./LevelUpCelebrationModal";
import { XpFloatingToastContainer } from "./XpFloatingToast";
import { Sparkles, Flame, Eye, ShieldCheck, Play, Tv } from "lucide-react";

interface XpProgressionHudProps {
  fanId: string;
  creatorProfileId: string;
  livestreamId: string;
  initialLevel?: number;
  initialXp?: number;
  initialTierName?: string;
  creatorStageName?: string;
}

/**
 * XpProgressionHud
 * 
 * Interactive HUD demonstrating the full XP Architecture:
 * 1. Client passively tracks watch telemetry.
 * 2. Backend ingests telemetry and evaluates progression.
 * 3. Backend records to XP ledger and mutates balance.
 * 4. Backend emits LEVEL_UP event.
 * 5. Frontend displays celebration animation.
 */
export const XpProgressionHud: React.FC<XpProgressionHudProps> = ({
  fanId,
  creatorProfileId,
  livestreamId,
  initialLevel = 2,
  initialXp = 480,
  initialTierName = "New Fan",
  creatorStageName = "Luna Ray",
}) => {
  const [currentLevel, setCurrentLevel] = useState<number>(initialLevel);
  const [currentXp, setCurrentXp] = useState<number>(initialXp);
  const [tierName, setTierName] = useState<string>(initialTierName);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Hook 1: Real-time Backend Event Listener
  const { activeLevelUp, dismissLevelUp, xpToasts, dismissToast } = useXpProgressionListener({
    creatorProfileId,
    fanId,
    onLevelUp: (payload) => {
      setCurrentLevel(payload.newLevel);
      setCurrentXp(payload.totalXp);
      setTierName(payload.newTierName);
    },
    onXpAwarded: (payload) => {
      setCurrentXp(payload.newTotalXp);
      setCurrentLevel(payload.currentLevel);
      setTierName(payload.tierName);
    },
  });

  // Hook 2: Passive Client-Side Watch Telemetry Tracker (sends telemetry facts every 30s)
  const { forceHeartbeat } = useLiveWatchTracker({
    fanId,
    creatorProfileId,
    livestreamId,
    heartbeatIntervalMs: 30000,
    isPlaying: true,
  });

  // Simulator helper to test the threshold crossing
  const handleSimulateWatch = async (minutes: number) => {
    setIsSimulating(true);
    try {
      const response = await fetch("/api/xp/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fanId,
          creatorProfileId,
          action: minutes >= 5 ? "WATCH_5MIN" : "WATCH_1MIN",
        }),
      });
      await response.json();
    } catch (err) {
      console.error("Simulation error:", err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSimulateTip = async (credits: number) => {
    setIsSimulating(true);
    try {
      const response = await fetch("/api/xp/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fanId,
          creatorProfileId,
          action: credits >= 500 ? "TIP_500" : "TIP_50",
        }),
      });
      await response.json();
    } catch (err) {
      console.error("Simulation error:", err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Calculate tier boundaries for visual progress bar
  const tierMaxXp = currentXp < 500 ? 500 : currentXp < 2000 ? 2000 : currentXp < 5000 ? 5000 : 15000;
  const tierMinXp = currentXp < 500 ? 0 : currentXp < 2000 ? 500 : currentXp < 5000 ? 2000 : 5000;
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round(((currentXp - tierMinXp) / (tierMaxXp - tierMinXp)) * 100))
  );

  return (
    <div className="w-full max-w-md bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 shadow-2xl backdrop-blur-md">
      {/* Level-Up Modal Overlay */}
      <LevelUpCelebrationModal payload={activeLevelUp} onClose={dismissLevelUp} />

      {/* Floating XP Toasts */}
      <XpFloatingToastContainer toasts={xpToasts} onDismiss={dismissToast} />

      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white font-black text-lg shadow-lg">
            {currentLevel}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-white">{tierName}</span>
              <span className="text-[10px] font-semibold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                Lv.{currentLevel}
              </span>
            </div>
            <p className="text-xs text-zinc-400">with {creatorStageName}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20">
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>1.15x Boost</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="my-3">
        <div className="flex justify-between text-xs text-zinc-400 mb-1.5 font-medium">
          <span>{currentXp.toLocaleString()} XP</span>
          <span>{tierMaxXp.toLocaleString()} XP (Next Tier)</span>
        </div>
        <div className="h-2.5 w-full bg-zinc-800 rounded-full overflow-hidden p-0.5 border border-zinc-700/50">
          <div
            className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 rounded-full transition-all duration-500 shadow-sm"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Telemetry Indicator */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80 text-[11px] text-zinc-500">
        <div className="flex items-center gap-1.5 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Watching Live (Authoritative Heartbeat Active)</span>
        </div>
        <span className="flex items-center gap-1 text-zinc-400">
          <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
          Backend XP Authority
        </span>
      </div>

      {/* Simulation / Interactive Controls for Demo */}
      <div className="mt-4 pt-3 border-t border-zinc-800/80">
        <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
          Test Progression Pipeline
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            disabled={isSimulating}
            onClick={() => handleSimulateWatch(1)}
            className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50"
          >
            <Tv className="w-3.5 h-3.5 text-blue-400" />
            Watch 1 Min
          </button>
          <button
            disabled={isSimulating}
            onClick={() => handleSimulateWatch(5)}
            className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 text-emerald-400" />
            Watch 5 Mins
          </button>
          <button
            disabled={isSimulating}
            onClick={() => handleSimulateTip(50)}
            className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            Tip 50 Cr (+500 XP)
          </button>
          <button
            disabled={isSimulating}
            onClick={() => handleSimulateTip(500)}
            className="py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:brightness-110 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50 shadow-md"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Cross Threshold 🚀
          </button>
        </div>
      </div>
    </div>
  );
};
