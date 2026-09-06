"use client";

import React from "react";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Radio,
  Flame,
  Sparkles,
  Coins,
  Check,
  Play,
  RotateCcw,
  Clock,
  Shield,
  AlertTriangle,
  Award,
  Layers,
  ShoppingBag,
  ExternalLink,
} from "lucide-react";
import type {
  LiveQueueItem,
  StreamGoal,
  PurchaseLedgerItem,
  ModerationRuleConfig,
} from "@/types/control-room";

interface CenterStudioCanvasProps {
  videoPreviewRef: React.RefObject<HTMLVideoElement | null>;
  isCameraActive: boolean;
  isMicActive: boolean;
  audioMeterLevel: number;
  moderationRules: ModerationRuleConfig;
  interactionQueue: LiveQueueItem[];
  activeGoal: StreamGoal;
  purchaseLedger: PurchaseLedgerItem[];
  isConfettiActive: boolean;
  onToggleCamera: () => void;
  onToggleMic: () => void;
  onAcceptQueueItem: (id: string) => void;
  onCompleteQueueItem: (id: string) => void;
  onSkipQueueItem: (id: string) => void;
  onOpenEditGoal: () => void;
  onTriggerGoalCelebration: () => void;
}

export function CenterStudioCanvas({
  videoPreviewRef,
  isCameraActive,
  isMicActive,
  audioMeterLevel,
  moderationRules,
  interactionQueue,
  activeGoal,
  purchaseLedger,
  isConfettiActive,
  onToggleCamera,
  onToggleMic,
  onAcceptQueueItem,
  onCompleteQueueItem,
  onSkipQueueItem,
  onOpenEditGoal,
  onTriggerGoalCelebration,
}: CenterStudioCanvasProps) {
  const activeExecutingItem = interactionQueue.find((i) => i.status === "EXECUTING");
  const pendingQueueItems = interactionQueue.filter((i) => i.status !== "EXECUTING");

  return (
    <div className="flex-1 flex flex-col h-full bg-black overflow-y-auto p-3 sm:p-4 space-y-4 select-none min-w-0">
      {/* ------------------------------------------------------------- */}
      {/* 1. LIVE VIDEO PREVIEW CANVAS                                  */}
      {/* ------------------------------------------------------------- */}
      <div className="relative aspect-video w-full rounded-3xl bg-zinc-950 border border-zinc-800/80 shadow-2xl overflow-hidden flex items-center justify-center shrink-0">
        {/* Local Camera / Media Element */}
        <video
          ref={videoPreviewRef}
          autoPlay
          playsInline
          muted
          className={`h-full w-full object-cover transform -scale-x-100 ${
            !isCameraActive || moderationRules.isPanicBlackoutActive ? "hidden" : "block"
          }`}
        />

        {/* Panic Blackout Screen Slate */}
        {moderationRules.isPanicBlackoutActive && (
          <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
            <div className="h-16 w-16 rounded-3xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400 animate-pulse">
              <Shield className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-black text-white">PANIC SHIELD ARMED — BE RIGHT BACK</h3>
            <p className="text-xs text-zinc-400 max-w-sm">
              Camera feed and live audio are muted from viewers. Your room remains open.
            </p>
          </div>
        )}

        {/* Camera Off Slate */}
        {!isCameraActive && !moderationRules.isPanicBlackoutActive && (
          <div className="flex flex-col items-center justify-center text-center p-6 text-zinc-500">
            <VideoOff className="h-12 w-12 mb-2" />
            <p className="text-xs font-bold text-zinc-300">Camera Feed Paused</p>
          </div>
        )}

        {/* Confetti Visual Celebration Canvas Overlay */}
        {isConfettiActive && (
          <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center animate-fadeIn">
            <div className="text-center space-y-2">
              <span className="text-5xl animate-bounce">🎉 🎊 💃 🍾</span>
              <div className="rounded-2xl bg-black/80 backdrop-blur-md px-6 py-2 border border-pink-500/50 shadow-2xl">
                <span className="text-base font-black text-pink-300 uppercase tracking-widest">
                  Milestone Reached!
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Top Status Indicators */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            <span className="flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-md px-3 py-1 text-[11px] font-black text-emerald-400 border border-emerald-500/30">
              ● WebRTC WHIP DIRECT
            </span>
          </div>

          {/* Audio VU Meter Decibel Level Bar */}
          <div className="flex items-center gap-2 rounded-2xl bg-black/70 backdrop-blur-md px-3 py-1.5 border border-white/10 pointer-events-auto">
            <Mic className={`h-3.5 w-3.5 ${isMicActive ? "text-emerald-400" : "text-rose-400"}`} />
            <div className="w-16 h-2 rounded-full bg-zinc-800 overflow-hidden flex items-center">
              <div
                className={`h-full transition-all duration-75 ${
                  audioMeterLevel > 80
                    ? "bg-rose-500"
                    : audioMeterLevel > 50
                    ? "bg-amber-400"
                    : "bg-emerald-400"
                }`}
                style={{ width: `${isMicActive ? audioMeterLevel : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Bottom Local Overlays (Camera / Mic quick toggles) */}
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2">
          <button
            onClick={onToggleMic}
            className={`flex h-9 w-9 items-center justify-center rounded-xl backdrop-blur-md transition-all shadow-lg ${
              isMicActive
                ? "bg-black/80 text-zinc-200 border border-white/10 hover:bg-black"
                : "bg-rose-600 text-white shadow-rose-600/40"
            }`}
          >
            {isMicActive ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </button>
          <button
            onClick={onToggleCamera}
            className={`flex h-9 w-9 items-center justify-center rounded-xl backdrop-blur-md transition-all shadow-lg ${
              isCameraActive
                ? "bg-black/80 text-zinc-200 border border-white/10 hover:bg-black"
                : "bg-rose-600 text-white shadow-rose-600/40"
            }`}
          >
            {isCameraActive ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. CURRENT INTERACTION QUEUE                                  */}
      {/* ------------------------------------------------------------- */}
      <div className="rounded-3xl bg-zinc-950 border border-zinc-800/80 p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Sparkles className="h-4 w-4" />
            </span>
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              Live Interaction Queue
            </h3>
            <span className="rounded-full bg-amber-400 text-black px-2 py-0.2 text-[10px] font-black">
              {interactionQueue.length} Active
            </span>
          </div>
          <span className="text-[11px] text-zinc-400">Complete actions live on camera</span>
        </div>

        {/* Active In-Progress Action Card */}
        {activeExecutingItem ? (
          <div className="relative rounded-2xl bg-gradient-to-r from-amber-500/20 via-zinc-900 to-zinc-900 border-2 border-amber-400 p-4 shadow-xl animate-pulse-glow">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <img
                  src={activeExecutingItem.fanAvatar}
                  alt=""
                  className="h-11 w-11 rounded-2xl object-cover ring-2 ring-amber-400 shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white">
                      {activeExecutingItem.actionTitle}
                    </span>
                    <span className="rounded-full bg-amber-400 text-black px-2 py-0.2 text-[10px] font-black">
                      +{activeExecutingItem.credits} 🪙
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 font-semibold mt-0.5">
                    Requested by <span className="text-white font-bold">{activeExecutingItem.fanName}</span>
                  </p>
                  {activeExecutingItem.customMessage && (
                    <p className="text-xs text-amber-300 italic mt-1">
                      &ldquo;{activeExecutingItem.customMessage}&rdquo;
                    </p>
                  )}
                </div>
              </div>

              {/* Countdown Timer & Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5 rounded-2xl bg-zinc-950 border border-amber-400 px-3 py-1.5 text-xs font-mono font-black text-amber-400">
                  <Clock className="h-4 w-4 animate-spin" />
                  <span>{activeExecutingItem.timeRemainingSeconds}s</span>
                </div>

                <button
                  onClick={() => onCompleteQueueItem(activeExecutingItem.id)}
                  className="flex items-center gap-1 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-xs font-black shadow-lg shadow-emerald-600/30 transition-all"
                >
                  <Check className="h-4 w-4" />
                  Done
                </button>
              </div>
            </div>

            {/* Countdown Progress Bar */}
            <div className="h-1.5 w-full rounded-full bg-zinc-800 mt-3 overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-all duration-1000"
                style={{
                  width: `${(activeExecutingItem.timeRemainingSeconds / activeExecutingItem.durationSeconds) * 100}%`,
                }}
              />
            </div>
          </div>
        ) : (
          <div className="p-3 text-center rounded-2xl bg-zinc-900/40 border border-zinc-800/60 text-xs text-zinc-400">
            No interaction currently executing on camera. Accept from queue below.
          </div>
        )}

        {/* Pending Queue Cards */}
        <div className="space-y-2">
          {pendingQueueItems.map((item, idx) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/70 border border-zinc-800 hover:border-pink-500/30 transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={item.fanAvatar}
                  alt=""
                  className="h-9 w-9 rounded-xl object-cover shrink-0 ring-1 ring-zinc-700"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-white truncate">
                      {item.fanName.split(" ")[0] || "Alex"} — {item.actionTitle} — {item.credits} credits
                    </span>
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.2 text-[9px] font-black text-amber-400 border border-amber-500/30">
                      Position #{idx + 1}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400 block truncate">
                    {item.customMessage ? `"${item.customMessage}" • ` : ""}Requested {item.timestamp}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onAcceptQueueItem(item.id)}
                  className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white px-3 py-1.5 text-xs font-bold shadow-md hover:from-pink-500 hover:to-rose-500 transition-all"
                >
                  <Play className="h-3.5 w-3.5" />
                  Perform Now
                </button>
                <button
                  onClick={() => onSkipQueueItem(item.id)}
                  className="rounded-xl p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800"
                  title="Skip / Refund"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. ACTIVE STREAM GOAL CARD                                    */}
      {/* ------------------------------------------------------------- */}
      <div className="rounded-3xl bg-zinc-950 border border-zinc-800/80 p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30">
              <Flame className="h-4 w-4" />
            </span>
            <h3 className="text-xs font-black uppercase tracking-wider text-white">Active Stream Goal</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onTriggerGoalCelebration}
              className="rounded-xl bg-pink-600/20 text-pink-300 hover:bg-pink-600 hover:text-white px-2.5 py-1 text-[11px] font-bold border border-pink-500/30 transition-all"
            >
              Trigger Celebration 🎉
            </button>
            <button
              onClick={onOpenEditGoal}
              className="rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 px-2.5 py-1 text-[11px] font-bold border border-zinc-800 transition-all"
            >
              Edit Goal
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <h4 className="text-sm font-bold text-white">{activeGoal.title}</h4>
            <span className="text-xs font-black text-amber-400">
              {activeGoal.currentTokens} / {activeGoal.targetTokens} Tokens ({activeGoal.percentage}%)
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5">Reward: {activeGoal.rewardDescription}</p>

          {/* Progress Bar */}
          <div className="h-2.5 w-full rounded-full bg-zinc-900 border border-zinc-800 mt-2 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 transition-all duration-500"
              style={{ width: `${Math.min(100, activeGoal.percentage)}%` }}
            />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. RECENT PURCHASES & LIVE LEDGER FEED                        */}
      {/* ------------------------------------------------------------- */}
      <div className="rounded-3xl bg-zinc-950 border border-zinc-800/80 p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Coins className="h-4 w-4" />
            </span>
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              Recent Purchases & Real-Time Ledger
            </h3>
          </div>
          <span className="text-[10px] text-zinc-500 font-bold">Authoritative Double-Entry</span>
        </div>

        <div className="space-y-2">
          {purchaseLedger.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <img src={tx.buyerAvatar} alt="" className="h-7 w-7 rounded-xl object-cover shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white truncate">{tx.buyerName}</span>
                    <span className="rounded bg-zinc-800 px-1.5 py-0.2 text-[9px] font-mono text-zinc-300">
                      {tx.itemType}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 block truncate">{tx.itemTitle}</span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="font-black text-amber-400 block">+{tx.tokensPaid} 🪙</span>
                <span className="text-[9px] text-emerald-400 font-bold">+${tx.netUsd.toFixed(2)} USD</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
