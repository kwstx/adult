"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Compass, Search, Sparkles, Radio, Users, ShieldCheck, Tag } from "lucide-react";

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

export default function DiscoverPage() {
  const [creators, setCreators] = useState<any[]>([]);
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
        if (data.creators) setCreators(data.creators);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [selectedTag, searchQuery]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Compass className="h-6 w-6 text-pink-400" />
          <h1 className="text-2xl sm:text-3xl font-black text-white">Discover</h1>
        </div>
        <p className="text-xs sm:text-sm text-zinc-400">
          Find top creators, live interactive broadcasts, and new categories
        </p>
      </div>

      {/* Search & Tag Filter Bar */}
      <div className="mb-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {CATEGORY_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`rounded-2xl px-4 py-2 text-xs font-bold capitalize transition-all shrink-0 ${
                selectedTag === tag
                  ? "bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-600/30"
                  : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white hover:bg-zinc-800"
              }`}
            >
              {tag === "All" ? "✨ All Streams" : `#${tag}`}
            </button>
          ))}
        </div>

        {/* Search Field */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-3 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search creators, titles, tags..."
            className="w-full rounded-2xl bg-zinc-900/90 pl-11 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 border border-zinc-800 focus:border-pink-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 rounded-3xl bg-zinc-900/40 animate-pulse border border-zinc-800/50" />
          ))}
        </div>
      ) : creators.length === 0 ? (
        <div className="py-20 text-center">
          <Radio className="mx-auto h-12 w-12 text-zinc-600 mb-3" />
          <h3 className="text-lg font-bold text-white">No streams found</h3>
          <p className="text-xs text-zinc-400 mt-1">Try another tag or search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {creators.map((creator) => (
            <Link
              key={creator.id}
              href={`/live/${creator.id}`}
              className="group relative flex flex-col overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-950 transition-all hover:border-pink-500/50 hover:shadow-2xl hover:shadow-pink-500/10"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-zinc-900">
                <img
                  src={
                    creator.user.avatarUrl ||
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80"
                  }
                  alt={creator.user.displayName}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <span className="flex items-center gap-1.5 rounded-full bg-rose-600/90 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                    LIVE
                  </span>
                </div>

                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-semibold text-zinc-200">
                  <Users className="h-3 w-3 text-pink-400" />
                  {creator.viewerCount} Viewers
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                  <img
                    src={creator.user.avatarUrl}
                    alt={creator.user.displayName}
                    className="h-10 w-10 rounded-2xl object-cover ring-1 ring-zinc-700 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="truncate text-sm font-bold text-white group-hover:text-pink-400 transition-colors">
                      {creator.user.displayName}
                    </h3>
                    <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">{creator.streamTitle}</p>
                  </div>
                </div>

                <div className="mt-auto flex items-center gap-1.5 flex-wrap pt-2">
                  {creator.tags.split(",").map((t: string) => (
                    <span
                      key={t}
                      className="rounded-lg bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold text-zinc-400 border border-zinc-800"
                    >
                      #{t.trim()}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
