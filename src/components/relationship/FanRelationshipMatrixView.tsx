"use client";

import React from "react";
import {
  Sparkles,
  Trophy,
  Flame,
  Crown,
  HeartHandshake,
  Shield,
  Coins,
  Clock,
  ArrowRight,
  UserCheck,
} from "lucide-react";
import {
  FanCreatorRelationshipCard,
  FanMultiCreatorMatrix,
  RelationshipTierCode,
} from "@/modules/relationship/types";
import { RelationshipBadge } from "./RelationshipBadge";

interface FanRelationshipMatrixViewProps {
  matrix: FanMultiCreatorMatrix | null;
  onSelectCreator?: (creatorProfileId: string) => void;
  selectedCreatorId?: string;
}

export function FanRelationshipMatrixView({
  matrix,
  onSelectCreator,
  selectedCreatorId,
}: FanRelationshipMatrixViewProps) {
  if (!matrix) {
    return (
      <div className="rounded-3xl bg-zinc-950/60 border border-zinc-800/80 p-8 text-center text-zinc-500">
        Loading fan creator progression matrix...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Matrix Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <img
            src={matrix.fanAvatarUrl}
            alt={matrix.fanDisplayName}
            className="h-12 w-12 rounded-2xl object-cover ring-2 ring-pink-500/40"
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-white">
                {matrix.fanDisplayName}'s Multi-Creator Portfolio
              </h3>
              <span className="rounded-full bg-pink-500/20 px-2.5 py-0.5 text-[10px] font-mono text-pink-300 border border-pink-500/30">
                @{matrix.fanUsername}
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Each relationship is strictly creator-specific with independent XP & tiers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span>Active with:</span>
          <strong className="text-white font-mono bg-zinc-900 border border-zinc-800 px-2 py-1 rounded-xl">
            {matrix.totalCreatorsSupported} Creators
          </strong>
        </div>
      </div>

      {/* Creator Relationship Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {matrix.relationships.map((card) => {
          const isSelected = selectedCreatorId === card.creatorProfileId;

          return (
            <div
              key={card.creatorProfileId}
              onClick={() => onSelectCreator && onSelectCreator(card.creatorProfileId)}
              className={`group relative rounded-3xl p-5 border transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                isSelected
                  ? "bg-zinc-900/90 border-pink-500 ring-2 ring-pink-500/30 shadow-xl shadow-pink-500/10"
                  : "bg-zinc-950/80 border-zinc-800/90 hover:border-zinc-700 hover:bg-zinc-900/50"
              }`}
            >
              {/* Creator Card Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={card.creatorAvatarUrl}
                      alt={card.creatorStageName}
                      className="h-12 w-12 rounded-2xl object-cover ring-2 ring-zinc-800 group-hover:ring-pink-500/40 transition-all"
                    />
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-950 text-[9px] font-black text-amber-400 border border-amber-500/40">
                      Lv.{card.currentLevel}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white group-hover:text-pink-300 transition-colors">
                      {card.creatorStageName}
                    </h4>
                    <p className="text-[11px] font-mono text-zinc-500">
                      {card.coBrandTitle}
                    </p>
                  </div>
                </div>

                <RelationshipBadge
                  tier={card.relationshipTier}
                  level={card.currentLevel}
                  size="xs"
                />
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5 bg-zinc-900/60 rounded-2xl p-3 border border-zinc-800/80">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-zinc-300">
                    {card.tierName}
                  </span>
                  <span className="font-mono text-pink-400 font-bold">
                    {card.totalXp.toLocaleString()} XP
                  </span>
                </div>

                <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-amber-400 transition-all duration-500"
                    style={{ width: `${Math.max(4, card.progressPercent)}%` }}
                  />
                </div>

                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span>{card.progressPercent}% to next</span>
                  <span>{card.xpInCurrentTier.toLocaleString()} / {card.xpRequiredForNextTier.toLocaleString()} XP</span>
                </div>
              </div>

              {/* Engagement Stats */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-xl bg-zinc-900/40 border border-zinc-800/60 p-2 flex items-center gap-2">
                  <Coins className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-zinc-500 block text-[9px]">Spent</span>
                    <strong className="text-white font-mono">
                      {card.totalCreditsSpent.toLocaleString()}
                    </strong>
                  </div>
                </div>

                <div className="rounded-xl bg-zinc-900/40 border border-zinc-800/60 p-2 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <div>
                    <span className="text-zinc-500 block text-[9px]">Watched</span>
                    <strong className="text-white font-mono">
                      {card.totalMinutesWatched}m
                    </strong>
                  </div>
                </div>
              </div>

              {/* Footer CTA */}
              <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs font-bold text-zinc-400 group-hover:text-pink-400 transition-colors">
                <span>View Full Relationship Tree</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
