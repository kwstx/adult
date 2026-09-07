"use client";

import React, { useState } from "react";
import {
  Search,
  Filter,
  ArrowUpDown,
  MessageSquare,
  Eye,
  Crown,
  Flame,
  Clock,
  Sparkles,
  Coins,
  Award,
  ChevronRight,
  Tag,
  AlertCircle,
} from "lucide-react";
import { CrmFanSummary, CrmFanCohort } from "@/modules/creator-crm/types";
import { FanStatusBadge } from "@/components/live-room/FanStatusBadge";
import { COHORTS_CONFIG } from "./CohortFilterBar";

interface AudienceTableProps {
  fans: CrmFanSummary[];
  total: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedTier: string;
  onTierChange: (tier: string) => void;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSortChange: (sortBy: string) => void;
  onSelectFan: (fanId: string) => void;
  onOpenCampaignForCohort?: (cohort: CrmFanCohort) => void;
  activeCohortFilter: CrmFanCohort | "ALL";
}

export function AudienceTable({
  fans,
  total,
  searchQuery,
  onSearchChange,
  selectedTier,
  onTierChange,
  sortBy,
  sortOrder,
  onSortChange,
  onSelectFan,
  onOpenCampaignForCohort,
  activeCohortFilter,
}: AudienceTableProps) {
  return (
    <div className="space-y-4 rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5 backdrop-blur-2xl shadow-2xl">
      {/* Table Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search fans by username, display name, notes, or tags..."
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/90 pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-all"
          />
        </div>

        {/* Tier & Sort Filters */}
        <div className="flex items-center gap-2.5">
          {/* Relationship Tier Selector */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-zinc-800 bg-zinc-900/80 px-3 py-2">
            <Filter className="h-3.5 w-3.5 text-zinc-400" />
            <select
              value={selectedTier}
              onChange={(e) => onTierChange(e.target.value)}
              aria-label="Filter by relationship tier"
              className="bg-transparent text-xs font-semibold text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-zinc-900">All Tiers</option>
              <option value="ELITE" className="bg-zinc-900">✨ Sovereign (Elite)</option>
              <option value="INNER_CIRCLE" className="bg-zinc-900">👑 Inner Circle</option>
              <option value="VIP" className="bg-zinc-900">💎 VIP Devotee</option>
              <option value="SUPPORTER" className="bg-zinc-900">🔥 Supporter</option>
              <option value="REGULAR" className="bg-zinc-900">🌿 Regular</option>
              <option value="NEW_FAN" className="bg-zinc-900">🌱 Member (New)</option>
            </select>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-zinc-800 bg-zinc-900/80 px-3 py-2">
            <ArrowUpDown className="h-3.5 w-3.5 text-zinc-400" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              aria-label="Sort audience table"
              className="bg-transparent text-xs font-semibold text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="totalCreditsSpent" className="bg-zinc-900">Highest Spend (LTV)</option>
              <option value="totalXp" className="bg-zinc-900">Highest XP (Level)</option>
              <option value="lastInteractedAt" className="bg-zinc-900">Most Recently Active</option>
              <option value="currentStreakDays" className="bg-zinc-900">Longest Streak</option>
              <option value="totalMinutesWatched" className="bg-zinc-900">Most Watch Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audience List Table */}
      {fans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="h-10 w-10 text-zinc-600 mb-3" />
          <h4 className="text-sm font-bold text-white">No fans found matching criteria</h4>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm">
            Try adjusting your search query, switching cohort filters, or clearing the tier filter.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800/80 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                <th className="pb-3 pl-2">Fan Supporter</th>
                <th className="pb-3">Relationship Tier</th>
                <th className="pb-3">Cohorts & Tags</th>
                <th className="pb-3">Lifetime Spend</th>
                <th className="pb-3">Streak & Watch</th>
                <th className="pb-3">Subscription</th>
                <th className="pb-3">Last Active</th>
                <th className="pb-3 text-right pr-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {fans.map((fan) => (
                <tr
                  key={fan.fanId}
                  onClick={() => onSelectFan(fan.fanId)}
                  className="group hover:bg-zinc-900/50 transition-colors cursor-pointer"
                >
                  {/* Fan Identity */}
                  <td className="py-3.5 pl-2">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={fan.avatarUrl}
                          alt=""
                          className="h-10 w-10 rounded-2xl object-cover ring-1 ring-zinc-700 group-hover:ring-rose-500/50 transition-all"
                        />
                        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-950 text-[8px] font-black text-amber-400 border border-amber-500/40">
                          {fan.fanLevel}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white group-hover:text-rose-300 transition-colors">
                            {fan.displayName}
                          </span>
                          {fan.customNickname && (
                            <span className="rounded-md bg-zinc-800 px-1.5 py-0.2 text-[9px] font-semibold text-rose-300">
                              "{fan.customNickname}"
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400">@{fan.username}</p>
                      </div>
                    </div>
                  </td>

                  {/* Relationship Tier Badge */}
                  <td className="py-3.5">
                    <FanStatusBadge
                      tier={fan.relationshipTier}
                      variant="pill"
                      level={fan.fanLevel}
                    />
                  </td>

                  {/* Cohorts & Tags */}
                  <td className="py-3.5">
                    <div className="flex flex-wrap items-center gap-1 max-w-[200px]">
                      {fan.cohorts.slice(0, 2).map((c) => {
                        const cfg = COHORTS_CONFIG.find((x) => x.cohort === c);
                        return (
                          <span
                            key={c}
                            className={`rounded-lg px-2 py-0.5 text-[9px] font-bold ${
                              cfg?.badgeBg || "bg-zinc-800 text-zinc-300"
                            }`}
                          >
                            {cfg?.shortTitle || c}
                          </span>
                        );
                      })}
                      {fan.tags.length > 0 && (
                        <span className="rounded-lg bg-zinc-800/80 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-400">
                          +{fan.tags.length} tags
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Lifetime Spend */}
                  <td className="py-3.5">
                    <div>
                      <span className="font-black text-white">
                        {fan.totalCreditsSpent.toLocaleString()} cr
                      </span>
                      <p className="text-[10px] text-emerald-400 font-semibold">
                        €{fan.fiatEstimatedEur.toFixed(2)}
                      </p>
                    </div>
                  </td>

                  {/* Streak & Watch */}
                  <td className="py-3.5">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
                        <Flame className="h-3 w-3" />
                        <span>{fan.currentStreakDays}d streak</span>
                      </div>
                      <p className="text-[10px] text-zinc-400">
                        {Math.floor(fan.totalMinutesWatched / 60)}h {fan.totalMinutesWatched % 60}m watched
                      </p>
                    </div>
                  </td>

                  {/* Subscription */}
                  <td className="py-3.5">
                    {fan.isSubscribed ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2.5 py-0.5 text-[10px] font-bold text-blue-300 border border-blue-500/30">
                        <Award className="h-3 w-3" />
                        <span>Subscribed</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-500 font-semibold">Free Member</span>
                    )}
                  </td>

                  {/* Last Active */}
                  <td className="py-3.5">
                    <span className="text-[11px] text-zinc-300">
                      {fan.daysSinceLastInteraction === 0
                        ? "Today"
                        : fan.daysSinceLastInteraction === 1
                        ? "Yesterday"
                        : `${fan.daysSinceLastInteraction}d ago`}
                    </span>
                  </td>

                  {/* Action Button */}
                  <td className="py-3.5 text-right pr-2">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectFan(fan.fanId);
                        }}
                        className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-2 text-zinc-400 hover:border-rose-500/40 hover:text-white hover:bg-rose-500/10 transition-all"
                        title="View Complete Fan Dossier"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-rose-400 transition-colors" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      <div className="flex items-center justify-between border-t border-zinc-800/80 pt-4 text-xs text-zinc-400">
        <span>
          Showing <span className="font-bold text-white">{fans.length}</span> of{" "}
          <span className="font-bold text-white">{total}</span> fans in cohort
        </span>
        <span className="text-[11px] text-zinc-500">
          Click any row to open the 360° Fan Dossier & Private Notes
        </span>
      </div>
    </div>
  );
}
