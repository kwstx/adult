"use client";

import React, { useState } from "react";
import {
  X,
  Sparkles,
  Shield,
  HeartHandshake,
  Crown,
  Flame,
  Trophy,
  CheckCircle2,
  Lock,
  Coins,
  Clock,
  Zap,
  ChevronRight,
  TrendingUp,
  MessageSquare,
  Gift,
  Award,
} from "lucide-react";
import {
  CreatorFanRelationshipDetail,
  CreatorRelationshipTreeData,
  RelationshipTierCode,
} from "@/modules/relationship/types";
import { RelationshipBadge } from "./RelationshipBadge";

interface RelationshipTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  relationship: CreatorFanRelationshipDetail | null;
  treeData: CreatorRelationshipTreeData | null;
  onSimulateAction?: (
    action: "TIP_50" | "TIP_500" | "WATCH_30M" | "CHAT_10" | "SUB_VIP" | "CUSTOM",
    customXp?: number
  ) => void;
  isSimulating?: boolean;
}

export function RelationshipTreeModal({
  isOpen,
  onClose,
  relationship,
  treeData,
  onSimulateAction,
  isSimulating = false,
}: RelationshipTreeModalProps) {
  const [selectedTier, setSelectedTier] =
    useState<RelationshipTierCode | null>(null);

  if (!isOpen || !relationship) return null;

  const currentTierCode = relationship.relationshipTier;
  const activeViewingTier = selectedTier || currentTierCode;

  const getTierIcon = (tier: RelationshipTierCode) => {
    switch (tier) {
      case "ELITE":
        return Trophy;
      case "INNER_CIRCLE":
        return Flame;
      case "VIP":
        return Crown;
      case "REGULAR":
        return HeartHandshake;
      case "SUPPORTER":
        return Shield;
      case "NEW_FAN":
      default:
        return Sparkles;
    }
  };

  const tiers = treeData?.tiers || [];
  const selectedTierData =
    tiers.find((t) => t.tier === activeViewingTier) || tiers[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="relative px-6 py-5 border-b border-zinc-800/80 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-3 items-center">
              <img
                src={relationship.fanAvatarUrl}
                alt={relationship.fanDisplayName}
                className="h-10 w-10 rounded-2xl object-cover ring-2 ring-zinc-800"
              />
              <div className="h-6 w-6 rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/40 flex items-center justify-center z-10 text-xs font-black">
                ×
              </div>
              <img
                src={relationship.creatorAvatarUrl}
                alt={relationship.creatorStageName}
                className="h-10 w-10 rounded-2xl object-cover ring-2 ring-purple-500/40"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white font-mono uppercase">
                  {relationship.coBrandTitle}
                </h2>
                <RelationshipBadge
                  tier={relationship.relationshipTier}
                  level={relationship.currentLevel}
                  size="xs"
                />
              </div>
              <p className="text-xs text-zinc-400">
                Creator-specific relationship tree & loyalty perks
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-2xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Active Relationship Overview Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900/90 via-zinc-900/40 to-zinc-950 border border-zinc-800 p-6">
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-widest text-zinc-400 font-bold">
                    Current Progression
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-pink-500 animate-ping" />
                </div>
                <div className="flex items-baseline gap-3">
                  <h3 className="text-2xl font-black text-white">
                    {relationship.tierName}
                  </h3>
                  <span className="text-sm font-mono text-zinc-400">
                    Level {relationship.currentLevel}
                  </span>
                </div>

                {/* Progress Bar & Numbers */}
                <div className="space-y-1.5 pt-1 max-w-xl">
                  <div className="flex justify-between text-xs font-bold font-mono">
                    <span className="text-pink-400">
                      {relationship.progress.xpInCurrentTier.toLocaleString()} /{" "}
                      {relationship.progress.xpRequiredForNextTier.toLocaleString()}{" "}
                      XP
                    </span>
                    <span className="text-zinc-400">
                      {relationship.progress.progressPercent}% to{" "}
                      {relationship.progress.nextTier
                        ? relationship.progress.nextTier.name
                        : "MAX"}
                    </span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-zinc-800/80 overflow-hidden p-0.5 border border-zinc-700/50">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-amber-400 transition-all duration-700 shadow-[0_0_12px_rgba(236,72,153,0.5)]"
                      style={{
                        width: `${Math.max(
                          3,
                          relationship.progress.progressPercent
                        )}%`,
                      }}
                    />
                  </div>
                  {relationship.progress.nextTier && (
                    <p className="text-[11px] text-zinc-400 flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-amber-400" />
                      <span>
                        Need{" "}
                        <strong className="text-white font-mono">
                          {relationship.progress.xpRemainingToNextTier.toLocaleString()}
                        </strong>{" "}
                        more XP to unlock{" "}
                        <strong className="text-pink-300">
                          {relationship.progress.nextTier.name}
                        </strong>
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Quick Relationship Stats */}
              <div className="grid grid-cols-3 gap-3 w-full md:w-auto shrink-0">
                <div className="rounded-2xl bg-zinc-950/60 border border-zinc-800/80 p-3 text-center min-w-[95px]">
                  <div className="flex items-center justify-center gap-1 text-amber-400 text-xs font-bold mb-1">
                    <Coins className="h-3.5 w-3.5" />
                    <span>Spent</span>
                  </div>
                  <div className="text-base font-black font-mono text-white">
                    {relationship.totalCreditsSpent.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-zinc-500">Credits</div>
                </div>

                <div className="rounded-2xl bg-zinc-950/60 border border-zinc-800/80 p-3 text-center min-w-[95px]">
                  <div className="flex items-center justify-center gap-1 text-blue-400 text-xs font-bold mb-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Watched</span>
                  </div>
                  <div className="text-base font-black font-mono text-white">
                    {relationship.totalMinutesWatched}
                  </div>
                  <div className="text-[10px] text-zinc-500">Minutes</div>
                </div>

                <div className="rounded-2xl bg-zinc-950/60 border border-zinc-800/80 p-3 text-center min-w-[95px]">
                  <div className="flex items-center justify-center gap-1 text-rose-400 text-xs font-bold mb-1">
                    <Flame className="h-3.5 w-3.5" />
                    <span>Streak</span>
                  </div>
                  <div className="text-base font-black font-mono text-white">
                    {relationship.currentStreakDays}d
                  </div>
                  <div className="text-[10px] text-zinc-500">Active</div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive 6-Tier Progression Tree Ladder */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-400" />
                  Relationship Tree Nodes
                </h4>
                <p className="text-xs text-zinc-400">
                  Click any tier node to inspect perks and milestone requirements
                </p>
              </div>
              <span className="text-xs font-mono text-zinc-400">
                Total XP:{" "}
                <strong className="text-white">
                  {relationship.totalXp.toLocaleString()}
                </strong>
              </span>
            </div>

            {/* Stepper Node Grid */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {tiers.map((tierItem) => {
                const Icon = getTierIcon(tierItem.tier);
                const isCurrent = tierItem.tier === currentTierCode;
                const isSelected = tierItem.tier === activeViewingTier;
                const isPassed = tierItem.isPassed;
                const isLocked = !isPassed && !isCurrent;

                return (
                  <button
                    key={tierItem.tier}
                    onClick={() => setSelectedTier(tierItem.tier)}
                    className={`relative rounded-2xl p-3.5 text-left transition-all border flex flex-col justify-between min-h-[135px] ${
                      isSelected
                        ? "bg-zinc-900 border-pink-500 ring-2 ring-pink-500/30 shadow-lg shadow-pink-500/10"
                        : isCurrent
                        ? "bg-zinc-900/80 border-purple-500/70 shadow-md"
                        : isPassed
                        ? "bg-zinc-900/40 border-emerald-500/30 hover:border-emerald-500/60"
                        : "bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 opacity-75"
                    }`}
                  >
                    {/* Node Header */}
                    <div className="flex items-center justify-between w-full">
                      <div
                        className={`h-8 w-8 rounded-xl flex items-center justify-center ${
                          isPassed || isCurrent
                            ? "bg-gradient-to-br " + tierItem.gradientClass
                            : "bg-zinc-800 text-zinc-500"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      {isPassed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : isCurrent ? (
                        <span className="flex h-2 w-2 rounded-full bg-pink-500 animate-pulse" />
                      ) : (
                        <Lock className="h-3.5 w-3.5 text-zinc-600" />
                      )}
                    </div>

                    {/* Node Labels */}
                    <div className="mt-3">
                      <div className="text-xs font-black text-white truncate">
                        {tierItem.name}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-400">
                        {tierItem.minXp.toLocaleString()} XP
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="mt-2 text-[9px] font-bold uppercase tracking-wider">
                      {isCurrent ? (
                        <span className="text-pink-400 font-extrabold">Active</span>
                      ) : isPassed ? (
                        <span className="text-emerald-400">Unlocked</span>
                      ) : (
                        <span className="text-zinc-500">Locked</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Tier Perks & Unlockable Details */}
          {selectedTierData && (
            <div className="rounded-3xl bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-2xl flex items-center justify-center bg-gradient-to-br ${selectedTierData.gradientClass}`}
                  >
                    {React.createElement(getTierIcon(selectedTierData.tier), {
                      className: "h-5 w-5",
                    })}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-black text-white">
                        {selectedTierData.name} Tier
                      </h4>
                      <span className="text-xs font-mono text-zinc-400">
                        ({selectedTierData.minXp.toLocaleString()} XP required)
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      {selectedTierData.subtitle}
                    </p>
                  </div>
                </div>

                <RelationshipBadge
                  tier={selectedTierData.tier}
                  showLevel={false}
                  size="sm"
                />
              </div>

              {/* Perks List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedTierData.perks.map((perk) => {
                  const isPerkUnlocked =
                    tiers.findIndex((t) => t.tier === selectedTierData.tier) <=
                    tiers.findIndex((t) => t.tier === currentTierCode);

                  return (
                    <div
                      key={perk.id}
                      className={`rounded-2xl p-3.5 border flex items-start gap-3 ${
                        isPerkUnlocked
                          ? "bg-zinc-900/60 border-zinc-800/90 text-white"
                          : "bg-zinc-950/40 border-zinc-800/40 text-zinc-500"
                      }`}
                    >
                      <div
                        className={`h-7 w-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          isPerkUnlocked
                            ? "bg-pink-500/20 text-pink-400 border border-pink-500/30"
                            : "bg-zinc-800 text-zinc-600"
                        }`}
                      >
                        {isPerkUnlocked ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Lock className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold leading-snug">
                          {perk.title}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                          {perk.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Interactive Simulation Panel (Testing & Live Demonstration) */}
          {onSimulateAction && (
            <div className="rounded-3xl bg-zinc-900/60 border border-zinc-800 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-400" />
                  <h5 className="text-xs font-black uppercase tracking-wider text-white">
                    Live Engagement Simulation (Test XP Progression)
                  </h5>
                </div>
                <span className="text-[10px] text-zinc-500">
                  Simulate fan actions to test live tier advancements
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                <button
                  disabled={isSimulating}
                  onClick={() => onSimulateAction("TIP_50")}
                  className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 hover:bg-amber-950/10 transition-all text-center group"
                >
                  <Coins className="h-4 w-4 text-amber-400 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-white">Tip 50</span>
                  <span className="text-[10px] text-amber-400 font-mono">+500 XP</span>
                </button>

                <button
                  disabled={isSimulating}
                  onClick={() => onSimulateAction("TIP_500")}
                  className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-pink-500/50 hover:bg-pink-950/10 transition-all text-center group"
                >
                  <Gift className="h-4 w-4 text-pink-400 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-white">Major Tip 500</span>
                  <span className="text-[10px] text-pink-400 font-mono">+5,000 XP</span>
                </button>

                <button
                  disabled={isSimulating}
                  onClick={() => onSimulateAction("WATCH_30M")}
                  className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 hover:bg-blue-950/10 transition-all text-center group"
                >
                  <Clock className="h-4 w-4 text-blue-400 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-white">Watch 30m</span>
                  <span className="text-[10px] text-blue-400 font-mono">+150 XP</span>
                </button>

                <button
                  disabled={isSimulating}
                  onClick={() => onSimulateAction("CHAT_10")}
                  className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 hover:bg-emerald-950/10 transition-all text-center group"
                >
                  <MessageSquare className="h-4 w-4 text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-white">10 Messages</span>
                  <span className="text-[10px] text-emerald-400 font-mono">+20 XP</span>
                </button>

                <button
                  disabled={isSimulating}
                  onClick={() => onSimulateAction("SUB_VIP")}
                  className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-purple-500/50 hover:bg-purple-950/10 transition-all text-center group"
                >
                  <Crown className="h-4 w-4 text-purple-400 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-white">Subscribe VIP</span>
                  <span className="text-[10px] text-purple-400 font-mono">+5,000 XP</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
