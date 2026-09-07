"use client";

import React from "react";
import { CreatorRevenueStreamMetrics } from "@/modules/analytics/types";
import {
  DollarSign,
  CreditCard,
  Lock,
  Gift,
  Zap,
  Crown,
  MessageSquare,
  TrendingUp,
  Percent,
} from "lucide-react";

interface RevenueBreakdownCardProps {
  revenue: CreatorRevenueStreamMetrics;
}

export const RevenueBreakdownCard: React.FC<RevenueBreakdownCardProps> = ({ revenue }) => {
  const {
    subscriptionsCredits,
    subscriptionsFiatEur,
    ppvRevenueCredits,
    ppvRevenueFiatEur,
    giftRevenueCredits,
    giftRevenueFiatEur,
    interactionRevenueCredits,
    interactionRevenueFiatEur,
    privateSessionRevenueCredits,
    privateSessionRevenueFiatEur,
    paidMessageRevenueCredits,
    paidMessageRevenueFiatEur,
    totalGrossRevenueCredits,
    totalGrossRevenueFiatEur,
    totalNetCreatorCredits,
    totalNetCreatorFiatEur,
    platformRakeCredits,
    activeSubscribersCount,
    payingFansCount,
    averageRevenuePerPayingFanCredits,
  } = revenue;

  const total = Math.max(1, totalGrossRevenueCredits);

  const streams = [
    {
      label: "Private 1-on-1 Sessions",
      credits: privateSessionRevenueCredits,
      fiat: privateSessionRevenueFiatEur,
      icon: <Crown className="h-4 w-4 text-rose-400" />,
      color: "from-rose-500 to-pink-500",
      textColor: "text-rose-400",
      percent: ((privateSessionRevenueCredits / total) * 100).toFixed(1),
    },
    {
      label: "Live Interactions & Toys",
      credits: interactionRevenueCredits,
      fiat: interactionRevenueFiatEur,
      icon: <Zap className="h-4 w-4 text-purple-400" />,
      color: "from-purple-500 to-indigo-500",
      textColor: "text-purple-400",
      percent: ((interactionRevenueCredits / total) * 100).toFixed(1),
    },
    {
      label: "Live Gifts & Tips",
      credits: giftRevenueCredits,
      fiat: giftRevenueFiatEur,
      icon: <Gift className="h-4 w-4 text-amber-400" />,
      color: "from-amber-500 to-yellow-500",
      textColor: "text-amber-400",
      percent: ((giftRevenueCredits / total) * 100).toFixed(1),
    },
    {
      label: "Recurring Subscriptions",
      credits: subscriptionsCredits,
      fiat: subscriptionsFiatEur,
      icon: <CreditCard className="h-4 w-4 text-emerald-400" />,
      color: "from-emerald-500 to-teal-500",
      textColor: "text-emerald-400",
      percent: ((subscriptionsCredits / total) * 100).toFixed(1),
    },
    {
      label: "PPV Media Unlocks",
      credits: ppvRevenueCredits,
      fiat: ppvRevenueFiatEur,
      icon: <Lock className="h-4 w-4 text-blue-400" />,
      color: "from-blue-500 to-cyan-500",
      textColor: "text-blue-400",
      percent: ((ppvRevenueCredits / total) * 100).toFixed(1),
    },
    {
      label: "Paid Direct Messages",
      credits: paidMessageRevenueCredits,
      fiat: paidMessageRevenueFiatEur,
      icon: <MessageSquare className="h-4 w-4 text-pink-400" />,
      color: "from-pink-500 to-rose-400",
      textColor: "text-pink-400",
      percent: ((paidMessageRevenueCredits / total) * 100).toFixed(1),
    },
  ];

  return (
    <div className="rounded-3xl bg-zinc-950/80 border border-zinc-800/80 p-6 lg:p-8 space-y-6 shadow-xl">
      {/* Header & Total Earnings Overview */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-zinc-800/80 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Monetization Engine
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 font-mono">
              Net 80% Payout
            </span>
          </div>
          <h2 className="text-xl lg:text-2xl font-black text-white">
            Revenue Streams & Monetization
          </h2>
          <p className="text-xs text-zinc-400">
            Authoritative ledger earnings across all monetization categories
          </p>
        </div>

        {/* Total Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800">
            <div className="text-[10px] uppercase font-bold text-zinc-400">Total Gross Revenue</div>
            <div className="text-xl font-black text-white font-mono">
              {totalGrossRevenueCredits.toLocaleString()} cr
            </div>
            <div className="text-[10px] text-zinc-400">€{totalGrossRevenueFiatEur.toLocaleString()}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30">
            <div className="text-[10px] uppercase font-bold text-emerald-400">Net Creator Earnings</div>
            <div className="text-xl font-black text-emerald-300 font-mono">
              {totalNetCreatorCredits.toLocaleString()} cr
            </div>
            <div className="text-[10px] text-emerald-400">€{totalNetCreatorFiatEur.toLocaleString()}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 col-span-2 sm:col-span-1">
            <div className="text-[10px] uppercase font-bold text-zinc-400">Avg Revenue / Fan</div>
            <div className="text-xl font-black text-white font-mono">
              {averageRevenuePerPayingFanCredits.toLocaleString()} cr
            </div>
            <div className="text-[10px] text-zinc-400">{payingFansCount} paying fans ({activeSubscribersCount} subs)</div>
          </div>
        </div>
      </div>

      {/* Multi-Stream Stacked Visual Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="font-bold uppercase tracking-wider text-[10px]">Revenue Distribution Breakdown</span>
          <span className="font-mono text-[11px]">{totalGrossRevenueCredits.toLocaleString()} Total Credits</span>
        </div>
        <div className="h-4 rounded-full bg-zinc-900 overflow-hidden flex shadow-inner">
          {streams.map((s, i) => (
            <div
              key={i}
              className={`h-full bg-gradient-to-r ${s.color} transition-all duration-700`}
              style={{ width: `${s.percent}%` }}
              title={`${s.label}: ${s.percent}%`}
            />
          ))}
        </div>
      </div>

      {/* 6 Core Revenue Streams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {streams.map((stream, i) => (
          <div
            key={i}
            className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800">
                  {stream.icon}
                </div>
                <span className="text-xs font-bold text-white">{stream.label}</span>
              </div>
              <span className={`text-xs font-black font-mono ${stream.textColor}`}>
                {stream.percent}%
              </span>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <span className="text-lg font-black text-white font-mono">
                  {stream.credits.toLocaleString()}
                </span>
                <span className="text-xs text-zinc-400 ml-1">credits</span>
              </div>
              <span className="text-xs font-mono text-zinc-400">
                €{stream.fiat.toFixed(2)}
              </span>
            </div>

            {/* Micro Progress Bar */}
            <div className="h-1.5 rounded-full bg-zinc-950 overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${stream.color}`}
                style={{ width: `${stream.percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
