"use client";

import React, { useState, useEffect } from "react";
import {
  CreatorAnalyticsOverviewResult,
  AnalyticsTimeframe,
} from "@/modules/analytics/types";
import { HighValueAttributionCard } from "./HighValueAttributionCard";
import { LiveTelemetryCard } from "./LiveTelemetryCard";
import { RevenueBreakdownCard } from "./RevenueBreakdownCard";
import { TopSupportersTable } from "./TopSupportersTable";
import { FanRetentionCard } from "./FanRetentionCard";
import { ContentPerformanceTable } from "./ContentPerformanceTable";
import { ConversionFunnelCard } from "./ConversionFunnelCard";
import {
  Sparkles,
  RefreshCw,
  Download,
  Calendar,
  Layers,
  DollarSign,
  Users,
  Video,
  Flame,
  Radio,
  BarChart3,
  TrendingUp,
} from "lucide-react";

interface CreatorAnalyticsDashboardProps {
  initialData?: CreatorAnalyticsOverviewResult;
  creatorId?: string;
}

export const CreatorAnalyticsDashboard: React.FC<CreatorAnalyticsDashboardProps> = ({
  initialData,
  creatorId = "creator_maya",
}) => {
  const [analytics, setAnalytics] = useState<CreatorAnalyticsOverviewResult | null>(
    initialData || null
  );
  const [timeframe, setTimeframe] = useState<AnalyticsTimeframe>("LAST_7_DAYS");
  const [activeTab, setActiveTab] = useState<
    "overview" | "attribution" | "revenue" | "supporters" | "telemetry"
  >("overview");
  const [isLoading, setIsLoading] = useState(!initialData);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(true);

  const fetchAnalytics = async (tf: AnalyticsTimeframe) => {
    if (analytics) {
      setIsSyncing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const res = await fetch(`/api/creators/${creatorId}/analytics?timeframe=${tf}`);
      const json = await res.json();
      if (json.success && json.data) {
        setAnalytics(json.data);
      }
    } catch (err) {
      console.error("Failed to load creator analytics:", err);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(timeframe);
  }, [timeframe, creatorId]);

  // Real-time live state synchronization via SSE
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/realtime/${creatorId}/sse`);
      eventSource.onopen = () => setIsLiveConnected(true);
      eventSource.onerror = () => setIsLiveConnected(false);

      eventSource.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          if (event.type === "INTERACTION_PURCHASED" || event.type === "LIVE_TIP") {
            const credits = event.payload?.creditCost || event.payload?.credits || 100;
            setAnalytics((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                revenueStreams: {
                  ...prev.revenueStreams,
                  totalGrossRevenueCredits: prev.revenueStreams.totalGrossRevenueCredits + credits,
                  totalGrossRevenueFiatEur: (prev.revenueStreams.totalGrossRevenueCredits + credits) * 0.08,
                  totalNetCreatorCredits: prev.revenueStreams.totalNetCreatorCredits + Math.round(credits * 0.8),
                },
                conversionAndRepeatFunnel: {
                  ...prev.conversionAndRepeatFunnel,
                  repeatPurchasers: prev.conversionAndRepeatFunnel.repeatPurchasers + 1,
                },
              };
            });
          }
        } catch {
          // SSE format fallback
        }
      };
    } catch {
      setIsLiveConnected(false);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [creatorId]);

  const exportAnalyticsData = () => {
    if (!analytics) return;
    const blob = new Blob([JSON.stringify(analytics, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `creator-analytics-${creatorId}-${timeframe.toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading && !analytics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center">
        <div className="p-4 rounded-3xl bg-purple-500/10 text-purple-400 border border-purple-500/20 animate-pulse">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white">Aggregating Creator Analytics Marts...</h3>
          <p className="text-xs text-zinc-400">Computing telemetry, revenue streams, and attribution matrices</p>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP HEADER & TIMEFRAME SELECTOR                             */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl lg:text-3xl font-black text-white">
              Creator Analytics & Intelligence
            </h1>
            <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {analytics.stageName} (@{analytics.username})
            </span>
            {isLiveConnected ? (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live State Synced
              </span>
            ) : null}
            {isSyncing ? (
              <span className="flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold text-amber-400 animate-pulse">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Updating metrics...
              </span>
            ) : null}
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Authoritative monetization telemetry, fan lifetime value CRM & conversion attribution engine
          </p>
        </div>

        {/* Action Controls: Timeframe, Refresh, Export */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-2xl p-1">
            <button
              onClick={() => setTimeframe("LAST_24_HOURS")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                timeframe === "LAST_24_HOURS"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              24H
            </button>
            <button
              onClick={() => setTimeframe("LAST_7_DAYS")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                timeframe === "LAST_7_DAYS"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              7D
            </button>
            <button
              onClick={() => setTimeframe("LAST_30_DAYS")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                timeframe === "LAST_30_DAYS"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              30D
            </button>
            <button
              onClick={() => setTimeframe("LAST_90_DAYS")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                timeframe === "LAST_90_DAYS"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              90D
            </button>
          </div>

          <button
            onClick={() => fetchAnalytics(timeframe)}
            disabled={isLoading}
            className="p-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
            title="Refresh Telemetry"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={exportAnalyticsData}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-white transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. QUICK EXECUTIVE METRIC TILES                               */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {/* Total Revenue */}
        <div className="p-4 rounded-3xl bg-zinc-950/90 border border-zinc-800/80 space-y-1.5 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 text-[10px] font-bold uppercase tracking-wider">
            <span>Total Gross Revenue</span>
            <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-white font-mono">
            {analytics.revenueStreams.totalGrossRevenueCredits.toLocaleString()} cr
          </div>
          <p className="text-[10px] text-emerald-400 font-mono">
            €{analytics.revenueStreams.totalGrossRevenueFiatEur.toLocaleString()} (Net: {analytics.revenueStreams.totalNetCreatorCredits.toLocaleString()} cr)
          </p>
        </div>

        {/* Live Viewers Concurrency */}
        <div className="p-4 rounded-3xl bg-zinc-950/90 border border-zinc-800/80 space-y-1.5 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 text-[10px] font-bold uppercase tracking-wider">
            <span>Live / Peak Viewers</span>
            <Radio className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
          </div>
          <div className="text-xl font-black text-white font-mono">
            {analytics.liveTelemetry.liveViewersCurrent} <span className="text-xs text-zinc-500">/ {analytics.liveTelemetry.peakViewers}</span>
          </div>
          <p className="text-[10px] text-zinc-400">
            Avg watch: {analytics.liveTelemetry.averageWatchDurationFormatted}
          </p>
        </div>

        {/* Active Subscribers */}
        <div className="p-4 rounded-3xl bg-zinc-950/90 border border-zinc-800/80 space-y-1.5 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 text-[10px] font-bold uppercase tracking-wider">
            <span>Active Subscribers</span>
            <Users className="h-3.5 w-3.5 text-blue-400" />
          </div>
          <div className="text-xl font-black text-white font-mono">
            {analytics.revenueStreams.activeSubscribersCount}
          </div>
          <p className="text-[10px] text-blue-400">
            {analytics.revenueStreams.subscriptionsCredits.toLocaleString()} cr monthly run-rate
          </p>
        </div>

        {/* Repeat Purchaser Velocity */}
        <div className="p-4 rounded-3xl bg-zinc-950/90 border border-zinc-800/80 space-y-1.5 shadow-lg">
          <div className="flex items-center justify-between text-zinc-400 text-[10px] font-bold uppercase tracking-wider">
            <span>Repeat Fan Rate</span>
            <TrendingUp className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <div className="text-xl font-black text-purple-300 font-mono">
            {analytics.conversionAndRepeatFunnel.repeatConversionRatePercent}%
          </div>
          <p className="text-[10px] text-purple-400">
            {analytics.conversionAndRepeatFunnel.repeatPurchasers} repeat supporters
          </p>
        </div>

        {/* North Star #1 Winning Activity */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-purple-950/40 to-zinc-950 border border-purple-500/40 space-y-1.5 shadow-lg col-span-2 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-purple-300 text-[10px] font-bold uppercase tracking-wider">
            <span>#1 Fan Engine</span>
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="text-sm font-black text-white truncate">
            {analytics.highValueFanAttribution.topActivityForRepeatConversion.displayName}
          </div>
          <p className="text-[10px] text-amber-300 font-bold">
            {analytics.highValueFanAttribution.topActivityForRepeatConversion.liftMultiplier}x Conversion Lift
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. SECTION NAVIGATION TABS                                     */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-2 border-b border-zinc-800 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "overview"
              ? "border-purple-500 text-white"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Overview & North Star
        </button>
        <button
          onClick={() => setActiveTab("attribution")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "attribution"
              ? "border-purple-500 text-white"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Activity Attribution Engine
        </button>
        <button
          onClick={() => setActiveTab("revenue")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "revenue"
              ? "border-purple-500 text-white"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Revenue & PPV Performance
        </button>
        <button
          onClick={() => setActiveTab("supporters")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "supporters"
              ? "border-purple-500 text-white"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Supporters CRM & Retention
        </button>
        <button
          onClick={() => setActiveTab("telemetry")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "telemetry"
              ? "border-purple-500 text-white"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Live Telemetry & Funnel
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. TABBED CONTENT PANELS                                      */}
      {/* ------------------------------------------------------------- */}

      {/* TAB: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* THE NORTH STAR SHOWCASE CARD */}
          <HighValueAttributionCard attribution={analytics.highValueFanAttribution} />

          {/* Revenue Breakdown */}
          <RevenueBreakdownCard revenue={analytics.revenueStreams} />

          {/* Live Telemetry Card */}
          <LiveTelemetryCard telemetry={analytics.liveTelemetry} />

          {/* Conversion Funnel */}
          <ConversionFunnelCard funnel={analytics.conversionAndRepeatFunnel} />

          {/* Top Supporters */}
          <TopSupportersTable supporters={analytics.topSupporters} />

          {/* Fan Retention & Distribution */}
          <FanRetentionCard
            retention={analytics.fanRetention}
            relationships={analytics.relationshipDistribution}
          />

          {/* Content Catalog */}
          <ContentPerformanceTable content={analytics.contentPerformance} />
        </div>
      )}

      {/* TAB: ATTRIBUTION ONLY */}
      {activeTab === "attribution" && (
        <div className="space-y-8">
          <HighValueAttributionCard attribution={analytics.highValueFanAttribution} />
          <ConversionFunnelCard funnel={analytics.conversionAndRepeatFunnel} />
        </div>
      )}

      {/* TAB: REVENUE & CONTENT */}
      {activeTab === "revenue" && (
        <div className="space-y-8">
          <RevenueBreakdownCard revenue={analytics.revenueStreams} />
          <ContentPerformanceTable content={analytics.contentPerformance} />
        </div>
      )}

      {/* TAB: SUPPORTERS & CRM */}
      {activeTab === "supporters" && (
        <div className="space-y-8">
          <TopSupportersTable supporters={analytics.topSupporters} />
          <FanRetentionCard
            retention={analytics.fanRetention}
            relationships={analytics.relationshipDistribution}
          />
        </div>
      )}

      {/* TAB: LIVE TELEMETRY */}
      {activeTab === "telemetry" && (
        <div className="space-y-8">
          <LiveTelemetryCard telemetry={analytics.liveTelemetry} />
          <ConversionFunnelCard funnel={analytics.conversionAndRepeatFunnel} />
        </div>
      )}
    </div>
  );
};
