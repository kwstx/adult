"use client";

import React from "react";
import {
  Send,
  MessageSquare,
  Bell,
  CheckCircle2,
  Clock,
  Coins,
  ArrowUpRight,
  Sparkles,
  Gift,
} from "lucide-react";
import { CreatorCampaign } from "@/modules/creator-crm/types";
import { COHORTS_CONFIG } from "./CohortFilterBar";

interface CampaignsListTableProps {
  campaigns: CreatorCampaign[];
  onDispatchCampaign?: (campaignId: string) => void;
  onOpenNewCampaign: () => void;
}

export function CampaignsListTable({
  campaigns,
  onDispatchCampaign,
  onOpenNewCampaign,
}: CampaignsListTableProps) {
  return (
    <div className="space-y-4 rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5 backdrop-blur-2xl shadow-2xl">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
        <div>
          <h3 className="text-sm font-black text-white">Creator Retention & Marketing Campaigns</h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Track delivery, open rates, conversions, and revenue generated from targeted cohort campaigns
          </p>
        </div>
        <button
          onClick={onOpenNewCampaign}
          className="flex items-center gap-1.5 rounded-2xl bg-rose-600 px-4 py-2 text-xs font-black text-white hover:bg-rose-500 shadow-md shadow-rose-600/25 transition-all"
        >
          <Send className="h-3.5 w-3.5" />
          <span>New Campaign</span>
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Send className="h-10 w-10 text-zinc-600 mb-3" />
          <h4 className="text-sm font-bold text-white">No campaigns launched yet</h4>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm">
            Launch a renewal reminder for expiring subscribers or a welcome note for new fans to increase retention!
          </p>
          <button
            onClick={onOpenNewCampaign}
            className="mt-4 rounded-2xl bg-zinc-900 border border-zinc-700 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800"
          >
            Create Your First Campaign
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800/80 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                <th className="pb-3 pl-2">Campaign & Target</th>
                <th className="pb-3">Channel</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Reach & Delivery</th>
                <th className="pb-3">Read Rate</th>
                <th className="pb-3">Conversions</th>
                <th className="pb-3 text-right pr-2">Revenue Generated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {campaigns.map((camp) => {
                const cohortCfg = COHORTS_CONFIG.find((x) => x.cohort === camp.targetCohort);
                const readRate =
                  camp.deliveredCount > 0
                    ? Math.round((camp.readCount / camp.deliveredCount) * 100)
                    : 0;
                const convRate =
                  camp.deliveredCount > 0
                    ? Math.round((camp.convertedCount / camp.deliveredCount) * 100)
                    : 0;

                return (
                  <tr key={camp.id} className="hover:bg-zinc-900/40 transition-colors">
                    {/* Campaign Title & Target */}
                    <td className="py-3.5 pl-2 max-w-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-xs">{camp.title}</span>
                          {camp.perkAttached && (
                            <span className="rounded-md bg-pink-500/20 px-1.5 py-0.2 text-[8px] font-bold text-pink-300 border border-pink-500/30">
                              🎁 Perk
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`rounded-lg px-2 py-0.5 text-[9px] font-bold ${
                              cohortCfg?.badgeBg || "bg-zinc-800 text-zinc-300"
                            }`}
                          >
                            {camp.targetCohortTitle}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {new Date(camp.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Channel */}
                    <td className="py-3.5">
                      <span className="inline-flex items-center gap-1 rounded-xl bg-zinc-900 px-2 py-1 text-[10px] font-bold text-zinc-300 border border-zinc-800">
                        {camp.channel === "DIRECT_MESSAGE" ? (
                          <MessageSquare className="h-3 w-3 text-cyan-400" />
                        ) : (
                          <Bell className="h-3 w-3 text-amber-400" />
                        )}
                        <span>{camp.channel === "DIRECT_MESSAGE" ? "Direct DM" : "Notification"}</span>
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          camp.status === "COMPLETED" || camp.status === "DISPATCHED"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        <span>{camp.status}</span>
                      </span>
                    </td>

                    {/* Reach & Delivery */}
                    <td className="py-3.5">
                      <div>
                        <span className="font-bold text-white">
                          {camp.deliveredCount} / {camp.targetAudienceCount}
                        </span>
                        <p className="text-[10px] text-zinc-400">Fans Delivered</p>
                      </div>
                    </td>

                    {/* Read Rate */}
                    <td className="py-3.5">
                      <div>
                        <span className="font-bold text-white">{readRate}%</span>
                        <p className="text-[10px] text-zinc-400">{camp.readCount} opened</p>
                      </div>
                    </td>

                    {/* Conversions */}
                    <td className="py-3.5">
                      <div>
                        <span className="font-bold text-rose-400">{convRate}%</span>
                        <p className="text-[10px] text-zinc-400">{camp.convertedCount} converted</p>
                      </div>
                    </td>

                    {/* Revenue Generated */}
                    <td className="py-3.5 text-right pr-2">
                      <div>
                        <span className="font-black text-emerald-400 text-sm">
                          +{camp.creditsGenerated.toLocaleString()} cr
                        </span>
                        <p className="text-[10px] text-zinc-400">€{camp.revenueGeneratedEur.toFixed(2)} EUR</p>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
