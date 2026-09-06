"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Radio,
  Users,
  Star,
  Clock,
  Heart,
  Bell,
  Sparkles,
  Share2,
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  Lock,
  Crown,
  Zap,
} from "lucide-react";
import { CreatorIdentity, LivePillarData, SubscriptionPillarData, FanStorefrontState } from "./types";

interface CreatorStorefrontHeaderProps {
  creator: CreatorIdentity;
  live: LivePillarData;
  subscription: SubscriptionPillarData;
  fanState: FanStorefrontState;
  onSelectTab: (tab: "live" | "subscription" | "content" | "private" | "experiences") => void;
  onOpenSubscribeCheckout: () => void;
  onToggleFollow: () => void;
  isFollowLoading?: boolean;
}

export function CreatorStorefrontHeader({
  creator,
  live,
  subscription,
  fanState,
  onSelectTab,
  onOpenSubscribeCheckout,
  onToggleFollow,
  isFollowLoading = false,
}: CreatorStorefrontHeaderProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [showNotifyMenu, setShowNotifyMenu] = useState(false);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const lowestTierPrice = subscription.tiers[0]?.priceFiatFormatted || "€9.99";

  return (
    <div className="relative w-full">
      {/* 1. Majestic Hero Banner */}
      <div className="relative h-64 sm:h-80 md:h-96 w-full overflow-hidden bg-zinc-950">
        <img
          src={creator.bannerUrl}
          alt={creator.displayName}
          className="h-full w-full object-cover object-center brightness-75 scale-105 transition-transform duration-700 hover:scale-100"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/30" />

        {/* Top Control Bar */}
        <div className="absolute top-4 left-4 right-4 sm:top-6 sm:left-6 sm:right-6 flex items-center justify-between z-20">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-2xl bg-black/60 backdrop-blur-xl px-4 py-2 text-xs font-bold text-zinc-200 border border-white/10 hover:bg-black/80 hover:text-white transition-all shadow-lg"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Feed</span>
          </Link>

          <div className="flex items-center gap-3">
            {/* 2257 Verified Badge */}
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 backdrop-blur-xl px-3.5 py-1.5 text-xs font-bold text-emerald-300 border border-emerald-500/40 shadow-lg">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>2257 Approved & Verified</span>
            </span>

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="flex items-center justify-center h-9 w-9 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 text-zinc-300 hover:text-white hover:bg-black/80 transition-all shadow-lg"
              title="Share storefront"
            >
              <Share2 className="h-4 w-4" />
            </button>
            {copiedLink && (
              <span className="absolute right-14 top-2 text-[11px] font-bold text-pink-400 bg-zinc-900/90 px-3 py-1 rounded-xl border border-pink-500/30 animate-fade-in shadow-xl">
                Link copied!
              </span>
            )}
          </div>
        </div>

        {/* Floating LIVE Alert Banner (Overlay on Banner) */}
        {live.isLive && (
          <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-20">
            <Link
              href={`/live/${creator.id}`}
              className="group flex items-center gap-3 rounded-2xl bg-rose-950/80 hover:bg-rose-900/90 backdrop-blur-xl border border-rose-500/40 px-4 py-2.5 shadow-2xl shadow-rose-950/60 transition-all hover:scale-105"
            >
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black tracking-wider text-rose-300 uppercase">
                    Broadcasting Live
                  </span>
                  <span className="rounded-full bg-rose-500/20 px-2 py-0.2 text-[10px] font-bold text-rose-200">
                    {live.viewerCount.toLocaleString()} watching
                  </span>
                </div>
                <p className="text-[11px] text-zinc-300 line-clamp-1 max-w-[200px] sm:max-w-[280px]">
                  {live.streamTitle}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        )}
      </div>

      {/* 2. Creator Identity & Primary CTAs Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-16 sm:-mt-20 relative z-20">
        <div className="rounded-3xl bg-zinc-950/95 backdrop-blur-2xl border border-zinc-800/90 p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Left: Avatar + Identity */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              {/* Avatar with Live Beacon Halo */}
              <div className="relative group shrink-0">
                <div
                  className={`relative h-28 w-28 sm:h-32 sm:w-32 rounded-3xl overflow-hidden shadow-2xl transition-all ${
                    live.isLive
                      ? "ring-4 ring-rose-500 shadow-rose-500/30"
                      : "ring-4 ring-pink-500/40"
                  }`}
                >
                  <img
                    src={creator.avatarUrl}
                    alt={creator.displayName}
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* Status Indicator Badge */}
                {live.isLive ? (
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-rose-600 to-pink-600 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-lg ring-2 ring-zinc-950 animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    LIVE NOW
                  </span>
                ) : (
                  <span className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-zinc-950" />
                )}
              </div>

              {/* Identity Details */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mb-1">
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {creator.displayName}
                  </h1>
                  <span className="flex items-center gap-1 rounded-full bg-pink-500/10 border border-pink-500/30 px-2.5 py-0.5 text-xs font-bold text-pink-400">
                    <Crown className="h-3 w-3 text-pink-400" />
                    {creator.category}
                  </span>
                </div>

                <p className="text-xs sm:text-sm font-semibold text-pink-400/90 mb-3">
                  @{creator.username}
                </p>

                {/* Bio */}
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-2xl line-clamp-2 sm:line-clamp-3">
                  {creator.bio}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mt-3">
                  {creator.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-xl bg-zinc-900/90 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-400 border border-zinc-800"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: The 4 Critical Action Buttons (LIVE NOW, Follow, Subscribe, Message) */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-zinc-800/80">
              {/* 1. LIVE NOW Quick Watch Button (if live) */}
              {live.isLive && (
                <button
                  onClick={() => onSelectTab("live")}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 px-6 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-xl shadow-rose-600/30 hover:brightness-110 active:scale-95 transition-all"
                >
                  <Radio className="h-4 w-4 animate-pulse" />
                  <span>Watch Live Stream ({live.viewerCount})</span>
                </button>
              )}

              <div className="flex items-center gap-3">
                {/* 2. Follow Button */}
                <button
                  onClick={onToggleFollow}
                  disabled={isFollowLoading}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-xs font-bold transition-all shadow-md active:scale-95 ${
                    fanState.isFollowing
                      ? "bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-700/80"
                      : "bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-pink-600/30 hover:from-pink-500 hover:to-rose-500"
                  }`}
                >
                  <Heart
                    className={`h-4 w-4 transition-transform ${
                      fanState.isFollowing ? "fill-rose-500 text-rose-500 scale-110" : ""
                    }`}
                  />
                  <span>{fanState.isFollowing ? "Following" : "Follow"}</span>
                </button>

                {/* 3. Subscribe Primary Action */}
                <button
                  onClick={() => {
                    if (subscription.isSubscribed) {
                      onSelectTab("subscription");
                    } else {
                      onOpenSubscribeCheckout();
                    }
                  }}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 px-6 py-3 text-xs font-black text-white shadow-xl shadow-purple-600/30 hover:opacity-95 active:scale-95 transition-all"
                >
                  <Crown className="h-4 w-4 text-amber-200 fill-amber-200" />
                  <span>
                    {subscription.isSubscribed
                      ? "VIP Member Active ✨"
                      : `Subscribe (${lowestTierPrice}/mo)`}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* 3. Commercial Credibility Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-zinc-800/80">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-black text-white">
                  {creator.totalFollowers.toLocaleString()}
                </p>
                <p className="text-[11px] text-zinc-400">Total Followers</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Star className="h-5 w-5 fill-amber-400" />
              </div>
              <div>
                <p className="text-sm font-black text-white">{creator.rating}</p>
                <p className="text-[11px] text-zinc-400">Audience Rating</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-black text-white">
                  Level {fanState.relationship.currentLevel} ({fanState.relationship.tier})
                </p>
                <p className="text-[11px] text-zinc-400">Your Relationship</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-black text-white">&lt; {creator.responseTimeMinutes} Mins</p>
                <p className="text-[11px] text-zinc-400">Avg. Response Time</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
