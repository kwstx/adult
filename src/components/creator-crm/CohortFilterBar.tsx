"use client";

import React from "react";
import {
  Sparkles,
  Flame,
  Crown,
  Clock,
  Coins,
  Award,
  AlertTriangle,
  UserX,
  Film,
  Users,
} from "lucide-react";
import { CrmFanCohort, CohortMetadata } from "@/modules/creator-crm/types";

interface CohortFilterBarProps {
  selectedCohort: CrmFanCohort | "ALL";
  onSelectCohort: (cohort: CrmFanCohort | "ALL") => void;
  cohortCounts: Record<CrmFanCohort, number>;
  totalAudienceCount: number;
}

const COHORT_ICONS: Record<string, React.ElementType> = {
  Sparkles,
  Flame,
  Crown,
  Clock,
  Coins,
  Diamond: Crown,
  Award,
  AlertTriangle,
  UserX,
  Film,
};

export const COHORTS_CONFIG: Array<{
  cohort: CrmFanCohort;
  title: string;
  shortTitle: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  badgeBg: string;
}> = [
  {
    cohort: "NEW_FANS",
    title: "New Fans",
    shortTitle: "New (<14d)",
    icon: Sparkles,
    color: "text-emerald-400",
    bg: "hover:bg-emerald-500/10",
    border: "border-emerald-500/30",
    badgeBg: "bg-emerald-500/20 text-emerald-300",
  },
  {
    cohort: "RETURNING_FANS",
    title: "Returning Fans",
    shortTitle: "Returning (Streak ≥3d)",
    icon: Flame,
    color: "text-amber-400",
    bg: "hover:bg-amber-500/10",
    border: "border-amber-500/30",
    badgeBg: "bg-amber-500/20 text-amber-300",
  },
  {
    cohort: "VIPS",
    title: "VIPs & Devotees",
    shortTitle: "VIPs (Devotee+)",
    icon: Crown,
    color: "text-rose-400",
    bg: "hover:bg-rose-500/10",
    border: "border-rose-500/30",
    badgeBg: "bg-rose-500/20 text-rose-300",
  },
  {
    cohort: "INACTIVE_FANS",
    title: "Inactive Fans",
    shortTitle: "Inactive (30–60d)",
    icon: Clock,
    color: "text-zinc-400",
    bg: "hover:bg-zinc-800/60",
    border: "border-zinc-700/40",
    badgeBg: "bg-zinc-800 text-zinc-300",
  },
  {
    cohort: "RECENT_PURCHASERS",
    title: "Recent Purchasers",
    shortTitle: "Recent Buyers (<14d)",
    icon: Coins,
    color: "text-cyan-400",
    bg: "hover:bg-cyan-500/10",
    border: "border-cyan-500/30",
    badgeBg: "bg-cyan-500/20 text-cyan-300",
  },
  {
    cohort: "HIGH_VALUE_SUPPORTERS",
    title: "High-Value Supporters",
    shortTitle: "High-Value (≥1k cr)",
    icon: Crown,
    color: "text-purple-400",
    bg: "hover:bg-purple-500/10",
    border: "border-purple-500/30",
    badgeBg: "bg-purple-500/20 text-purple-300",
  },
  {
    cohort: "SUBSCRIBERS",
    title: "Subscribers",
    shortTitle: "Active Subs",
    icon: Award,
    color: "text-blue-400",
    bg: "hover:bg-blue-500/10",
    border: "border-blue-500/30",
    badgeBg: "bg-blue-500/20 text-blue-300",
  },
  {
    cohort: "EXPIRING_SUBSCRIBERS",
    title: "Expiring Subscribers",
    shortTitle: "Expiring Subs (≤7d)",
    icon: AlertTriangle,
    color: "text-orange-400",
    bg: "hover:bg-orange-500/10",
    border: "border-orange-500/30",
    badgeBg: "bg-orange-500/20 text-orange-300",
  },
  {
    cohort: "PEOPLE_WHO_HAVENT_RETURNED",
    title: "People Who Haven't Returned",
    shortTitle: "Lapsed (>60d)",
    icon: UserX,
    color: "text-red-400",
    bg: "hover:bg-red-500/10",
    border: "border-red-500/30",
    badgeBg: "bg-red-500/20 text-red-300",
  },
  {
    cohort: "RECENT_CONTENT_PURCHASERS",
    title: "Recent Content Buyers",
    shortTitle: "PPV Buyers (<30d)",
    icon: Film,
    color: "text-pink-400",
    bg: "hover:bg-pink-500/10",
    border: "border-pink-500/30",
    badgeBg: "bg-pink-500/20 text-pink-300",
  },
];

export function CohortFilterBar({
  selectedCohort,
  onSelectCohort,
  cohortCounts,
  totalAudienceCount,
}: CohortFilterBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">
          Audience Cohorts & Segmentation
        </h3>
        <span className="text-[11px] font-semibold text-zinc-500">
          Showing: <span className="text-white font-bold">{selectedCohort === "ALL" ? "All Tracked Fans" : selectedCohort.replace(/_/g, " ")}</span>
        </span>
      </div>

      {/* Horizontal Scrollable Cohort Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none select-none">
        {/* All Fans Pill */}
        <button
          onClick={() => onSelectCohort("ALL")}
          className={`flex shrink-0 items-center gap-2 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition-all border ${
            selectedCohort === "ALL"
              ? "bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/25 ring-2 ring-rose-500/30"
              : "bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-white"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>All Fans</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
              selectedCohort === "ALL" ? "bg-white/20 text-white" : "bg-zinc-800 text-zinc-300"
            }`}
          >
            {totalAudienceCount}
          </span>
        </button>

        {/* 10 Cohorts Pills */}
        {COHORTS_CONFIG.map((item) => {
          const Icon = item.icon;
          const isSelected = selectedCohort === item.cohort;
          const count = cohortCounts[item.cohort] || 0;

          return (
            <button
              key={item.cohort}
              onClick={() => onSelectCohort(item.cohort)}
              className={`flex shrink-0 items-center gap-2 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition-all border ${
                isSelected
                  ? "bg-zinc-900 text-white border-rose-500 shadow-lg shadow-rose-500/20 ring-2 ring-rose-500/40"
                  : `bg-zinc-900/70 text-zinc-400 border-zinc-800/80 ${item.bg} hover:border-zinc-700 hover:text-zinc-200`
              }`}
              title={item.title}
            >
              <Icon className={`h-4 w-4 ${isSelected ? "text-rose-400" : item.color}`} />
              <span>{item.shortTitle}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                  isSelected ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : item.badgeBg
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
