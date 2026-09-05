"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Flame,
  Radio,
  Users,
  Search,
  Sparkles,
  ShieldCheck,
  Heart,
  TrendingUp,
  Tag,
} from "lucide-react";

interface CreatorCard {
  id: string;
  bio: string | null;
  streamTitle: string;
  isLive: boolean;
  viewerCount: number;
  tags: string;
  currentGoalTitle: string;
  currentGoalTarget: number;
  currentGoalProgress: number;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    kycStatus: string;
  };
}

const CATEGORY_TAGS = [
  "All",
  "dance",
  "music",
  "vip",
  "interactive",
  "cosplay",
  "asmr",
  "chill",
  "gaming",
];

export default function DiscoveryPage() {
  const [creators, setCreators] = useState<CreatorCard[]>([]);
  const [selectedTag, setSelectedTag] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const tagParam = selectedTag === "All" ? "" : `tag=${encodeURIComponent(selectedTag)}`;
    const queryParam = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : "";

    fetch(`/api/creators?${tagParam}${queryParam}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.creators) {
          setCreators(data.creators);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [selectedTag, searchQuery]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Hero Banner */}
      <div className="relative mb-10 overflow-hidden rounded-3xl bg-gradient-to-r from-pink-950/60 via-zinc-900 to-zinc-950 border border-pink-500/20 p-8 sm:p-12 shadow-2xl">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-500/20 px-3 py-1 text-xs font-bold text-pink-400 border border-pink-500/30 mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            Next-Gen Real-Time Interactive Streaming
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Live adult entertainment with{" "}
            <span className="bg-gradient-to-r from-pink-400 via-rose-400 to-amber-300 bg-clip-text text-transparent">
              instant token interactions
            </span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-zinc-300 leading-relaxed">
            Support creators directly, trigger real-time actions, unlock exclusive PPV media, and enjoy ultra-low latency streams protected by 2257 compliance.
          </p>
        </div>

        {/* Decorative Background Elements */}
        <div className="absolute right-0 top-0 h-full w-1/2 opacity-20 pointer-events-none bg-gradient-to-l from-pink-500 via-rose-600 to-transparent blur-3xl" />
      </div>

      {/* Filter & Search Bar */}
      <div className="mb-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Category Tag Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {CATEGORY_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`rounded-xl px-4 py-2 text-xs font-bold capitalize transition-all shrink-0 ${
                selectedTag === tag
                  ? "bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-600/20"
                  : "bg-zinc-900/80 text-zinc-400 border border-zinc-800 hover:text-white hover:bg-zinc-850"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search creators, titles, tags..."
            className="w-full rounded-2xl bg-zinc-900/80 pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 border border-zinc-800 focus:border-pink-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Creator Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 rounded-3xl bg-zinc-900/40 animate-pulse border border-zinc-800/50" />
          ))}
        </div>
      ) : creators.length === 0 ? (
        <div className="py-20 text-center">
          <Radio className="mx-auto h-12 w-12 text-zinc-600 mb-3" />
          <h3 className="text-lg font-bold text-white">No live streams found</h3>
          <p className="text-xs text-zinc-400 mt-1">Try selecting another tag or clearing your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {creators.map((creator) => {
            const tagsList = creator.tags.split(",").map((t) => t.trim());
            const progressPercent = Math.min(
              100,
              Math.round((creator.currentGoalProgress / (creator.currentGoalTarget || 1)) * 100)
            );

            return (
              <Link
                key={creator.id}
                href={`/live/${creator.id}`}
                className="group relative flex flex-col overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-950 transition-all hover:border-pink-500/50 hover:shadow-2xl hover:shadow-pink-500/10"
              >
                {/* Stream Video Thumbnail */}
                <div className="relative aspect-video w-full overflow-hidden bg-zinc-900">
                  <img
                    src={
                      creator.user.avatarUrl ||
                      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80"
                    }
                    alt={creator.user.displayName}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-black/20 to-transparent" />

                  {/* Live Status Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    {creator.isLive ? (
                      <span className="flex items-center gap-1.5 rounded-full bg-rose-600/90 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md shadow-rose-600/40">
                        <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                        LIVE
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-900/90 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-bold text-zinc-400">
                        OFFLINE
                      </span>
                    )}
                  </div>

                  {/* Viewer Count */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-semibold text-zinc-200">
                    <Users className="h-3 w-3 text-pink-400" />
                    {creator.viewerCount} Viewers
                  </div>

                  {/* Verified Badge */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-black/70 backdrop-blur-md px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                    <ShieldCheck className="h-3 w-3" />
                    2257
                  </div>
                </div>

                {/* Card Content Body */}
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <img
                      src={
                        creator.user.avatarUrl ||
                        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                      }
                      alt={creator.user.displayName}
                      className="h-10 w-10 rounded-2xl object-cover ring-1 ring-zinc-700 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="truncate text-sm font-bold text-white group-hover:text-pink-400 transition-colors">
                        {creator.user.displayName}
                      </h3>
                      <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5 font-medium">
                        {creator.streamTitle}
                      </p>
                    </div>
                  </div>

                  {/* Stream Goal Progress Snapshot */}
                  <div className="mt-auto mb-3 rounded-2xl bg-zinc-900/60 p-2.5 border border-zinc-800/60">
                    <div className="flex items-center justify-between text-[11px] font-medium mb-1.5">
                      <span className="truncate text-zinc-300">{creator.currentGoalTitle}</span>
                      <span className="text-amber-400 font-bold shrink-0 pl-2">
                        {progressPercent}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-pink-500 to-amber-400 rounded-full"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {tagsList.map((t) => (
                      <span
                        key={t}
                        className="rounded-lg bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold text-zinc-400 border border-zinc-800"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
