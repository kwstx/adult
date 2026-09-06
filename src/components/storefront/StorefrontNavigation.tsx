"use client";

import React from "react";
import { Radio, Crown, Lock, Video, Gift } from "lucide-react";
import { StorefrontPillarTab } from "./types";

interface StorefrontNavigationProps {
  activeTab: StorefrontPillarTab;
  onSelectTab: (tab: StorefrontPillarTab) => void;
  isLive: boolean;
  liveViewerCount?: number;
  subscriptionCount?: number;
  contentCount?: number;
  privateSlotsCount?: number;
  experiencesCount?: number;
}

export function StorefrontNavigation({
  activeTab,
  onSelectTab,
  isLive,
  liveViewerCount = 0,
  subscriptionCount = 2,
  contentCount = 0,
  privateSlotsCount = 4,
  experiencesCount = 4,
}: StorefrontNavigationProps) {
  const tabs = [
    {
      id: "live" as StorefrontPillarTab,
      name: "LIVE",
      icon: Radio,
      badge: isLive ? (liveViewerCount > 0 ? `${liveViewerCount}` : "LIVE") : null,
      badgeColor: "bg-rose-600 text-white animate-pulse",
      accentGlow: "from-rose-500/20 to-pink-500/20",
      activeText: "text-rose-400",
      indicator: "bg-rose-500",
    },
    {
      id: "subscription" as StorefrontPillarTab,
      name: "SUBSCRIPTION",
      icon: Crown,
      badge: `${subscriptionCount} Tiers`,
      badgeColor: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
      accentGlow: "from-amber-500/20 to-rose-500/20",
      activeText: "text-amber-400",
      indicator: "bg-amber-500",
    },
    {
      id: "content" as StorefrontPillarTab,
      name: "CONTENT",
      icon: Lock,
      badge: contentCount > 0 ? `${contentCount}` : null,
      badgeColor: "bg-pink-500/20 text-pink-300 border border-pink-500/30",
      accentGlow: "from-pink-500/20 to-purple-500/20",
      activeText: "text-pink-400",
      indicator: "bg-pink-500",
    },
    {
      id: "private" as StorefrontPillarTab,
      name: "PRIVATE",
      icon: Video,
      badge: "1-on-1",
      badgeColor: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
      accentGlow: "from-purple-500/20 to-indigo-500/20",
      activeText: "text-purple-400",
      indicator: "bg-purple-500",
    },
    {
      id: "experiences" as StorefrontPillarTab,
      name: "EXPERIENCES",
      icon: Gift,
      badge: experiencesCount > 0 ? `${experiencesCount}` : null,
      badgeColor: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
      accentGlow: "from-emerald-500/20 to-teal-500/20",
      activeText: "text-emerald-400",
      indicator: "bg-emerald-500",
    },
  ];

  return (
    <div className="sticky top-0 z-30 w-full bg-black/85 backdrop-blur-2xl border-y border-zinc-800/80 shadow-2xl py-3 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`group relative flex items-center gap-2 sm:gap-2.5 rounded-2xl px-3.5 sm:px-5 py-2.5 text-xs font-black uppercase tracking-wider transition-all shrink-0 select-none ${
                  isActive
                    ? `bg-zinc-900 border border-zinc-700/80 ${tab.activeText} shadow-lg shadow-black`
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60"
                }`}
              >
                {/* Active Underline Pill */}
                {isActive && (
                  <span
                    className={`absolute bottom-0 left-3 right-3 h-0.5 rounded-full ${tab.indicator} shadow-[0_0_8px_currentColor]`}
                  />
                )}

                <Icon
                  className={`h-4 w-4 transition-transform group-hover:scale-110 ${
                    isActive ? tab.activeText : "text-zinc-500 group-hover:text-zinc-300"
                  }`}
                />

                <span>{tab.name}</span>

                {/* Badge */}
                {tab.badge && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${tab.badgeColor}`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
