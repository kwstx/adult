"use client";

import React from "react";
import { ConversionAndRepeatFunnel } from "@/modules/analytics/types";
import { Eye, Radio, MessageSquare, ShoppingBag, Repeat, Crown, ArrowDown } from "lucide-react";

interface ConversionFunnelCardProps {
  funnel: ConversionAndRepeatFunnel;
}

export const ConversionFunnelCard: React.FC<ConversionFunnelCardProps> = ({ funnel }) => {
  const {
    totalImpressions,
    totalRoomEntries,
    totalEngagedChatters,
    firstTimePurchasers,
    repeatPurchasers,
    highValueFansCount,
    overallConversionRatePercent,
    repeatConversionRatePercent,
    highValueYieldPercent,
  } = funnel;

  const stages = [
    {
      label: "1. Feed Impressions",
      count: totalImpressions,
      icon: <Eye className="h-4 w-4 text-zinc-400" />,
      subtext: "Discovered in browse & live feed",
      color: "from-zinc-700 to-zinc-800",
      width: "100%",
    },
    {
      label: "2. Live Room Entries",
      count: totalRoomEntries,
      icon: <Radio className="h-4 w-4 text-blue-400" />,
      subtext: `${((totalRoomEntries / totalImpressions) * 100).toFixed(1)}% click-through into stream`,
      color: "from-blue-600 to-indigo-600",
      width: "82%",
    },
    {
      label: "3. Engaged Chatters",
      count: totalEngagedChatters,
      icon: <MessageSquare className="h-4 w-4 text-teal-400" />,
      subtext: `${((totalEngagedChatters / totalRoomEntries) * 100).toFixed(1)}% chat participation`,
      color: "from-teal-600 to-emerald-600",
      width: "64%",
    },
    {
      label: "4. First-Time Purchasers",
      count: firstTimePurchasers,
      icon: <ShoppingBag className="h-4 w-4 text-amber-400" />,
      subtext: `${overallConversionRatePercent}% viewer-to-buyer conversion`,
      color: "from-amber-600 to-orange-600",
      width: "48%",
    },
    {
      label: "5. Repeat Purchasers",
      count: repeatPurchasers,
      icon: <Repeat className="h-4 w-4 text-purple-400" />,
      subtext: `${repeatConversionRatePercent}% repeat purchase velocity (2+ transactions)`,
      color: "from-purple-600 to-pink-600",
      width: "36%",
    },
    {
      label: "6. High-Value Fans (>500 cr LTV)",
      count: highValueFansCount,
      icon: <Crown className="h-4 w-4 text-yellow-400" />,
      subtext: `${highValueYieldPercent}% yield into Superfan / VIP tier`,
      color: "from-yellow-500 to-amber-500",
      width: "24%",
    },
  ];

  return (
    <div className="rounded-3xl bg-zinc-950/80 border border-zinc-800/80 p-6 lg:p-8 space-y-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Viewer-To-Repeat-Fan Conversion Funnel
          </h3>
          <p className="text-[11px] text-zinc-400">
            End-to-end fan lifecycle journey from discovery to high-value supporter status
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-xl bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs font-bold font-mono">
            Repeat Rate: {repeatConversionRatePercent}%
          </div>
        </div>
      </div>

      {/* Funnel Stages */}
      <div className="space-y-3">
        {stages.map((stage, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-bold text-white">
                {stage.icon}
                <span>{stage.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-zinc-400 hidden sm:inline">{stage.subtext}</span>
                <span className="font-mono font-black text-white text-sm">
                  {stage.count.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Funnel Progress Bar */}
            <div className="h-7 rounded-xl bg-zinc-900 overflow-hidden flex items-center px-3 relative">
              <div
                className={`absolute left-0 top-0 bottom-0 bg-gradient-to-r ${stage.color} opacity-80 transition-all duration-1000`}
                style={{ width: stage.width }}
              />
              <span className="relative text-[10px] font-bold text-white uppercase tracking-wider">
                Stage {idx + 1}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
