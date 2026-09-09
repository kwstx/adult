"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Radio, Sparkles, Heart } from "lucide-react";
import { useUser } from "@/lib/user-context";
import { StoriesReel } from "@/components/discovery/StoriesReel";
import { SphereFeedCard, SpherePost } from "@/components/discovery/SphereFeedCard";

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

  const posts: SpherePost[] = creators.map((c, i) => ({
    id: c.id,
    creatorId: c.id,
    displayName: c.user?.displayName || c.displayName || "James Clinton",
    username: c.user?.username || c.username || "james_clinton",
    avatarUrl:
      c.user?.avatarUrl ||
      c.avatarUrl ||
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
    timestamp: `${(i % 4) + 1}h ago`,
    caption:
      c.streamTitle ||
      "Broadcasting today's private creative session live with VIP perks! 🌟 #LiveStream",
    mediaUrl:
      c.user?.avatarUrl ||
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80",
    likesCount: 142 + i * 38,
    commentsCount: 22 + i * 5,
    sharesCount: 35 + i * 8,
    isLive: true,
    viewerCount: c.viewerCount || 190,
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-4 sm:py-6 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-orange-400" />
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">Following</h1>
            <p className="text-[11px] text-zinc-400">Updates & live streams from creators you follow</p>
          </div>
        </div>
      </div>

      {/* Stories / Live Strip */}
      <section className="bg-zinc-950/60 rounded-[28px] border border-zinc-850 p-2 sm:p-3 backdrop-blur-xl">
        <StoriesReel />
      </section>

      {/* Following Posts Feed */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-72 rounded-[28px] bg-zinc-900/40 animate-pulse border border-zinc-800/50"
            />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="py-20 text-center bg-zinc-950/60 rounded-[32px] border border-zinc-850 p-8">
          <Users className="mx-auto h-12 w-12 text-zinc-600 mb-3" />
          <h3 className="text-base font-bold text-white">No creators followed yet</h3>
          <p className="text-xs text-zinc-400 mt-1">Discover live performers on the feed!</p>
          <Link
            href="/discover"
            className="mt-4 inline-block rounded-full coral-pill-btn px-6 py-2.5 text-xs font-bold shadow-lg"
          >
            Explore Discover Feed
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <SphereFeedCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
