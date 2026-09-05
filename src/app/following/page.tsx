"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Radio, Sparkles, ShieldCheck, Heart, Play } from "lucide-react";
import { useUser } from "@/lib/user-context";

export default function FollowingPage() {
  const { currentUser } = useUser();
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/creators")
      .then((res) => res.json())
      .then((data) => {
        if (data.creators) setCreators(data.creators);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-6 w-6 text-pink-400" />
            <h1 className="text-2xl sm:text-3xl font-black text-white">Following</h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400">
            Live streams and updates from creators you follow
          </p>
        </div>
      </div>

      {/* Following Live Streams Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 rounded-3xl bg-zinc-900/40 animate-pulse border border-zinc-800/50" />
          ))}
        </div>
      ) : creators.length === 0 ? (
        <div className="py-20 text-center">
          <Users className="mx-auto h-12 w-12 text-zinc-600 mb-3" />
          <h3 className="text-base font-bold text-white">No creators followed yet</h3>
          <p className="text-xs text-zinc-400 mt-1">Discover live performers on the home feed!</p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-pink-600/30"
          >
            Explore Live Streams
          </Link>
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
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={creator.user.avatarUrl}
                    alt={creator.user.displayName}
                    className="h-10 w-10 rounded-2xl object-cover ring-1 ring-zinc-700"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="truncate text-sm font-bold text-white group-hover:text-pink-400 transition-colors">
                      {creator.user.displayName}
                    </h3>
                    <p className="text-xs text-zinc-400 line-clamp-1">{creator.streamTitle}</p>
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-zinc-900">
                  <span className="truncate">🎯 {creator.currentGoalTitle}</span>
                  <span className="text-pink-400 font-bold ml-2">Join Stream →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
