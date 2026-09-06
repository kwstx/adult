"use client";

import React, { useState } from "react";
import { DramaticCollectiveGoal } from "@/components/goals/DramaticCollectiveGoal";
import { useUser } from "@/lib/user-context";
import { Sparkles, Flame, Trophy, Play, RotateCcw, Wallet, Zap, Radio, Users, Gift, ShieldAlert } from "lucide-react";

export default function CollectiveGoalsShowcasePage() {
  const { currentUser, updateBalance } = useUser();
  const [resetting, setResetting] = useState(false);
  const [unlockedExperienceActive, setUnlockedExperienceActive] = useState(false);

  // Quick reset to the iconic 68,500 / 100,000 state
  const handleResetGoal = async () => {
    setResetting(true);
    setUnlockedExperienceActive(false);
    try {
      await fetch("/api/goals/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorProfileId: "c1",
          title: "MIDNIGHT GOAL",
          description: "Exclusive midnight milestone goal unlocked by community contributions.",
          rewardDescription: "“At 100,000 the special experience unlocks.”",
          targetCredits: 100000,
          initialCredits: 68500,
          unlockType: "SPECIAL_EXPERIENCE",
          unlockTitle: "MIDNIGHT GOAL — Special Experience Unlocked!",
          unlockDescription: "At 100,000 the special experience unlocks.",
        }),
      });
      window.location.reload();
    } catch (err) {
      console.error("Reset goal failed:", err);
    } finally {
      setResetting(false);
    }
  };

  // Top up demo wallet balance
  const handleAddTokens = () => {
    updateBalance(currentUser.walletBalance + 50000);
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-pink-500 selection:text-white">
      {/* Glow Effects */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] pointer-events-none bg-gradient-to-b from-pink-600/15 via-purple-600/10 to-transparent blur-[120px] -z-10" />

      {/* Top Navigation Bar */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-500 to-pink-600 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-wider text-white">
                Collective Goals Engine
              </h1>
              <p className="text-[10px] text-zinc-400 font-medium">
                Authoritative Real-Time Milestone & Unlock System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Wallet Quick Action */}
            <div className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/90 px-3.5 py-1.5 shadow-inner">
              <Wallet className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-black text-amber-400">
                {currentUser.walletBalance.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-zinc-500 uppercase">Tokens</span>
              <button
                onClick={handleAddTokens}
                title="Add Demo Tokens"
                className="ml-1 text-[10px] font-black uppercase text-pink-400 hover:text-pink-300 transition-colors"
              >
                +Top Up
              </button>
            </div>

            {/* Reset Goal Demo Button */}
            <button
              onClick={handleResetGoal}
              disabled={resetting}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all disabled:opacity-50"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${resetting ? "animate-spin" : ""}`} />
              <span>Reset to 68,500 / 100,000</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Live Stream Visual Canvas & Active Unlocked Stage */}
          <div className="lg:col-span-7 space-y-6">
            <div className="relative aspect-video w-full overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl ring-1 ring-white/10">
              {unlockedExperienceActive ? (
                /* Unlocked Special Experience Stage */
                <div className="relative h-full w-full bg-gradient-to-tr from-purple-950 via-zinc-950 to-pink-950 flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-500">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shadow-[0_0_40px_rgba(245,158,11,0.4)] mb-4 animate-bounce">
                    <Trophy className="h-8 w-8" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-400 mb-2">
                    <Sparkles className="h-3.5 w-3.5" />
                    Special Experience Unlocked & Live
                  </span>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight">
                    Midnight Secret After-Hours VIP Stage
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-zinc-300 max-w-md">
                    The collective goal crossed 100,000 tokens! All spectators in the room now have full unlocked access to this exclusive stage.
                  </p>
                </div>
              ) : (
                /* Standard Live Stream View */
                <div className="relative h-full w-full">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1200&auto=format&fit=crop"
                    alt="Live Stream Feed"
                    className="h-full w-full object-cover brightness-75"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Live Room Badges */}
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-full bg-rose-600/90 px-3 py-1 text-xs font-black uppercase tracking-wider text-white shadow-lg backdrop-blur-md">
                      <Radio className="h-3 w-3 animate-pulse" />
                      <span>LIVE</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-zinc-200 backdrop-blur-md">
                      <Users className="h-3.5 w-3.5 text-zinc-400" />
                      <span>2,840 Spectators</span>
                    </div>
                  </div>

                  {/* Stream Watermark / Creator Tag */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-black text-white drop-shadow-md">
                        Elena Vance • Late Night Interactive
                      </h4>
                      <p className="text-xs text-zinc-300 font-medium drop-shadow-md">
                        Contributing to the Midnight Milestone!
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Architecture Explainer Card */}
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-pink-400" />
                <span>How the Collective Goals Engine Works</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 space-y-1.5">
                  <span className="font-extrabold text-pink-400">1. Atomic Ledger Processing</span>
                  <p className="text-zinc-400 leading-relaxed">
                    When a fan chips in, the backend performs an immutable double-entry debit on the fan wallet and credit on the creator wallet.
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 space-y-1.5">
                  <span className="font-extrabold text-amber-400">2. Real-Time Room Fan-Out</span>
                  <p className="text-zinc-400 leading-relaxed">
                    `GOAL_UPDATED` events are broadcasted across SSE to every spectator in the room simultaneously with sub-5ms latency.
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 space-y-1.5">
                  <span className="font-extrabold text-purple-400">3. Multi-Viewer Animation Sync</span>
                  <p className="text-zinc-400 leading-relaxed">
                    The progress bar animates with cubic easing and numerical rolling interpolation so all viewers witness the same collective progress.
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 space-y-1.5">
                  <span className="font-extrabold text-emerald-400">4. Predetermined Unlock Trigger</span>
                  <p className="text-zinc-400 leading-relaxed">
                    When 100,000 is crossed, the backend marks the goal completed, generates the predetermined unlock, and fires `GOAL_COMPLETED`.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: The Visually Dramatic Goal Interface */}
          <div className="lg:col-span-5 space-y-6">
            <DramaticCollectiveGoal
              creatorId="c1"
              onUnlockExperience={() => setUnlockedExperienceActive(true)}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
