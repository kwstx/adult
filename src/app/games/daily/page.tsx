"use client";

import React, { useState, useEffect } from "react";
import { DailyWheelSpinner } from "@/components/games/DailyWheelSpinner";
import {
  DailyGameStatus,
  FreeGameOutcome,
  FreeGamePrizeWedge,
  RewardFulfillmentResult,
  DAILY_WHEEL_WEDGES,
} from "@/modules/games/types";
import {
  Sparkles,
  Flame,
  ShieldCheck,
  Trophy,
  Award,
  Crown,
  History,
  Clock,
  CheckCircle2,
  Gift,
} from "lucide-react";

export default function DailyGamePage() {
  const [status, setStatus] = useState<DailyGameStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [pendingOutcome, setPendingOutcome] = useState<FreeGameOutcome | null>(null);
  const [pendingFulfillment, setPendingFulfillment] = useState<RewardFulfillmentResult | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [activePerks, setActivePerks] = useState<any>(null);

  const userId = "usr_fan_alex";

  const fetchStatusAndHistory = async () => {
    try {
      setLoading(true);
      const [statusRes, historyRes] = await Promise.all([
        fetch(`/api/games/daily/status?userId=${userId}`),
        fetch(`/api/games/sessions/history?userId=${userId}`),
      ]);

      const statusJson = await statusRes.json();
      const historyJson = await historyRes.json();

      if (statusJson.success) setStatus(statusJson.data);
      if (historyJson.success) {
        setHistory(historyJson.data.history || []);
        setActivePerks(historyJson.data.activePerks || null);
      }
    } catch (err) {
      console.error("Failed to load daily game data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatusAndHistory();
  }, []);

  const handleSpinClick = async () => {
    if (isSpinning || !status?.canPlay) return;

    try {
      setIsSpinning(true);
      setShowCelebration(false);

      const res = await fetch("/api/games/daily/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          gameType: "DAILY_SPIN_WHEEL",
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setPendingOutcome(json.data.outcome);
        setPendingFulfillment(json.data.fulfillment);
        if (json.data.statusAfter) {
          setStatus(json.data.statusAfter);
        }
      } else {
        setIsSpinning(false);
        alert(json.error || "Failed to process spin.");
      }
    } catch (err) {
      setIsSpinning(false);
      alert("Error connecting to server.");
    }
  };

  const handleSpinComplete = () => {
    setIsSpinning(false);
    if (pendingOutcome && pendingFulfillment) {
      setShowCelebration(true);
      fetchStatusAndHistory();
    }
  };

  const wedges = status?.availablePrizes || DAILY_WHEEL_WEDGES;

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8 flex flex-col items-center">
      {/* Top Header */}
      <div className="w-full max-w-5xl flex flex-col items-center text-center my-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-3">
          <Sparkles className="w-4 h-4" />
          Authoritative Free Gaming Domain
        </div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
          Daily Cyber Wheel
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 max-w-xl mt-2">
          Spin every 24 hours to earn Fan XP, relationship points, exclusive chat badges, and front-row livestream seats.
        </p>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Interactive Wheel & Controls */}
        <div className="lg:col-span-7 bg-zinc-950 border border-zinc-800/80 rounded-3xl p-6 shadow-2xl relative flex flex-col items-center overflow-hidden">
          {/* Streak Status Header */}
          {status && (
            <div className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 mb-4 text-xs sm:text-sm">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
                  <Flame className="w-4 h-4 fill-orange-500" />
                </div>
                <div>
                  <span className="font-bold text-white">
                    {status.currentStreakDays} Day Streak
                  </span>
                  <p className="text-[10px] text-zinc-400">
                    Play consecutive days for up to 1.5x bonus
                  </p>
                </div>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 font-extrabold text-xs">
                {status.streakBonusMultiplier}x Multiplier
              </div>
            </div>
          )}

          {/* Wheel Component */}
          <DailyWheelSpinner
            wedges={wedges}
            isSpinning={isSpinning}
            targetAngleDegrees={pendingOutcome?.animationSeed.targetAngleDegrees}
            spinDurationMs={pendingOutcome?.animationSeed.spinDurationMs}
            onSpinClick={handleSpinClick}
            onSpinComplete={handleSpinComplete}
            canSpin={Boolean(status?.canPlay)}
          />

          {/* Cooldown notice */}
          {!status?.canPlay && !isSpinning && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs mt-4">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>
                Next daily spin ready in:{" "}
                <strong className="text-amber-300">
                  {Math.ceil((status?.cooldownRemainingSeconds || 0) / 3600)} hours
                </strong>
              </span>
            </div>
          )}

          {/* Greek / EU Compliance Statement */}
          <div className="w-full mt-6 p-3 rounded-2xl bg-zinc-900/50 border border-zinc-850 flex items-start gap-2.5 text-[11px] text-zinc-500">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <p>
              <strong>Greek (HGC) & EU Regulatory Assurance:</strong> This promotion is strictly free-to-play with zero financial wagering or entry fees. No credits are debited or granted. All prizes consist of non-monetary digital progression and social entitlements.
            </p>
          </div>
        </div>

        {/* Right Column: Active Perks & Odds Breakdown */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active Perks Card */}
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-bold text-white">
                Active Game Perks & Passes
              </h3>
            </div>

            <div className="space-y-3">
              {/* Badges */}
              {activePerks?.temporaryBadges && activePerks.temporaryBadges.length > 0 ? (
                activePerks.temporaryBadges.map((badge: any) => (
                  <div
                    key={badge.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{badge.badgeIcon}</span>
                      <div>
                        <div className="font-bold text-amber-300">{badge.badgeName}</div>
                        <div className="text-[10px] text-zinc-400">
                          Expires: {new Date(badge.expiresAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-amber-400 text-zinc-950 font-black text-[10px]">
                      ACTIVE
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-850 text-xs text-zinc-500 text-center">
                  No active temporary badges currently.
                </div>
              )}

              {/* Seat Passes */}
              {activePerks?.seatPasses && activePerks.seatPasses.length > 0 && (
                activePerks.seatPasses.map((pass: any) => (
                  <div
                    key={pass.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🔥</span>
                      <div>
                        <div className="font-bold text-orange-300">
                          {pass.tier} Seat Pass
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          Priority Score: {pass.priorityScore}
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-orange-400 text-zinc-950 font-black text-[10px]">
                      READY
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Transparent Odds Table */}
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-bold text-white">
                Transparent Prize Odds (EU Standard)
              </h3>
            </div>

            <div className="space-y-2">
              {wedges.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-850 text-xs text-zinc-300"
                >
                  <div className="flex items-center gap-2">
                    <span>{w.icon}</span>
                    <span className="font-medium text-white">{w.label}</span>
                  </div>
                  <span className="font-mono text-amber-400 font-bold">
                    {w.probabilityPercentage.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Celebration Overlay */}
      {showCelebration && pendingOutcome && pendingFulfillment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-zinc-950 border border-amber-500/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(245,158,11,0.3)] text-center animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 to-yellow-500 mx-auto flex items-center justify-center text-4xl shadow-xl shadow-amber-500/40 mb-4 animate-bounce">
              {pendingOutcome.winningWedge.icon}
            </div>

            <span className="text-xs font-black uppercase tracking-widest text-amber-400">
              Reward Awarded!
            </span>
            <h2 className="text-3xl font-black text-white mt-1 mb-2">
              {pendingOutcome.winningWedge.label}
            </h2>
            <p className="text-sm text-zinc-300 mb-6">
              {pendingFulfillment.summaryText}
            </p>

            <button
              onClick={() => setShowCelebration(false)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-zinc-950 font-black uppercase tracking-wider text-sm shadow-lg shadow-amber-500/30 transition-all cursor-pointer"
            >
              Collect Perk
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
