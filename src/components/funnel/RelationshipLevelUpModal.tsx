"use client";

import React from "react";
import { Sparkles, Trophy, Crown, CheckCircle2, X, Heart, Zap } from "lucide-react";
import { AnimatedRelationshipBadge } from "../animation/AnimatedRelationshipBadge";

interface RelationshipLevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  data?: {
    creatorName?: string;
    newLevel?: number;
    previousLevel?: number;
    newTier?: string;
    tierName?: string;
    totalXp?: number;
    xpAwarded?: number;
    coBrandTitle?: string;
    unlockedPerks?: Array<{ title: string; description: string; icon?: string }>;
  };
}

export function RelationshipLevelUpModal({
  isOpen,
  onClose,
  data,
}: RelationshipLevelUpModalProps) {
  if (!isOpen) return null;

  const creatorName = data?.creatorName || "Creator";
  const newLevel = data?.newLevel || 2;
  const tierName = data?.tierName || "Supporter";
  const xpAwarded = data?.xpAwarded || 250;
  const coBrand = data?.coBrandTitle || `YOU × ${creatorName.toUpperCase()}`;

  const perks = data?.unlockedPerks && data.unlockedPerks.length > 0
    ? data.unlockedPerks
    : [
        {
          title: "Supporter Chat Badge",
          description: "Exclusive glowing supporter emblem next to your username in live chat",
          icon: "🛡️",
        },
        {
          title: "Priority Interaction Queue",
          description: "Your toy buzzes and dance requests jump ahead of standard viewers",
          icon: "⚡",
        },
        {
          title: "Day 1 Streak Initiated",
          description: "+25% XP multiplier ready for your next session tomorrow",
          icon: "🔥",
        },
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-pink-500/50 bg-gradient-to-b from-zinc-950 via-zinc-900 to-black p-6 text-center shadow-[0_0_100px_rgba(236,72,153,0.35)] animate-slide-up">
        {/* Radiant Aura Burst */}
        <div className="pointer-events-none absolute -top-28 left-1/2 -translate-x-1/2 h-56 w-56 rounded-full bg-pink-500/25 blur-3xl animate-pulse" />
        <div className="pointer-events-none absolute -bottom-28 left-1/2 -translate-x-1/2 h-56 w-56 rounded-full bg-amber-500/20 blur-3xl" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Crown Badge */}
        <div className="relative mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-pink-600 via-rose-500 to-amber-400 shadow-2xl shadow-pink-600/40 ring-4 ring-pink-500/30">
          <Crown className="h-10 w-10 text-white animate-bounce" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-pink-400" />
          </span>
        </div>

        {/* Co-Brand Title */}
        <p className="text-[11px] font-black uppercase tracking-widest text-pink-400 drop-shadow-md">
          {coBrand}
        </p>

        <h2 className="mt-1 text-2xl font-black text-white sm:text-3xl tracking-tight">
          RELATIONSHIP LEVEL UP!
        </h2>

        {/* Relationship Tier Badge */}
        <div className="mt-3 flex items-center justify-center gap-2">
          <AnimatedRelationshipBadge
            tier={data?.newTier || "SUPPORTER"}
            level={newLevel}
            displayName={tierName}
            isAscending={true}
            previousLevel={data?.previousLevel || 1}
            variant="pill"
          />
          <span className="text-xs font-bold text-emerald-400">+{xpAwarded} XP Gained</span>
        </div>

        <p className="mt-2 text-xs text-zinc-300">
          Congratulations! You unlocked <strong className="text-pink-300">{tierName} Status</strong> with {creatorName}.
        </p>

        {/* Unlocked Perks List */}
        <div className="mt-4 space-y-2 text-left">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 text-center">
            New Privileges & Status Unlocked
          </p>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2.5 backdrop-blur-md">
            {perks.map((p, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                <span className="text-base select-none mt-0.5">{p.icon || "✨"}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white flex items-center gap-1">
                    <span>{p.title}</span>
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-snug">{p.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Next Tier Progress Teaser */}
        <div className="mt-4 rounded-xl bg-black/50 border border-white/10 p-2.5 flex items-center justify-between text-xs">
          <span className="text-[11px] text-zinc-400">Next Status: <strong className="text-amber-300">Superfan (Level 3)</strong></span>
          <span className="text-[10px] font-bold text-pink-400">250 XP to next tier</span>
        </div>

        {/* Dismiss Button */}
        <div className="mt-5">
          <button
            onClick={onClose}
            className="w-full rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-amber-500 py-3 text-sm font-black text-white shadow-xl shadow-pink-600/30 hover:opacity-95 active:scale-95 transition-all"
          >
            Continue Watching & Interacting
          </button>
        </div>
      </div>
    </div>
  );
}
