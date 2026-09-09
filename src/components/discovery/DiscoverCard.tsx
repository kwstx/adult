"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Heart, Share2, MessageCircle, Play, Radio, Sparkles } from "lucide-react";

export interface DiscoverCardData {
  id: string;
  creatorId: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  mediaUrl: string;
  caption: string;
  tags?: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLive?: boolean;
  viewerCount?: number;
}

interface DiscoverCardProps {
  item: DiscoverCardData;
  onOpenComments?: (item: DiscoverCardData) => void;
  onShare?: (item: DiscoverCardData) => void;
}

export function DiscoverCard({ item, onOpenComments, onShare }: DiscoverCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(item.likesCount);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isLiked) {
      setIsLiked(false);
      setLikes((prev) => Math.max(0, prev - 1));
    } else {
      setIsLiked(true);
      setLikes((prev) => prev + 1);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onShare) onShare(item);
    else if (typeof window !== "undefined") {
      navigator.clipboard.writeText(`${window.location.origin}/live/${item.creatorId}`);
    }
  };

  const handleComments = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onOpenComments) onOpenComments(item);
  };

  return (
    <div className="group relative aspect-[4/5] sm:aspect-square w-full rounded-[28px] sm:rounded-[32px] overflow-hidden bg-zinc-950 border border-zinc-800/80 shadow-2xl transition-all duration-300 hover:border-zinc-700 hover:shadow-rose-950/20">
      {/* Background Media Image */}
      <img
        src={item.mediaUrl}
        alt={item.caption}
        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

      {/* Top Live Badge */}
      {item.isLive && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 rounded-full bg-rose-600/90 backdrop-blur-md px-3 py-1 text-[11px] font-black uppercase text-white shadow-lg">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
          Live
        </div>
      )}

      {/* Center Play Button Overlay on Hover */}
      <Link
        href={`/live/${item.creatorId}`}
        className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full frosted-play-btn text-white shadow-2xl transform hover:scale-110 active:scale-95 transition-transform">
          <Play className="h-6 w-6 fill-white translate-x-0.5" />
        </div>
      </Link>

      {/* Bottom Content & Overlays */}
      <div className="absolute bottom-0 inset-x-0 z-20 p-4 sm:p-5 flex items-end justify-between gap-3">
        {/* Left: Creator Avatar + Name + Caption */}
        <div className="flex-1 min-w-0 space-y-2">
          <Link
            href={`/creator/${item.username}`}
            className="inline-flex items-center gap-2.5 group/creator"
          >
            <div className="relative p-0.5 rounded-full story-ring-coral">
              <img
                src={item.avatarUrl}
                alt={item.displayName}
                className="h-9 w-9 rounded-full object-cover"
              />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-white group-hover/creator:text-pink-400 transition-colors">
                {item.displayName}
              </h4>
              <p className="text-[10px] text-zinc-400">@{item.username}</p>
            </div>
          </Link>

          <p className="text-xs text-zinc-200 line-clamp-2 leading-relaxed">
            {item.caption}
          </p>

          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.tags.map((t) => (
                <span key={t} className="text-[10px] font-semibold text-rose-400">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right: Vertical Floating Action Column (Likes, Shares, Comments) */}
        <div className="flex flex-col items-center gap-3 shrink-0">
          {/* Like */}
          <button
            onClick={handleLike}
            className="flex flex-col items-center gap-1 group/btn transition-transform active:scale-90"
            title="Like"
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md transition-all ${
                isLiked
                  ? "bg-rose-600 text-white shadow-lg shadow-rose-600/40"
                  : "bg-black/60 text-white hover:bg-black/80"
              }`}
            >
              <Heart className={`h-5 w-5 ${isLiked ? "fill-white" : "text-white"}`} />
            </div>
            <span className="text-[10px] font-bold text-white drop-shadow">
              {likes >= 1000 ? `${(likes / 1000).toFixed(1)}k` : likes}
            </span>
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="flex flex-col items-center gap-1 group/btn transition-transform active:scale-90"
            title="Share"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-black/80 transition-colors">
              <Share2 className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold text-white drop-shadow">
              {item.sharesCount >= 1000
                ? `${(item.sharesCount / 1000).toFixed(1)}k`
                : item.sharesCount}
            </span>
          </button>

          {/* Comment */}
          <button
            onClick={handleComments}
            className="flex flex-col items-center gap-1 group/btn transition-transform active:scale-90"
            title="Comments"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-black/80 transition-colors">
              <MessageCircle className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold text-white drop-shadow">
              {item.commentsCount >= 1000
                ? `${(item.commentsCount / 1000).toFixed(1)}k`
                : item.commentsCount}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
