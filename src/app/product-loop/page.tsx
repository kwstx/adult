"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  RotateCcw,
  Sparkles,
  Shield,
  CreditCard,
  Tv,
  CheckCircle2,
  TrendingUp,
  Award,
  Crown,
  Zap,
  ArrowRight,
  Radio,
  Eye,
  MessageSquare,
  Gift,
  Lock,
  Unlock,
  ChevronRight,
  Check,
  Flame,
} from "lucide-react";
import { ProductLoopScenarioState } from "@/modules/scenarios/product-loop-orchestrator";

const STEPS_METADATA = [
  { step: 1, title: "1. Authentication", desc: "Fan arrives & profile loads (0c, NEW_FAN)" },
  { step: 2, title: "2. Live Discovery", desc: "Feed service displays Creator Luna" },
  { step: 3, title: "3. Watch 45s", desc: "Telemetry records viewing event" },
  { step: 4, title: "4. Interaction Menu", desc: "Catalog loads (100c, 500c, 1000c)" },
  { step: 5, title: "5. Deposit 100c", desc: "Webhook confirms & ledger credits wallet" },
  { step: 6, title: "6. Buy Question", desc: "Zero-trust verify, debit & 80/20 split" },
  { step: 7, title: "7. Creator Accepts", desc: "Control room receives event & accepts" },
  { step: 8, title: "8. Execute Order", desc: "Interaction happens; order completed" },
  { step: 9, title: "9. Level Up", desc: "500 XP earned -> LEVEL UP — SUPPORTER" },
  { step: 10, title: "10. Leaderboard", desc: "Goal progresses & Alex reaches Rank #2" },
  { step: 11, title: "11. VIP Sub", desc: "Fan subscribes; entitlements granted" },
  { step: 12, title: "12. Day 2 Boost", desc: "Affinity engine elevates Luna to #1" },
];

