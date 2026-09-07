"use client";

import React from "react";
import {
  HighValueFanAttributionResult,
  ActivityAttributionMetric,
} from "@/modules/analytics/types";
import {
  Sparkles,
  TrendingUp,
  Zap,
  Award,
  ArrowUpRight,
  Lightbulb,
  Radio,
  Lock,
  MessageSquare,
  HelpCircle,
  Flame,
  CheckCircle2,
} from "lucide-react";

interface HighValueAttributionCardProps {
  attribution: HighValueFanAttributionResult;
}

export const HighValueAttributionCard: React.FC<HighValueAttributionCardProps> = ({
  attribution,
}) => {
  const {
    headlineInsight,
    highValueDefinition,
    totalHighValueFansIdentified,
    baselineConversionRatePercent,
    activitiesAttribution,
    topActivityForRepeatConversion,
    marketplaceRecommendations,
  } = attribution;

  const getActivityIcon = (category: string, activityType: string) => {
    if (activityType.includes("TOY")) return <Zap className="h-4 w-4 text-purple-400" />;
    if (activityType.includes("SOUND")) return <Radio className="h-4 w-4 text-emerald-400" />;
    if (activityType.includes("GOAL")) return <Flame className="h-4 w-4 text-amber-400" />;
    if (activityType.includes("PRIVATE")) return <Crown className="h-4 w-4 text-rose-400" />;
    if (activityType.includes("PPV")) return <Lock className="h-4 w-4 text-blue-400" />;
    if (activityType.includes("MESSAGE")) return <MessageSquare className="h-4 w-4 text-pink-400" />;
    return <Sparkles className="h-4 w-4 text-yellow-400" />;
  };

  return (
    <div className="rounded-3xl bg-gradient-to-br from-zinc-950 via-zinc-900/90 to-zinc-950 border border-purple-500/30 shadow-2xl p-6 lg:p-8 space-y-6 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 animate-spin" />
              North Star Marketplace Metric
            </span>
            <span className="text-xs text-zinc-400 font-mono">Attribution Engine</span>
          </div>
          <h2 className="text-xl lg:text-2xl font-black text-white flex items-center gap-2">
            Which Activities Turn Viewers Into Repeat High-Value Fans?
          </h2>
          <p className="text-xs text-zinc-400 max-w-3xl">
            {headlineInsight}
          </p>
        </div>

        {/* High-Value Fan Stats Badge */}
        <div className="flex items-center gap-3 bg-zinc-950/80 border border-purple-500/20 rounded-2xl p-3.5 shrink-0">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-zinc-400">High-Value Fans Identified</div>
            <div className="text-xl font-black text-white">{totalHighValueFansIdentified.toLocaleString()} Fans</div>
            <div className="text-[10px] text-zinc-400">Baseline conversion: {baselineConversionRatePercent}%</div>
          </div>
        </div>
      </div>

      {/* Definition Note */}
      <div className="flex items-center gap-2 text-[11px] text-zinc-400 bg-zinc-900/60 px-4 py-2 rounded-xl border border-zinc-800">
        <HelpCircle className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
        <span><strong className="text-zinc-200">High-Value Fan Criterion:</strong> {highValueDefinition}</span>
      </div>

      {/* Attribution Performance Matrix */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
            First-Touch Activity Conversion Matrix
          </h3>
          <span className="text-[11px] text-zinc-400 font-mono">Ranked by Conversion Lift Multiplier</span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {activitiesAttribution.map((item, idx) => {
            const isWinner = idx === 0;
            return (
              <div
                key={item.activityType}
                className={`p-4 rounded-2xl transition-all border ${
                  isWinner
                    ? "bg-purple-950/30 border-purple-500/50 shadow-lg shadow-purple-950/50 ring-1 ring-purple-500/30"
                    : "bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Activity Name & Category */}
                  <div className="flex items-start gap-3 min-w-[280px]">
                    <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 shrink-0 mt-0.5">
                      {getActivityIcon(item.category, item.activityType)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{item.displayName}</span>
                        {isWinner && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-500 text-black uppercase tracking-wider">
                            #1 Fan Engine
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">{item.marketplaceInsight}</p>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-6 shrink-0 text-left sm:text-right">
                    {/* First Touch Fans */}
                    <div>
                      <div className="text-[10px] font-bold text-zinc-400 uppercase">First Touch</div>
                      <div className="text-sm font-black text-white">{item.firstTouchFansCount.toLocaleString()}</div>
                      <div className="text-[10px] text-zinc-400">{item.convertedToRepeatHighValueCount} converted</div>
                    </div>

                    {/* Conversion Rate */}
                    <div>
                      <div className="text-[10px] font-bold text-zinc-400 uppercase">Conversion Rate</div>
                      <div className={`text-sm font-black ${isWinner ? "text-purple-300" : "text-emerald-400"}`}>
                        {item.conversionToHighValueRatePercent}%
                      </div>
                      <div className="text-[10px] text-zinc-400">to repeat high-value</div>
                    </div>

                    {/* Lift Factor */}
                    <div>
                      <div className="text-[10px] font-bold text-zinc-400 uppercase">Lift Multiplier</div>
                      <div className="text-sm font-black text-amber-400 flex items-center sm:justify-end gap-1">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        {item.liftMultiplier}x
                      </div>
                      <div className="text-[10px] text-zinc-400">vs baseline</div>
                    </div>

                    {/* Average Fan LTV */}
                    <div>
                      <div className="text-[10px] font-bold text-zinc-400 uppercase">Average Fan LTV</div>
                      <div className="text-sm font-black text-white font-mono">{item.averageFanLtvCredits.toLocaleString()} cr</div>
                      <div className="text-[10px] text-zinc-400">{item.repeatPurchaseFrequencyAvg}x repeat freq</div>
                    </div>
                  </div>
                </div>

                {/* Conversion Progress Bar */}
                <div className="mt-3 pt-3 border-t border-zinc-900 flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-zinc-900 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        isWinner
                          ? "bg-gradient-to-r from-purple-500 to-pink-500"
                          : "bg-gradient-to-r from-emerald-500 to-teal-400"
                      }`}
                      style={{ width: `${Math.min(100, item.conversionToHighValueRatePercent * 1.6)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                    Velocity: 2nd purchase in avg {item.averageDaysToSecondPurchase} days
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Algorithmic Marketplace Optimization Recommendations */}
      <div className="p-5 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-3">
        <div className="flex items-center gap-2 text-purple-300">
          <Lightbulb className="h-4 w-4" />
          <h4 className="text-xs font-bold uppercase tracking-wider">
            Actionable Marketplace Recommendations
          </h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {marketplaceRecommendations.map((rec, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 text-xs text-zinc-300 bg-zinc-950/60 p-3 rounded-xl border border-purple-500/10"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-purple-400 shrink-0 mt-0.5" />
              <span>{rec}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

function Crown(props: any) {
  return <Award {...props} />;
}
