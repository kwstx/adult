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
  MessageSquare,
  Share2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
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
      {/* 1. Hero Cover Banner with Floating Frosted Back Button */}
      <div className="relative h-60 sm:h-80 md:h-96 w-full overflow-hidden bg-zinc-950">
        <img
          src={creator.bannerUrl}
          alt={creator.displayName}
          className="h-full w-full object-cover object-center brightness-90 transition-transform duration-700 hover:scale-103"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/20" />

        {/* Floating Top Control Bar */}
        <div className="absolute top-4 left-4 right-4 sm:top-6 sm:left-6 sm:right-6 flex items-center justify-between z-20">
          {/* Floating Frosted Back Button (<) matching Image 2 */}
          <Link
            href="/"
            className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-black/50 backdrop-blur-xl border border-white/20 text-white hover:bg-black/80 hover:scale-105 transition-all shadow-xl"
            title="Back to Feed"
          >
            <ChevronLeft className="h-6 w-6 -translate-x-0.5" />
          </Link>

          <div className="flex items-center gap-2.5">
            {/* 2257 Verified Badge */}
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 backdrop-blur-xl px-3.5 py-1.5 text-xs font-bold text-emerald-300 border border-emerald-500/40 shadow-lg">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span className="hidden sm:inline">2257 Approved & Verified</span>
              <span className="sm:hidden">Verified</span>
            </span>

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 backdrop-blur-xl border border-white/20 text-zinc-200 hover:text-white hover:bg-black/80 transition-all shadow-lg"
              title="Share storefront"
            >
              <Share2 className="h-4 w-4" />
            </button>
            {copiedLink && (
              <span className="absolute right-14 top-2 text-[11px] font-bold text-orange-400 bg-zinc-900/95 px-3 py-1 rounded-xl border border-orange-500/40 animate-fade-in shadow-xl">
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
                    Live Broadcast
                  </span>
                  <span className="rounded-full bg-rose-500/20 px-2 py-0.2 text-[10px] font-bold text-rose-200">
                    {live.viewerCount.toLocaleString()}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-300 line-clamp-1 max-w-[200px]">
                  {live.streamTitle}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        )}
      </div>

      {/* 2. Creator Identity & Rachel Flowear Profile Showcase Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-16 sm:-mt-20 relative z-20">
        <div className="rounded-[32px] bg-zinc-950/95 backdrop-blur-2xl border border-zinc-850 p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center">
          {/* Overlapping Circular Avatar with Glowing Orange Ring */}
          <div className="relative -mt-14 sm:-mt-16 mb-4 group shrink-0">
            <div
              className={`relative h-28 w-28 sm:h-32 sm:w-32 rounded-full p-1 transition-all ${
                live.isLive
                  ? "story-ring-coral shadow-[0_0_30px_rgba(244,63,94,0.6)]"
                  : "story-ring-coral shadow-[0_0_25px_rgba(249,115,22,0.4)]"
              }`}
            >
              <img
                src={creator.avatarUrl}
                alt={creator.displayName}
                className="h-full w-full rounded-full object-cover ring-2 ring-black"
              />
            </div>

            {/* Live Indicator on Avatar */}
            {live.isLive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-gradient-to-r from-rose-600 to-red-600 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-lg ring-2 ring-zinc-950 animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                LIVE
              </span>
            )}
          </div>

          {/* Creator Name & Handle */}
          <div className="space-y-1 mb-5">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {creator.displayName}
              </h1>
              <span className="flex items-center gap-1 rounded-full bg-orange-500/10 border border-orange-500/30 px-2.5 py-0.5 text-xs font-bold text-orange-400">
                <Crown className="h-3 w-3 text-orange-400" />
                {creator.category}
              </span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-zinc-400">
              @{creator.username}
            </p>
            {creator.bio && (
              <p className="text-xs sm:text-sm text-zinc-300 max-w-xl mx-auto pt-2 leading-relaxed">
                {creator.bio}
              </p>
            )}
          </div>

          {/* 3-Column Stats Row (Posts | Followers | Following) matching Image 2 */}
          <div className="flex items-center justify-center gap-8 sm:gap-14 py-4 px-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 mb-6 w-full max-w-md">
            <div className="flex flex-col items-center">
              <span className="text-lg sm:text-xl font-black text-white">240</span>
              <span className="text-[11px] font-medium text-zinc-400">Posts</span>
            </div>
            <div className="h-8 w-px bg-zinc-800" />
            <div className="flex flex-col items-center">
              <span className="text-lg sm:text-xl font-black text-white">
                {creator.totalFollowers >= 1000
                  ? `${(creator.totalFollowers / 1000).toFixed(1)}K`
                  : creator.totalFollowers}
              </span>
              <span className="text-[11px] font-medium text-zinc-400">Followers</span>
            </div>
            <div className="h-8 w-px bg-zinc-800" />
            <div className="flex flex-col items-center">
              <span className="text-lg sm:text-xl font-black text-white">32K</span>
              <span className="text-[11px] font-medium text-zinc-400">Following</span>
            </div>
          </div>

          {/* Action Buttons Row (Follow | Message | VIP Subscribe) */}
          <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-md">
            {/* Primary Action: Follow Pill Button */}
            <button
              onClick={onToggleFollow}
              disabled={isFollowLoading}
              className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-3 px-6 text-xs font-bold transition-all ${
                fanState.isFollowing
                  ? "rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300 hover:bg-zinc-850"
                  : "coral-pill-btn"
              }`}
            >
              <Heart
                className={`h-4 w-4 transition-transform ${
                  fanState.isFollowing ? "fill-rose-500 text-rose-500 scale-110" : ""
                }`}
              />
              <span>{fanState.isFollowing ? "Following" : "Follow"}</span>
            </button>

            {/* Secondary Action: Message Pill Button */}
            <Link
              href="/messages"
              className="flex-1 min-w-[130px] flex items-center justify-center gap-2 py-3 px-6 text-xs font-bold frosted-pill-btn"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Message</span>
            </Link>

            {/* VIP Subscribe Button */}
            <button
              onClick={() => {
                if (subscription.isSubscribed) {
                  onSelectTab("subscription");
                } else {
                  onOpenSubscribeCheckout();
                }
              }}
              className="w-full flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 py-3 px-6 text-xs font-black text-white shadow-xl shadow-purple-600/30 hover:brightness-105 active:scale-98 transition-all"
            >
              <Crown className="h-4 w-4 text-amber-200 fill-amber-200" />
              <span>
                {subscription.isSubscribed
                  ? "VIP Member Active ✨"
                  : `Join VIP Membership (${lowestTierPrice}/mo)`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