export default function CompleteProductLoopPage() {
  const [scenarioState, setScenarioState] = useState<ProductLoopScenarioState | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPlayingAuto, setIsPlayingAuto] = useState(false);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const terminalBottomRef = useRef<HTMLDivElement | null>(null);

  // Load initial state
  const loadState = async (reset = false) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/scenario/product-loop${reset ? "?reset=true" : ""}`);
      const data = await res.json();
      if (data.success) {
        setScenarioState(data.state);
      }
    } catch (err) {
      console.error("Failed to load scenario state", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadState();
    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [scenarioState?.activeEventLog]);

  // Execute specific step
  const executeStep = async (stepNum: number) => {
    try {
      setLoading(true);
      const res = await fetch("/api/scenario/product-loop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "step", step: stepNum }),
      });
      const data = await res.json();
      if (data.success) {
        setScenarioState(data.state);
      }
    } catch (err) {
      console.error("Failed executing step", err);
    } finally {
      setLoading(false);
    }
  };

  // Run full loop
  const executeFullLoop = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/scenario/product-loop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_full" }),
      });
      const data = await res.json();
      if (data.success) {
        setScenarioState(data.state);
      }
    } catch (err) {
      console.error("Failed executing full loop", err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-play stepper
  const toggleAutoPlay = () => {
    if (isPlayingAuto) {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
      setIsPlayingAuto(false);
      return;
    }

    setIsPlayingAuto(true);
    let current = scenarioState?.currentStep || 0;

    autoPlayTimerRef.current = setInterval(async () => {
      current += 1;
      if (current > 12) {
        if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
        setIsPlayingAuto(false);
        return;
      }
      await executeStep(current);
    }, 1800);
  };

  const handleReset = async () => {
    if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    setIsPlayingAuto(false);
    await loadState(true);
  };

  if (!scenarioState) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
          <p className="text-sm font-medium text-zinc-400">Loading Product Loop Scenario Engine...</p>
        </div>
      </div>
    );
  }

  const currentStep = scenarioState.currentStep;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-pink-500/30">
      {/* HEADER BAR */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-600 to-indigo-600 shadow-lg shadow-pink-500/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-white">
                  End-to-End Product Loop
                </h1>
                <span className="rounded-full border border-pink-500/30 bg-pink-500/10 px-2.5 py-0.5 text-[10px] font-bold text-pink-400 uppercase tracking-wider">
                  Authoritative Core Loop
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Discover → Watch → Menu → Webhook Top-Up → Zero-Trust Purchase → Queue → Control Room → XP Level Up → Leaderboard → VIP Sub → Day 2 Feed Boost
              </p>
            </div>
          </div>

          {/* CONTROLS */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2 text-xs font-semibold text-zinc-300 transition-all hover:bg-zinc-800 hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>

            <button
              onClick={toggleAutoPlay}
              disabled={loading}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-md ${
                isPlayingAuto
                  ? "bg-amber-500 text-black shadow-amber-500/20 animate-pulse"
                  : "bg-gradient-to-r from-pink-600 to-indigo-600 text-white shadow-pink-500/20 hover:from-pink-500 hover:to-indigo-500"
              }`}
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              {isPlayingAuto ? "Pause Auto-Play" : "Auto-Play Complete Loop"}
            </button>

            <button
              onClick={() => executeStep(currentStep + 1)}
              disabled={loading || currentStep >= 12}
              className="flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2 text-xs font-bold text-zinc-900 transition-all hover:bg-white disabled:opacity-40"
            >
              Next Step ({currentStep + 1 > 12 ? 12 : currentStep + 1}/12)
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* STEPPER TIMELINE */}
        <div className="border-t border-zinc-800/60 bg-zinc-900/30 px-6 py-2.5 overflow-x-auto">
          <div className="mx-auto flex max-w-7xl items-center gap-2 min-w-max">
            {STEPS_METADATA.map((meta) => {
              const isPast = meta.step < currentStep;
              const isCurrent = meta.step === currentStep;
              return (
                <button
                  key={meta.step}
                  onClick={() => executeStep(meta.step)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                    isCurrent
                      ? "bg-pink-600 text-white shadow-md shadow-pink-600/30 scale-105 font-bold"
                      : isPast
                      ? "bg-zinc-800/80 text-zinc-200 hover:bg-zinc-700"
                      : "bg-zinc-900/50 text-zinc-500 hover:bg-zinc-800/60"
                  }`}
                >
                  {isPast ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <span className="h-3 w-3 flex items-center justify-center text-[10px]">
                      {meta.step}
                    </span>
                  )}
                  <span>{meta.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* CELEBRATION MODAL BANNER */}
      {scenarioState.celebrationBanner && scenarioState.celebrationBanner.show && (
        <div className="mx-auto max-w-7xl px-6 pt-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="relative overflow-hidden rounded-3xl border border-blue-500/40 bg-gradient-to-r from-blue-950/80 via-indigo-950/80 to-purple-950/80 p-6 shadow-2xl shadow-blue-500/20 backdrop-blur-xl">
            <div className="absolute top-0 right-0 h-48 w-48 bg-blue-500/10 blur-3xl" />
            <div className="flex items-center justify-between gap-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-xl shadow-blue-500/40 animate-bounce">
                  <Shield className="h-7 w-7 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-blue-500/20 px-3 py-0.5 text-[11px] font-black text-blue-300 uppercase tracking-widest border border-blue-400/30">
                      Authoritative Realtime Event
                    </span>
                    <span className="text-xs text-blue-400/80 font-mono">
                      RELATIONSHIP_LEVEL_UP
                    </span>
                  </div>
                  <h2 className="text-2xl font-black tracking-tight text-white mt-1">
                    {scenarioState.celebrationBanner.title}
                  </h2>
                  <p className="text-xs text-blue-200/90 mt-0.5">
                    {scenarioState.celebrationBanner.subtitle} • Unlocked:{" "}
                    <span className="font-bold text-white">
                      {scenarioState.celebrationBanner.badgeUnlocked}
                    </span>
                  </p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-3">
                <div className="rounded-2xl border border-blue-400/20 bg-blue-900/30 px-4 py-2.5 text-center">
                  <div className="text-[10px] uppercase font-bold text-blue-300">New Tier</div>
                  <div className="text-sm font-black text-white">SUPPORTER</div>
                </div>
                <div className="rounded-2xl border border-blue-400/20 bg-blue-900/30 px-4 py-2.5 text-center">
                  <div className="text-[10px] uppercase font-bold text-blue-300">Discount</div>
                  <div className="text-sm font-black text-emerald-400">5% OFF Tips</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3-COLUMN WORKSTATION GRID */}
      <main className="mx-auto max-w-7xl p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ============================================================ */}
        {/* LEFT COLUMN: FAN EXPERIENCE & LIVE STREAM (col-span-4)       */}
        {/* ============================================================ */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* FAN PROFILE CARD */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 backdrop-blur-xl shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={scenarioState.fan.avatarUrl}
                    alt="Fan"
                    className="h-12 w-12 rounded-2xl object-cover border border-zinc-700"
                  />
                  <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white border-2 border-zinc-900">
                    {scenarioState.fan.currentLevel}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    {scenarioState.fan.displayName}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        scenarioState.fan.relationshipTier === "SUPPORTER"
                          ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {scenarioState.fan.relationshipTier === "SUPPORTER" && (
                        <Shield className="h-3 w-3 text-blue-400" />
                      )}
                      {scenarioState.fan.relationshipTier}
                    </span>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      {scenarioState.fan.totalXp} XP
                    </span>
                  </div>
                </div>
              </div>

              {/* WALLET BALANCE HUD */}
              <div className="text-right">
                <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Wallet Balance
                </div>
                <div className="flex items-center justify-end gap-1.5 text-lg font-black text-amber-400">
                  <CreditCard className="h-4 w-4" />
                  <span>{scenarioState.fan.walletBalance}</span>
                  <span className="text-xs font-bold text-amber-400/80">credits</span>
                </div>
              </div>
            </div>

            {/* ENTITLEMENTS LIST */}
            <div>
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Active Entitlements</span>
                <span className="text-xs text-zinc-500 font-mono">
                  {scenarioState.fan.entitlements.length} Active
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {scenarioState.fan.entitlements.length === 0 ? (
                  <span className="text-xs text-zinc-600 italic">No VIP entitlements active yet</span>
                ) : (
                  scenarioState.fan.entitlements.map((ent) => (
                    <span
                      key={ent}
                      className="inline-flex items-center gap-1 rounded-lg border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-[10px] font-bold text-purple-300"
                    >
                      <Unlock className="h-2.5 w-2.5 text-purple-400" />
                      {ent}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* SIMULATED LIVE BROADCAST CARD */}
          <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/80 shadow-2xl">
            {/* Live Video Canvas simulation */}
            <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-b from-purple-950/40 via-zinc-900 to-black flex items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(236,72,153,0.15),_transparent_70%)]" />
              
              <div className="text-center relative z-10">
                <div className="inline-flex items-center gap-2 rounded-full border border-pink-500/30 bg-pink-500/20 px-3 py-1 text-xs font-bold text-pink-300 mb-2 animate-pulse">
                  <Radio className="h-3 w-3 text-pink-400" />
                  LIVE BROADCAST
                </div>
                <h4 className="text-base font-black text-white">{scenarioState.creatorLuna.stageName}</h4>
                <p className="text-xs text-zinc-400 mt-0.5">{scenarioState.creatorLuna.streamTitle}</p>
              </div>

              <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-xl bg-black/60 backdrop-blur-md px-2.5 py-1 text-xs font-bold text-zinc-300 border border-zinc-800">
                <Eye className="h-3.5 w-3.5 text-pink-400" />
                1,420
              </div>
            </div>

            {/* LIVE GOAL PROGRESS HUD */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/40">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-zinc-200 flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-amber-500" />
                  {scenarioState.creatorLuna.liveGoal.title}
                </span>
                <span className="font-mono font-bold text-amber-400">
                  {scenarioState.creatorLuna.liveGoal.currentCredits} / {scenarioState.creatorLuna.liveGoal.targetCredits} credits ({scenarioState.creatorLuna.liveGoal.progressPercent}%)
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 to-amber-500 transition-all duration-500"
                  style={{ width: `${scenarioState.creatorLuna.liveGoal.progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* INTERACTION MENU (CATALOG) */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 backdrop-blur-xl shadow-xl">
            <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                <Gift className="h-4 w-4 text-pink-400" />
                Luna's Interaction Menu
              </h3>
              <span className="text-[10px] text-zinc-500 font-mono">Active Catalog</span>
            </div>

            <div className="flex flex-col gap-2.5">
              {scenarioState.creatorLuna.activeInteractions.map((item) => {
                const isSelected = item.id === "inter_ask_question";
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between rounded-2xl p-3 border transition-all ${
                      isSelected
                        ? "border-pink-500/50 bg-pink-500/10 shadow-lg shadow-pink-500/10"
                        : "border-zinc-800 bg-zinc-900/50"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        {item.title}
                        {isSelected && (
                          <span className="rounded-full bg-pink-500 px-1.5 py-0.2 text-[9px] font-black text-white">
                            Selected in Scenario
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">{item.description}</p>
                    </div>
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-black text-amber-400">
                      {item.priceCredits} c
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* CENTER COLUMN: EVENT LOG & LEDGER STREAM (col-span-5)        */}
        {/* ============================================================ */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* CURRENT STEP NARRATIVE CARD */}
          <div className="rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-5 shadow-xl">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-pink-400">
              <Zap className="h-3 w-3" />
              Active Scenario Step
            </div>
            <h2 className="text-lg font-black text-white mt-1">{scenarioState.stepName}</h2>
            <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
              {scenarioState.stepDescription}
            </p>
          </div>

          {/* REALTIME EVENT STREAM & AUDIT LOG */}
          <div className="rounded-3xl border border-zinc-800 bg-black/90 p-5 backdrop-blur-xl shadow-2xl flex-1 flex flex-col min-h-[440px]">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300">
                  Authoritative Domain Event Terminal
                </h3>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">
                {scenarioState.activeEventLog.length} Events Dispatched
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-2 font-mono text-xs max-h-[380px]">
              {scenarioState.activeEventLog.map((ev, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-zinc-800/80 bg-zinc-950/80 p-2.5 transition-all hover:border-zinc-700"
                >
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
                    <span className="font-bold text-pink-400">[{ev.eventType}]</span>
                    <span className="text-zinc-600 font-mono">{ev.timestamp}</span>
                  </div>
                  <div className="font-bold text-zinc-200 text-xs">{ev.summary}</div>
                  <div className="text-[11px] text-zinc-400 font-mono mt-1 bg-zinc-900/60 p-1.5 rounded-lg overflow-x-auto text-[10px] text-emerald-400/90">
                    {ev.payloadSnippet}
                  </div>
                </div>
              ))}
              <div ref={terminalBottomRef} />
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: CREATOR STUDIO & DAY 2 COMPARISON (col-span-3) */}
        {/* ============================================================ */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {/* CREATOR STUDIO CONTROL ROOM HUD */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 backdrop-blur-xl shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <Tv className="h-4 w-4 text-indigo-400" />
                Luna's Studio Queue
              </h3>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                Studio HUD Active
              </span>
            </div>

            <div>
              <div className="text-[11px] text-zinc-400 mb-2">Live Incoming Interactions:</div>
              {scenarioState.liveInteractionQueue.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-800 p-4 text-center text-xs text-zinc-600">
                  Queue is currently empty
                </div>
              ) : (
                scenarioState.liveInteractionQueue.map((item) => (
                  <div
                    key={item.queueId}
                    className="rounded-2xl border border-indigo-500/40 bg-indigo-950/20 p-3"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-white">
                      <span>{item.interactionTitle}</span>
                      <span className="text-amber-400 font-mono">{item.priceCredits}c</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">From: {item.fanName}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 text-[10px] font-black text-indigo-300 border border-indigo-500/30">
                        {item.status}
                      </span>
                      <span className="text-[10px] text-zinc-500">Position #{item.position}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* CREATOR EARNINGS BALANCE */}
            <div className="mt-4 border-t border-zinc-800 pt-3 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Luna Total Earned:</span>
              <span className="font-bold text-emerald-400 font-mono">
                +{scenarioState.creatorLuna.totalEarnedCredits} credits (80% net)
              </span>
            </div>
          </div>

          {/* ROOM LEADERBOARD CARD */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 backdrop-blur-xl shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <Crown className="h-4 w-4 text-amber-400" />
                Top Supporters Room Leaderboard
              </h3>
            </div>

            <div className="space-y-2">
              {scenarioState.creatorLuna.leaderboardRank.map((rankItem) => {
                const isAlex = rankItem.userId === scenarioState.fan.id;
                return (
                  <div
                    key={rankItem.userId}
                    className={`flex items-center justify-between rounded-xl p-2.5 text-xs transition-all ${
                      isAlex
                        ? "border border-blue-500/50 bg-blue-500/10 font-bold"
                        : "border border-zinc-800/60 bg-zinc-900/40"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-black ${
                          rankItem.rank === 1
                            ? "bg-amber-500 text-black"
                            : rankItem.rank === 2
                            ? "bg-zinc-300 text-black"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        #{rankItem.rank}
                      </span>
                      <span className="text-white">{rankItem.displayName}</span>
                    </div>
                    <div className="text-right font-mono text-[11px] text-amber-400">
                      {rankItem.creditsContributed}c
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* DAY 1 VS DAY 2 FEED RANKING COMPARATOR */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 backdrop-blur-xl shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                Personalized Feed Affinity
              </h3>
            </div>

            {scenarioState.feedRanking.day2Feed.length > 0 ? (
              <div className="space-y-2">
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-3">
                  <div className="flex items-center justify-between text-xs font-bold text-white">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <Crown className="h-3.5 w-3.5 text-amber-400" />
                      Rank #1: Creator Luna 🌙
                    </span>
                    <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-black text-black">
                      Score: 0.99
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-200/90 mt-1 leading-relaxed">
                    Elevated from #2 (0.72) to #1 (0.99) due to 45s watch time + 100c question + VIP sub + Supporter Tier!
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-xs text-zinc-500 italic p-2">
                Day 1 baseline: Luna is at Rank #2 (Score 0.72). Complete scenario to see Day 2 boost to #1!
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
