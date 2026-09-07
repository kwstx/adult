"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Share2, Users, Star, Zap, Clock } from "lucide-react";

interface CreatorHeaderSkeletonProps {
  creatorId: string;
}

export function CreatorHeaderSkeleton({ creatorId }: CreatorHeaderSkeletonProps) {
  return (
    <div className="relative w-full animate-fade-in">
      {/* 1. Hero Banner Skeleton */}
      <div className="relative h-64 sm:h-80 md:h-96 w-full overflow-hidden bg-zinc-950">
        <div className="h-full w-full bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 animate-pulse" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />

        {/* Top Control Bar */}
        <div className="absolute top-4 left-4 right-4 sm:top-6 sm:left-6 sm:right-6 flex items-center justify-between z-20">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-2xl bg-black/60 backdrop-blur-xl px-4 py-2 text-xs font-bold text-zinc-200 border border-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Feed</span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 backdrop-blur-xl px-3.5 py-1.5 text-xs font-bold text-emerald-300 border border-emerald-500/40 shadow-lg">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>2257 Approved & Verified</span>
            </span>

            <div className="flex items-center justify-center h-9 w-9 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 text-zinc-500">
              <Share2 className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Creator Identity Card Skeleton */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-16 sm:-mt-20 relative z-20">
        <div className="rounded-3xl bg-zinc-950/95 backdrop-blur-2xl border border-zinc-800/90 p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Left: Avatar + Identity */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              {/* Avatar Skeleton */}
              <div className="relative h-28 w-28 sm:h-32 sm:w-32 rounded-3xl bg-zinc-900 ring-4 ring-zinc-800 animate-pulse shrink-0 overflow-hidden" />

              {/* Identity Details */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-black text-white capitalize">
                    {creatorId.replace(/_/g, " ")}
                  </h1>
                  <span className="h-6 w-20 rounded-full bg-pink-500/10 border border-pink-500/20 animate-pulse" />
                </div>

                <p className="text-xs sm:text-sm font-semibold text-pink-400/80">
                  @{creatorId}
                </p>

                {/* Bio shimmer lines */}
                <div className="space-y-1.5 max-w-lg">
                  <div className="h-3.5 w-full bg-zinc-850 rounded animate-pulse" />
                  <div className="h-3.5 w-3/4 bg-zinc-850/80 rounded animate-pulse" />
                </div>

                {/* Tags shimmer */}
                <div className="flex items-center justify-center sm:justify-start gap-1.5 pt-1">
                  <div className="h-5 w-16 bg-zinc-900 rounded-xl animate-pulse" />
                  <div className="h-5 w-14 bg-zinc-900 rounded-xl animate-pulse" />
                  <div className="h-5 w-20 bg-zinc-900 rounded-xl animate-pulse" />
                </div>
              </div>
            </div>

            {/* Right CTAs */}
            <div className="flex items-center gap-3 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-zinc-800/80">
              <div className="h-11 w-28 rounded-2xl bg-zinc-900 border border-zinc-800 animate-pulse" />
              <div className="h-11 w-36 rounded-2xl bg-gradient-to-r from-pink-600/30 to-purple-600/30 border border-pink-500/30 animate-pulse" />
            </div>
          </div>

          {/* Credibility Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-zinc-800/80">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
                <Users className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse" />
                <p className="text-[11px] text-zinc-400">Total Followers</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Star className="h-5 w-5 fill-amber-400" />
              </div>
              <div className="space-y-1">
                <div className="h-4 w-12 bg-zinc-800 rounded animate-pulse" />
                <p className="text-[11px] text-zinc-400">Audience Rating</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Zap className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
                <p className="text-[11px] text-zinc-400">Your Relationship</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Clock className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse" />
                <p className="text-[11px] text-zinc-400">Avg. Response Time</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
