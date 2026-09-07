"use client";

import React from "react";
import { TopSupporterProfile } from "@/modules/analytics/types";
import { Crown, Sparkles, Award, ShieldCheck, Repeat, Clock, Zap } from "lucide-react";

interface TopSupportersTableProps {
  supporters: TopSupporterProfile[];
}

export const TopSupportersTable: React.FC<TopSupportersTableProps> = ({ supporters }) => {
  const getTierBadge = (tier: string) => {
    switch (tier) {
      case "ROYAL_PATRON":
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
            <Crown className="h-3 w-3 text-amber-400" /> Royal Patron
          </span>
        );
      case "SOULMATE":
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-purple-400" /> Soulmate
          </span>
        );
      case "VIP_DEVOTEE":
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1">
            <Award className="h-3 w-3 text-blue-400" /> VIP Devotee
          </span>
        );
      case "SUPERFAN":
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-pink-500/20 text-pink-300 border border-pink-500/40 flex items-center gap-1">
            <Zap className="h-3 w-3 text-pink-400" /> Superfan
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-300">
            Supporter
          </span>
        );
    }
  };

  return (
    <div className="rounded-3xl bg-zinc-950/80 border border-zinc-800/80 p-6 lg:p-8 space-y-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white">Top Supporters & Relationship CRM</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-zinc-900 border border-zinc-800 text-zinc-400">
              {supporters.length} Top Fans
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Leaderboard of highest LTV fans, their relationship levels, and the activity that converted them
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800/80 overflow-hidden bg-zinc-950">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-900/80 text-zinc-400 font-bold border-b border-zinc-800 text-[10px] uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3.5">Rank & Fan</th>
              <th className="px-4 py-3.5">Relationship Tier</th>
              <th className="px-4 py-3.5">Total Spend (LTV)</th>
              <th className="px-4 py-3.5">Transactions</th>
              <th className="px-4 py-3.5">First Conversion Touchpoint</th>
              <th className="px-4 py-3.5 text-right">Loyalty Days</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900 text-zinc-300">
            {supporters.map((fan, idx) => (
              <tr key={fan.userId} className="hover:bg-zinc-900/40 transition-colors">
                {/* Rank & Fan */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className={`font-mono font-black text-xs w-5 text-center ${
                      idx === 0 ? "text-amber-400 font-black text-sm" : idx === 1 ? "text-zinc-300" : idx === 2 ? "text-amber-600" : "text-zinc-400"
                    }`}>
                      #{idx + 1}
                    </span>
                    <img
                      src={fan.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"}
                      alt={fan.username}
                      className="h-8 w-8 rounded-xl object-cover ring-1 ring-zinc-800 shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">{fan.displayName}</span>
                        {fan.isSubscriber && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            SUB
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-400 font-mono">@{fan.username}</span>
                    </div>
                  </div>
                </td>

                {/* Relationship Tier */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    {getTierBadge(fan.relationshipTier)}
                    <span className="text-[10px] font-mono text-zinc-400">Lvl {fan.relationshipLevel}</span>
                  </div>
                </td>

                {/* Total Spend */}
                <td className="px-4 py-3.5 font-mono font-black text-white">
                  <div className="text-sm text-emerald-400">{fan.totalSpentCredits.toLocaleString()} cr</div>
                  <div className="text-[10px] text-zinc-400">€{(fan.totalSpentCredits / 100).toFixed(2)}</div>
                </td>

                {/* Transactions */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1 text-white font-mono">
                    <span>{fan.totalTransactionsCount}</span>
                    <span className="text-[10px] text-zinc-400">purchases</span>
                  </div>
                  {fan.isRepeatPurchaser && (
                    <span className="text-[9px] text-purple-400 flex items-center gap-1">
                      <Repeat className="h-2.5 w-2.5" /> Repeat Fan
                    </span>
                  )}
                </td>

                {/* First Touchpoint (Attribution Insight) */}
                <td className="px-4 py-3.5">
                  <div className="text-[11px] font-medium text-zinc-300 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-400 shrink-0" />
                    <span>{fan.firstConversionActivity}</span>
                  </div>
                </td>

                {/* Loyalty */}
                <td className="px-4 py-3.5 text-right font-mono text-zinc-400">
                  <div className="text-xs text-white">{fan.daysActive} days</div>
                  <div className="text-[10px]">Active recently</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
