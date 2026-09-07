"use client";

import React from "react";
import { StorefrontPillarTab } from "./types";
import { Crown, Lock, Calendar, Sparkles, Radio } from "lucide-react";

interface PillarContentSkeletonProps {
  tab: StorefrontPillarTab;
}

export function PillarContentSkeleton({ tab }: PillarContentSkeletonProps) {
  if (tab === "subscription") {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Tier Cards Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-3xl border border-zinc-800/80 bg-zinc-950/80 p-6 space-y-4 shadow-xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div className="h-5 w-28 bg-zinc-800 rounded-lg animate-pulse" />
                <Crown className="h-5 w-5 text-zinc-700" />
              </div>

              <div className="h-4 w-40 bg-zinc-800/60 rounded animate-pulse" />

              <div className="flex items-baseline gap-2 pt-2 border-t border-zinc-800/60">
                <div className="h-8 w-24 bg-zinc-800 rounded-lg animate-pulse" />
                <div className="h-4 w-12 bg-zinc-850 rounded animate-pulse" />
              </div>

              {/* Perk list */}
              <div className="space-y-2.5 pt-2">
                {[1, 2, 3, 4].map((p) => (
                  <div key={p} className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-zinc-850 shrink-0" />
                    <div className="h-3 w-full bg-zinc-850/80 rounded animate-pulse" />
                  </div>
                ))}
              </div>

              {/* Subscribe button */}
              <div className="pt-4">
                <div className="h-11 w-full rounded-2xl bg-zinc-850 border border-zinc-800 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tab === "content") {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* PPV Gallery Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="rounded-3xl border border-zinc-800/80 bg-zinc-950/80 overflow-hidden shadow-xl"
            >
              {/* Media Thumbnail Skeleton */}
              <div className="relative h-48 w-full bg-zinc-900 animate-pulse flex items-center justify-center">
                <Lock className="h-6 w-6 text-zinc-700" />
              </div>

              {/* Card Meta */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-4 w-14 bg-amber-500/15 rounded-full animate-pulse" />
                </div>
                <div className="h-3 w-48 bg-zinc-850 rounded animate-pulse" />

                <div className="pt-2 flex items-center justify-between border-t border-zinc-850">
                  <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-8 w-24 rounded-xl bg-pink-600/30 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tab === "private") {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Private Sessions Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="rounded-3xl border border-zinc-800/80 bg-zinc-950/80 p-6 space-y-4 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <div className="h-5 w-36 bg-zinc-800 rounded-lg animate-pulse" />
                <Calendar className="h-5 w-5 text-zinc-700" />
              </div>

              <div className="h-3.5 w-52 bg-zinc-850 rounded animate-pulse" />

              <div className="grid grid-cols-3 gap-2.5 pt-2">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className="h-10 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse"
                  />
                ))}
              </div>

              <div className="pt-2">
                <div className="h-11 w-full rounded-2xl bg-zinc-850 border border-zinc-800 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tab === "experiences") {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Experiences Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-3xl border border-zinc-800/80 bg-zinc-950/80 p-5 space-y-3.5 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <div className="h-5 w-32 bg-zinc-800 rounded-lg animate-pulse" />
                <Sparkles className="h-4 w-4 text-zinc-700" />
              </div>
              <div className="h-3 w-44 bg-zinc-850 rounded animate-pulse" />
              <div className="h-3 w-36 bg-zinc-850/80 rounded animate-pulse" />
              <div className="pt-2 flex items-center justify-between border-t border-zinc-850">
                <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
                <div className="h-9 w-28 rounded-xl bg-zinc-850 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // tab === "live"
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-3xl border border-zinc-800/80 bg-zinc-950/80 p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-rose-500/50" />
            <div className="h-5 w-40 bg-zinc-800 rounded animate-pulse" />
          </div>
          <div className="h-6 w-20 rounded-full bg-rose-500/20 animate-pulse" />
        </div>
        <div className="h-64 w-full rounded-2xl bg-zinc-900 animate-pulse flex items-center justify-center">
          <Radio className="h-10 w-10 text-zinc-700" />
        </div>
      </div>
    </div>
  );
}
