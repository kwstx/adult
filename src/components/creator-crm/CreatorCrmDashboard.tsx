"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Send,
  Sparkles,
  TrendingUp,
  Award,
  AlertTriangle,
  RefreshCw,
  Clock,
  Flame,
  ShieldCheck,
  Plus,
} from "lucide-react";
import {
  CrmFanSummary,
  CrmFanCohort,
  CrmCohortMetrics,
  CohortMetadata,
  CreatorCampaign,
} from "@/modules/creator-crm/types";
import { CohortFilterBar, COHORTS_CONFIG } from "./CohortFilterBar";
import { AudienceTable } from "./AudienceTable";
import { FanDossierDrawer } from "./FanDossierDrawer";
import { CampaignBuilderModal } from "./CampaignBuilderModal";
import { CampaignsListTable } from "./CampaignsListTable";
import { CrmPrivacyNotice } from "./CrmPrivacyNotice";

export function CreatorCrmDashboard() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"AUDIENCE" | "CAMPAIGNS" | "INTELLIGENCE">("AUDIENCE");

  // Filtering & Query State
  const [selectedCohort, setSelectedCohort] = useState<CrmFanCohort | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState("ALL");
  const [sortBy, setSortBy] = useState("totalCreditsSpent");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Data State
  const [fans, setFans] = useState<CrmFanSummary[]>([]);
  const [totalFans, setTotalFans] = useState(0);
  const [cohortCounts, setCohortCounts] = useState<Record<CrmFanCohort, number>>({
    NEW_FANS: 0,
    RETURNING_FANS: 0,
    VIPS: 0,
    INACTIVE_FANS: 0,
    RECENT_PURCHASERS: 0,
    HIGH_VALUE_SUPPORTERS: 0,
    SUBSCRIBERS: 0,
    EXPIRING_SUBSCRIBERS: 0,
    PEOPLE_WHO_HAVENT_RETURNED: 0,
    RECENT_CONTENT_PURCHASERS: 0,
  });
  const [metrics, setMetrics] = useState<CrmCohortMetrics | null>(null);
  const [cohortMetadata, setCohortMetadata] = useState<CohortMetadata[]>([]);
  const [campaigns, setCampaigns] = useState<CreatorCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selected Fan Dossier State
  const [selectedFanId, setSelectedFanId] = useState<string | null>(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);

  // Campaign Modal State
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [campaignInitialCohort, setCampaignInitialCohort] = useState<CrmFanCohort>("EXPIRING_SUBSCRIBERS");

  // Initial Data Load
  useEffect(() => {
    loadCohortMetrics();
    loadCampaigns();
  }, []);

  // Audience Query Effect
  useEffect(() => {
    loadAudience();
  }, [selectedCohort, searchQuery, selectedTier, sortBy, sortOrder]);

  const loadCohortMetrics = async () => {
    try {
      const res = await fetch("/api/creator/crm/cohorts");
      const data = await res.json();
      if (data.success && data.data) {
        setMetrics(data.data.metrics);
        setCohortMetadata(data.data.cohorts);
      }
    } catch (err) {
      console.error("Failed to load CRM cohort metrics:", err);
    }
  };

  const loadCampaigns = async () => {
    try {
      const res = await fetch("/api/creator/crm/campaigns");
      const data = await res.json();
      if (data.success && data.data) {
        setCampaigns(data.data);
      }
    } catch (err) {
      console.error("Failed to load campaigns:", err);
    }
  };

  const loadAudience = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCohort !== "ALL") params.set("cohort", selectedCohort);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (selectedTier !== "ALL") params.set("relationshipTier", selectedTier);
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);

      const res = await fetch(`/api/creator/crm/fans?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.data) {
        setFans(data.data.fans);
        setTotalFans(data.data.total);
        if (data.data.cohortCounts) {
          setCohortCounts(data.data.cohortCounts);
        }
      }
    } catch (err) {
      console.error("Failed to load audience:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDossier = (fanId: string) => {
    setSelectedFanId(fanId);
    setIsDossierOpen(true);
  };

  const handleSaveFanNotes = async (
    fanId: string,
    customNotes: string,
    customNickname: string,
    tags: string[]
  ) => {
    try {
      const res = await fetch(`/api/creator/crm/fans/${fanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customNotes, customNickname, tags }),
      });
      const data = await res.json();
      if (data.success) {
        // Refresh audience to reflect new tags/notes
        loadAudience();
      }
    } catch (err) {
      console.error("Failed to save fan notes:", err);
    }
  };

  const handleCreateCampaign = async (campaignData: any) => {
    try {
      const res = await fetch("/api/creator/crm/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campaignData),
      });
      const data = await res.json();
      if (data.success) {
        await loadCampaigns();
        setActiveTab("CAMPAIGNS");
      }
    } catch (err) {
      console.error("Failed to create campaign:", err);
    }
  };

  const handleOpenCampaignForCohort = (cohort: CrmFanCohort) => {
    setCampaignInitialCohort(cohort);
    setIsCampaignModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-20 select-none">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP HEADER & KPI HERO                                      */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-white">
              Creator Audience CRM & Intelligence
            </h1>
            <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-rose-400 border border-rose-500/20">
              Private OS
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
            Authoritative audience relationship management, 10-cohort segmentation, private memory notes, and targeted retention campaigns.
          </p>
        </div>

        {/* Action Button & Tab Switcher */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleOpenCampaignForCohort("EXPIRING_SUBSCRIBERS")}
            className="flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2.5 text-xs font-black text-white hover:bg-rose-500 shadow-lg shadow-rose-600/30 transition-all"
          >
            <Send className="h-4 w-4" />
            <span>Launch Campaign</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. KEY AUDIENCE HEALTH & REVENUE KPI METRIC CARDS             */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Tracked Fans */}
        <div className="rounded-3xl border border-zinc-800/80 bg-zinc-950/70 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
              Tracked Fans
            </span>
            <Users className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white mt-1">
            {metrics?.totalTrackedFans || totalFans}
          </p>
          <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">
            {metrics?.newFansCount || 0} joined in last 14d
          </p>
        </div>

        {/* Total Audience LTV */}
        <div className="rounded-3xl border border-zinc-800/80 bg-zinc-950/70 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
              Audience LTV
            </span>
            <TrendingUp className="h-4 w-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-1">
            {metrics ? `${metrics.totalAudienceLtvCredits.toLocaleString()} cr` : "0 cr"}
          </p>
          <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">
            ≈ €{metrics?.totalAudienceLtvFiatEur.toFixed(2) || "0.00"} EUR
          </p>
        </div>

        {/* Active Subscriber MRR */}
        <div className="rounded-3xl border border-zinc-800/80 bg-zinc-950/70 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
              Subscriber MRR
            </span>
            <Award className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-blue-300 mt-1">
            €{metrics?.activeSubscriberMonthlyRunRateEur.toFixed(2) || "0.00"}
          </p>
          <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">
            {metrics?.subscribersCount || 0} active subscribers
          </p>
        </div>

        {/* Expiring Revenue at Risk */}
        <div className="rounded-3xl border border-zinc-800/80 bg-zinc-950/70 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
              Expiring At Risk
            </span>
            <AlertTriangle className="h-4 w-4 text-orange-400" />
          </div>
          <p className="text-2xl font-black text-orange-300 mt-1">
            €{metrics?.expiringRevenueAtRiskEur.toFixed(2) || "0.00"}
          </p>
          <p className="text-[10px] text-orange-400 font-semibold mt-0.5">
            {metrics?.expiringSubscribersCount || 0} expiring in ≤7d
          </p>
        </div>

        {/* Audience Retention Score */}
        <div className="rounded-3xl border border-zinc-800/80 bg-zinc-950/70 p-4 backdrop-blur-xl col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
              Retention Score
            </span>
            <Sparkles className="h-4 w-4 text-rose-400" />
          </div>
          <p className="text-2xl font-black text-rose-300 mt-1">
            {metrics?.audienceRetentionRatePercent || 78.5}%
          </p>
          <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">
            Monthly active fan return rate
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. PRIVACY & ASYMMETRIC COMPLIANCE BANNER                     */}
      {/* ------------------------------------------------------------- */}
      <CrmPrivacyNotice />

      {/* ------------------------------------------------------------- */}
      {/* 4. CRM TAB SWITCHER                                           */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3">
        <button
          onClick={() => setActiveTab("AUDIENCE")}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "AUDIENCE"
              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Audience Roster & Cohorts</span>
        </button>

        <button
          onClick={() => setActiveTab("CAMPAIGNS")}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "CAMPAIGNS"
              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <Send className="h-4 w-4" />
          <span>Creator Campaigns Hub</span>
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300">
            {campaigns.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("INTELLIGENCE")}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "INTELLIGENCE"
              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>10-Cohort Playbooks & Guides</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. TAB 1: AUDIENCE ROSTER & COHORTS                           */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "AUDIENCE" && (
        <div className="space-y-5">
          {/* Cohort Rail */}
          <CohortFilterBar
            selectedCohort={selectedCohort}
            onSelectCohort={setSelectedCohort}
            cohortCounts={cohortCounts}
            totalAudienceCount={totalFans}
          />

          {/* Main Audience Table */}
          <AudienceTable
            fans={fans}
            total={totalFans}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedTier={selectedTier}
            onTierChange={setSelectedTier}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={setSortBy}
            onSelectFan={handleOpenDossier}
            onOpenCampaignForCohort={handleOpenCampaignForCohort}
            activeCohortFilter={selectedCohort}
          />
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. TAB 2: CAMPAIGNS HUB                                       */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "CAMPAIGNS" && (
        <CampaignsListTable
          campaigns={campaigns}
          onOpenNewCampaign={() => handleOpenCampaignForCohort("EXPIRING_SUBSCRIBERS")}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. TAB 3: COHORT PLAYBOOKS & INTELLIGENCE                     */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "INTELLIGENCE" && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6 backdrop-blur-2xl">
            <h3 className="text-sm font-black text-white">
              The 10 Authoritative Audience Cohort Playbooks
            </h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Understand how each cohort is calculated and the highest-converting marketing actions to take.
            </p>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {COHORTS_CONFIG.map((cfg) => {
                const count = cohortCounts[cfg.cohort] || 0;
                const Icon = cfg.icon;

                return (
                  <div
                    key={cfg.cohort}
                    className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 space-y-3 hover:border-zinc-700 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${cfg.badgeBg}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-white">{cfg.title}</h4>
                          <span className="text-[10px] text-zinc-400">{cfg.shortTitle}</span>
                        </div>
                      </div>
                      <span className="text-sm font-black text-white">{count} fans</span>
                    </div>

                    <div className="rounded-xl bg-zinc-950/60 p-2.5 text-[11px] space-y-1">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        Recommended Action:
                      </span>
                      <p className="text-rose-300 font-semibold">
                        {COHORTS_CONFIG.find((x) => x.cohort === cfg.cohort)?.title} campaign: send personalized perks to boost lifetime retention.
                      </p>
                    </div>

                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => {
                          setSelectedCohort(cfg.cohort);
                          setActiveTab("AUDIENCE");
                        }}
                        className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        View {count} Fans in Table →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 8. DRAWERS & MODALS                                           */}
      {/* ------------------------------------------------------------- */}
      <FanDossierDrawer
        isOpen={isDossierOpen}
        onClose={() => {
          setIsDossierOpen(false);
          setSelectedFanId(null);
        }}
        fanId={selectedFanId}
        onSaveNotes={handleSaveFanNotes}
      />

      <CampaignBuilderModal
        isOpen={isCampaignModalOpen}
        onClose={() => setIsCampaignModalOpen(false)}
        initialCohort={campaignInitialCohort}
        cohortCounts={cohortCounts}
        onCreateCampaign={handleCreateCampaign}
      />
    </div>
  );
}
