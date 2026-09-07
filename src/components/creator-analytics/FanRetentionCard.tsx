"use client";

import React from "react";
import {
  FanRetentionAnalysis,
  RelationshipDistribution,
} from "@/modules/analytics/types";
import { Users, RotateCcw, Heart, ShieldCheck, TrendingUp, Award } from "lucide-react";

interface FanRetentionCardProps {
  retention: FanRetentionAnalysis;
  relationships: RelationshipDistribution;
}

export const FanRetentionCard: React.FC<FanRetentionCardProps> = ({
  retention,
  relationships,
}) => {
  const {
    totalUniqueFans,
    averageFanLifespanDays,
    retentionRateD1Percent,
    retentionRateD7Percent,
    retentionRateD30Percent,
    retentionRateD90Percent,
    churnRateMonthlyPercent,
    repeatPurchaserRatePercent,
    retentionScore,
  } = retention;

  const totalRel = Math.max(1, relationships.totalRelationships);

  const relationshipTiers = [
    { name: "Royal Patrons", count: relationships.royalPatrons, color: "bg-amber-400", textColor: "text-amber-400" },
    { name: "Soulmates", count: relationships.soulmates, color: "bg-purple-400", textColor: "text-purple-400" },
    { name: "VIP Devotees", count: relationships.vipDevotees, color: "bg-blue-400", textColor: "text-blue-400" },
    { name: "Superfans", count: relationships.superfans, color: "bg-pink-400", textColor: "text-pink-400" },
    { name: "Supporters", count: relationships.supporters, color: "bg-emerald-400", textColor: "text-emerald-400" },
    { name: "Strangers", count: relationships.strangers, color: "bg-zinc-600", textColor: "text-zinc-400" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Fan Retention & Cohorts */}
      <div className="rounded-3xl bg-zinc-950/80 border border-zinc-800/80 p-6 lg:p-8 space-y-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Fan Retention & Cohort Return Rates
            </h3>
            <p className="text-[11px] text-zinc-400">Audience loyalty, return probability & lifespan</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 text-xs font-mono font-bold border border-purple-500/20">
            <span>Score: {retentionScore}/100</span>
          </div>
        </div>

        {/* Top Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/60">
            <div className="text-[10px] font-bold text-zinc-400 uppercase">Avg Fan Lifespan</div>
            <div className="text-xl font-black text-white font-mono mt-0.5">{averageFanLifespanDays}d</div>
            <div className="text-[10px] text-zinc-400">duration active</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/60">
            <div className="text-[10px] font-bold text-zinc-400 uppercase">Repeat Purchasers</div>
            <div className="text-xl font-black text-purple-400 font-mono mt-0.5">{repeatPurchaserRatePercent}%</div>
            <div className="text-[10px] text-zinc-400">2+ purchases</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/60">
            <div className="text-[10px] font-bold text-zinc-400 uppercase">Monthly Churn</div>
            <div className="text-xl font-black text-rose-400 font-mono mt-0.5">{churnRateMonthlyPercent}%</div>
            <div className="text-[10px] text-zinc-400">low churn rate</div>
          </div>
        </div>

        {/* Cohort Return Rates Visual Grid */}
        <div className="space-y-3 pt-2">
          <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
            Cohort Return Retention Rates
          </div>

          <div className="grid grid-cols-4 gap-2.5">
            <div className="p-3 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 text-center space-y-1">
              <div className="text-[10px] font-bold text-zinc-400">Day 1 Return</div>
              <div className="text-lg font-black text-emerald-400 font-mono">{retentionRateD1Percent}%</div>
              <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full bg-emerald-400" style={{ width: `${retentionRateD1Percent}%` }} />
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 text-center space-y-1">
              <div className="text-[10px] font-bold text-zinc-400">Day 7 Return</div>
              <div className="text-lg font-black text-teal-400 font-mono">{retentionRateD7Percent}%</div>
              <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full bg-teal-400" style={{ width: `${retentionRateD7Percent}%` }} />
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 text-center space-y-1">
              <div className="text-[10px] font-bold text-zinc-400">Day 30 Return</div>
              <div className="text-lg font-black text-purple-400 font-mono">{retentionRateD30Percent}%</div>
              <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full bg-purple-400" style={{ width: `${retentionRateD30Percent}%` }} />
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 text-center space-y-1">
              <div className="text-[10px] font-bold text-zinc-400">Day 90 Return</div>
              <div className="text-lg font-black text-pink-400 font-mono">{retentionRateD90Percent}%</div>
              <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full bg-pink-400" style={{ width: `${retentionRateD90Percent}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Relationship-Level Distribution */}
      <div className="rounded-3xl bg-zinc-950/80 border border-zinc-800/80 p-6 lg:p-8 space-y-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Relationship-Level Distribution
            </h3>
            <p className="text-[11px] text-zinc-400">Fans migrating across emotional progression tiers</p>
          </div>
          <span className="text-xs font-mono text-zinc-400">{relationships.totalRelationships} Total Connected Fans</span>
        </div>

        {/* Stacked Tier Bar */}
        <div className="h-3.5 rounded-full bg-zinc-900 overflow-hidden flex shadow-inner">
          {relationshipTiers.map((t, i) => {
            const pct = ((t.count / totalRel) * 100).toFixed(1);
            return (
              <div
                key={i}
                className={`h-full ${t.color}`}
                style={{ width: `${pct}%` }}
                title={`${t.name}: ${t.count} fans (${pct}%)`}
              />
            );
          })}
        </div>

        {/* Breakdown List */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {relationshipTiers.map((tier, idx) => {
            const pct = ((tier.count / totalRel) * 100).toFixed(1);
            return (
              <div key={idx} className="p-3 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${tier.color}`} />
                  <span className="text-xs font-bold text-zinc-300">{tier.name}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className={`text-base font-black font-mono ${tier.textColor}`}>
                    {tier.count}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
