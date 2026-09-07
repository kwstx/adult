"use client";

import React from "react";
import { Flame, Radio, Heart, MessageCircle, Gift, Sparkles, MoreHorizontal, Coins } from "lucide-react";

export function LiveFeedSkeleton() {
  return (
    <div className="relative h-full w-full select-none overflow-hidden bg-zinc-950 text-white flex items-center justify-center animate-fade-in">
      {/* Viewport Container (matching mobile & desktop sliding window) */}
      <div className="relative h-full w-full sm:max-w-[480px] sm:h-[94vh] sm:rounded-3xl sm:border sm:border-zinc-800/80 sm:shadow-[0_0_80px_rgba(0,0,0,0.9)] overflow-hidden bg-zinc-950 flex flex-col justify-between">
        
        {/* Shimmering Ambient Media Canvas Placeholder */}
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black">
          {/* Pulsing ambient glow */}
          <div className="absolute inset-0 bg-gradient-to-tr from-pink-900/10 via-transparent to-rose-900/10 animate-pulse" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-pink-600/5 blur-3xl pointer-events-none animate-pulse" />
        </div>

        {/* 1. TOP BRAND & NAVIGATION BAR SKELETON */}
        <div className="relative z-20 flex items-center justify-between px-4 pt-4 pb-2 bg-gradient-to-b from-black/85 via-black/40 to-transparent">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div className="flex items-center gap-1.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-tr from-pink-600/50 to-amber-400/50 text-white/50">
                <Flame className="h-3.5 w-3.5" />
              </span>
              <div className="hidden sm:block h-3.5 w-16 bg-zinc-800 rounded-md animate-pulse" />
            </div>

            {/* Nav Tabs Skeleton */}
            <div className="flex items-center gap-2">
              <div className="h-3 w-12 bg-zinc-800/80 rounded-md animate-pulse" />
              <span className="text-zinc-700">•</span>
              <div className="h-3 w-8 bg-pink-500/40 rounded-md animate-pulse" />
              <span className="text-zinc-700">•</span>
              <div className="h-3 w-11 bg-zinc-800/80 rounded-md animate-pulse" />
            </div>
          </div>

          {/* Right Action Icons Skeleton */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-zinc-900/80 border border-zinc-800 animate-pulse" />
            <div className="h-7 w-20 rounded-full bg-zinc-900/80 border border-amber-500/20 animate-pulse flex items-center gap-1 px-2">
              <Coins className="h-3 w-3 text-amber-500/40" />
              <div className="h-2.5 w-10 bg-zinc-800 rounded animate-pulse" />
            </div>
            <div className="h-8 w-8 rounded-full bg-zinc-900/80 border border-zinc-800 animate-pulse" />
          </div>
        </div>

        {/* 2. MIDDLE OVERLAY: POPULARITY SIGNALS SKELETON */}
        <div className="relative z-20 flex-1 flex flex-col justify-between pointer-events-none p-4">
          <div className="flex items-center gap-2 flex-wrap">
            {/* LIVE pill */}
            <div className="h-5 w-14 rounded-full bg-rose-600/30 border border-rose-500/30 animate-pulse" />
            {/* Viewers pill */}
            <div className="h-5 w-24 rounded-full bg-zinc-900/60 border border-zinc-800 animate-pulse" />
            {/* Hype pill */}
            <div className="h-5 w-20 rounded-full bg-amber-500/15 border border-amber-500/20 animate-pulse" />
          </div>
        </div>

        {/* 3. RIGHT-SIDE VERTICAL ACTION RAIL SKELETON */}
        <div className="absolute right-3 bottom-20 z-30 flex flex-col items-center gap-3.5 pointer-events-none">
          {/* Avatar & Follow Skeleton */}
          <div className="relative mb-1 flex flex-col items-center">
            <div className="h-11 w-11 rounded-full bg-zinc-800/90 ring-2 ring-pink-500/30 animate-pulse" />
            <div className="absolute -bottom-1 h-4 w-4 rounded-full bg-pink-600/50 ring-2 ring-black animate-pulse" />
          </div>

          {/* Like button skeleton */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900/80 border border-zinc-800 animate-pulse">
              <Heart className="h-5 w-5 text-zinc-700" />
            </div>
            <div className="h-2.5 w-6 bg-zinc-800 rounded animate-pulse" />
          </div>

          {/* Chat button skeleton */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900/80 border border-zinc-800 animate-pulse">
              <MessageCircle className="h-5 w-5 text-zinc-700" />
            </div>
            <div className="h-2.5 w-6 bg-zinc-800 rounded animate-pulse" />
          </div>

          {/* Gift button skeleton */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900/80 border border-amber-500/20 animate-pulse">
              <Gift className="h-5 w-5 text-zinc-700" />
            </div>
            <div className="h-2.5 w-6 bg-zinc-800 rounded animate-pulse" />
          </div>

          {/* Vault button skeleton */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900/80 border border-zinc-800 animate-pulse">
              <Sparkles className="h-5 w-5 text-zinc-700" />
            </div>
            <div className="h-2.5 w-6 bg-zinc-800 rounded animate-pulse" />
          </div>

          {/* More options button skeleton */}
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900/80 border border-zinc-800 animate-pulse">
            <MoreHorizontal className="h-4 w-4 text-zinc-700" />
          </div>
        </div>

        {/* 4. BOTTOM CREATOR IDENTITY & QUICK CHAT SKELETON */}
        <div className="relative z-20 px-4 pb-3 pt-6 bg-gradient-to-t from-black/95 via-black/60 to-transparent space-y-2">
          <div className="max-w-[76%] space-y-2">
            {/* Display Name */}
            <div className="flex items-center gap-2">
              <div className="h-4 w-32 bg-zinc-800 rounded-md animate-pulse" />
              <div className="h-3.5 w-14 bg-amber-500/20 rounded-full animate-pulse" />
            </div>

            {/* Stream Title */}
            <div className="space-y-1">
              <div className="h-3 w-48 bg-zinc-800/80 rounded animate-pulse" />
              <div className="h-3 w-36 bg-zinc-800/60 rounded animate-pulse" />
            </div>

            {/* Stream Goal Bar Skeleton */}
            <div className="h-6 w-52 rounded-full bg-zinc-900/90 border border-amber-500/20 animate-pulse flex items-center px-3 gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500/40" />
              <div className="h-2.5 w-36 bg-zinc-800 rounded" />
            </div>

            {/* Category Tags */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <div className="h-4 w-12 bg-zinc-900 rounded-md animate-pulse" />
              <div className="h-4 w-14 bg-zinc-900 rounded-md animate-pulse" />
              <div className="h-4 w-10 bg-zinc-900 rounded-md animate-pulse" />
            </div>
          </div>

          {/* Quick Chat Input Skeleton */}
          <div className="mt-3 pt-2 border-t border-white/10">
            <div className="h-9 w-full rounded-full bg-zinc-900/80 border border-zinc-800 animate-pulse flex items-center px-4">
              <div className="h-3 w-40 bg-zinc-800/80 rounded" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
