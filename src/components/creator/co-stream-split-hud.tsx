"use client";

import React, { useState } from "react";
import { DollarSign, PieChart, Users, ArrowUpRight, Sparkles, TrendingUp, ShieldCheck } from "lucide-react";

export interface CreatorSplitSummary {
  creatorProfileId: string;
  displayName: string;
  avatarUrl?: string | null;
  role: string;
  splitPercentage: number;
  totalEarnedCredits: number;
}

interface CoStreamSplitHudProps {
  sessionId: string;
  currentCreatorProfileId: string;
  grossCreditsTotal: number;
  platformRakePercentage?: number;
  participants: CreatorSplitSummary[];
  recentTips?: Array<{
    id: string;
    fanUsername: string;
    grossCredits: number;
    myShareCredits: number;
    timestamp: string;
    message?: string;
  }>;
}

export function CoStreamSplitHud({
  sessionId,
  currentCreatorProfileId,
  grossCreditsTotal,
  platformRakePercentage = 0.20,
  participants,
  recentTips = [],
}: CoStreamSplitHudProps) {
  const myParticipant = participants.find((p) => p.creatorProfileId === currentCreatorProfileId) || participants[0];
  const mySplit = myParticipant?.splitPercentage || 0.5;
  const netPoolTotal = Math.round(grossCreditsTotal * (1 - platformRakePercentage));
  const myEarningsCredits = Math.round(netPoolTotal * mySplit);
  const myEarningsEur = (myEarningsCredits / 100).toFixed(2);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-2xl flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <PieChart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-white text-sm font-bold flex items-center space-x-1.5">
              <span>Co-Stream Split Ledger</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                REAL-TIME
              </span>
            </h3>
            <p className="text-neutral-400 text-xs">Authoritative multi-creator earnings breakdown</p>
          </div>
        </div>
        <div className="flex items-center space-x-1 text-xs text-neutral-400 bg-neutral-950 px-2.5 py-1 rounded-full border border-neutral-800">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>PostgreSQL Atomic Split</span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-3">
        {/* Total Session Gross */}
        <div className="bg-neutral-950/80 rounded-xl p-3 border border-neutral-800">
          <span className="text-neutral-400 text-[11px] font-medium uppercase tracking-wider block">Session Gross</span>
          <div className="mt-1 flex items-baseline space-x-1">
            <span className="text-xl font-black text-white font-mono">{grossCreditsTotal.toLocaleString()}</span>
            <span className="text-xs font-semibold text-purple-400">CR</span>
          </div>
          <span className="text-[10px] text-neutral-500">€{(grossCreditsTotal / 100).toFixed(2)} Total Volume</span>
        </div>

        {/* My Share % */}
        <div className="bg-neutral-950/80 rounded-xl p-3 border border-neutral-800">
          <span className="text-neutral-400 text-[11px] font-medium uppercase tracking-wider block">Agreed Split</span>
          <div className="mt-1 flex items-baseline space-x-1">
            <span className="text-xl font-black text-cyan-400 font-mono">{(mySplit * 100).toFixed(0)}%</span>
            <span className="text-xs font-medium text-neutral-400">cut</span>
          </div>
          <span className="text-[10px] text-neutral-500">20% Platform Rake applied</span>
        </div>

        {/* My Net Earnings */}
        <div className="bg-gradient-to-br from-purple-950/40 via-neutral-950 to-neutral-950 rounded-xl p-3 border border-purple-800/40">
          <span className="text-purple-300 text-[11px] font-bold uppercase tracking-wider block">My Net Earnings</span>
          <div className="mt-1 flex items-baseline space-x-1">
            <span className="text-xl font-black text-purple-400 font-mono">+{myEarningsCredits.toLocaleString()}</span>
            <span className="text-xs font-semibold text-purple-300">CR</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold">≈ €{myEarningsEur} Cleared</span>
        </div>
      </div>

      {/* Co-Host Distribution Bar */}
      <div className="space-y-2">
        <span className="text-neutral-400 text-xs font-semibold block">Live Co-Host Split Allocation</span>
        <div className="w-full h-3 rounded-full bg-neutral-950 overflow-hidden flex border border-neutral-800">
          {participants.map((p, idx) => {
            const colors = ["bg-purple-500", "bg-cyan-500", "bg-emerald-500", "bg-amber-500"];
            return (
              <div
                key={p.creatorProfileId}
                style={{ width: `${p.splitPercentage * 100}%` }}
                className={`h-full ${colors[idx % colors.length]} transition-all duration-500`}
                title={`${p.displayName}: ${(p.splitPercentage * 100).toFixed(0)}%`}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between text-xs pt-1">
          {participants.map((p) => (
            <div key={p.creatorProfileId} className="flex items-center space-x-1.5 text-neutral-300">
              <span className="font-semibold text-white">{p.displayName}:</span>
              <span className="font-mono text-purple-300">{(p.splitPercentage * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Live Split Tipping Feed */}
      {recentTips.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-neutral-800">
          <span className="text-neutral-400 text-xs font-semibold flex items-center space-x-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Recent Split Tips</span>
          </span>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {recentTips.map((tip) => (
              <div
                key={tip.id}
                className="flex items-center justify-between bg-neutral-950/60 border border-neutral-800/80 px-3 py-1.5 rounded-lg text-xs"
              >
                <div>
                  <span className="text-purple-400 font-semibold">{tip.fanUsername}</span>
                  {tip.message && <span className="text-neutral-400 ml-1.5 italic font-normal">"{tip.message}"</span>}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-neutral-400 font-mono">{tip.grossCredits} CR gross</span>
                  <span className="text-emerald-400 font-bold font-mono">+{tip.myShareCredits} CR</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
