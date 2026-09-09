"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  ShieldCheck,
  Check,
} from "lucide-react";

export interface SpherePost {
  id: string;
  creatorId: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  timestamp: string;
  caption: string;
  mediaUrl: string;
  videoUrl?: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLive?: boolean;
  viewerCount?: number;
  tags?: string[];
}

interface SphereFeedCardProps {
  post: SpherePost;
  onOpenComments?: (post: SpherePost) => void;
  onShare?: (post: SpherePost) => void;
}

export function SphereFeedCard({ post, onOpenComments, onShare }: SphereFeedCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(post.likesCount);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showShareToast, setShowShareToast] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleLike = () => {
    if (isLiked) {
      setIsLiked(false);
      setLikes((prev) => Math.max(0, prev - 1));
    } else {
      setIsLiked(true);
      setLikes((prev) => prev + 1);
    }
  };

  const handleShare = () => {
    if (onShare) {
      onShare(post);
      return;
    }
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(`${window.location.origin}/live/${post.creatorId}`);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2000);
    }
  };

  return (
    <article className="relative w-full rounded-[28px] border border-zinc-800/80 bg-zinc-950/85 backdrop-blur-xl p-4 sm:p-5 shadow-xl transition-all hover:border-zinc-700/80">
      {/* 1. Header: Avatar + Creator Info + 3-Dot Menu */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <Link href={`/creator/${post.username}`} className="flex items-center gap-3 group">
          <div className="relative p-0.5 rounded-full story-ring-gradient group-hover:scale-105 transition-transform">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-full p-0.5 bg-black">
              <img
                src={post.avatarUrl}
                alt={post.displayName}
                className="h-full w-full rounded-full object-cover"
              />
            </div>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-bold text-white group-hover:text-pink-400 transition-colors">
                {post.displayName}
              </span>
              {post.isLive && (
                <span className="flex items-center gap-1 rounded-full bg-rose-600/90 px-1.5 py-0.2 text-[8px] font-extrabold uppercase text-white shadow-sm">
                  <span className="h-1 w-1 rounded-full bg-white animate-ping" />
                  Live
                </span>
              )}
            </div>
            <span className="text-[11px] text-zinc-400">{post.timestamp}</span>
          </div>
        </Link>

        {/* 3-Dot Action Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
            title="Options"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-10 z-30 w-44 rounded-2xl bg-zinc-900 border border-zinc-800 p-2 shadow-2xl animate-fade-in text-xs space-y-1">
              <button
                onClick={() => {
                  handleShare();
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                Share Stream
              </button>
              <Link
                href={`/creator/${post.username}`}
                className="block w-full text-left px-3 py-2 rounded-xl text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                View Creator Profile
              </Link>
              <button
                onClick={() => setShowMenu(false)}
                className="w-full text-left px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10"
              >
                Report Content
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Caption Text */}
      <div className="mb-3 text-xs sm:text-sm text-zinc-200 leading-relaxed">
        <p className={isExpanded ? "" : "line-clamp-2"}>
          {post.caption}
        </p>
        {post.caption.length > 80 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 mt-0.5"
          >
            {isExpanded ? "Show less" : "... see more"}
          </button>
        )}
      </div>

      {/* 3. Media Preview Box with Centered Frosted Play Button */}
      <div className="relative aspect-video w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-zinc-900 mb-3 group">
        <img
          src={post.mediaUrl}
          alt={post.caption}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-103"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        {/* Live Badge (Top-Left) */}
        {post.isLive && (
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-rose-600/90 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-black text-white shadow-md">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
              LIVE
            </span>
            {post.viewerCount && (
              <span className="rounded-full bg-black/60 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-zinc-200">
                {post.viewerCount.toLocaleString()} watching
              </span>
            )}
          </div>
        )}

        {/* Centered Frosted Glass Play Button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Link
            href={`/live/${post.creatorId}`}
            className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full frosted-play-btn text-white transition-all transform group-hover:scale-110 active:scale-95 shadow-2xl"
            title="Watch stream"
          >
            <Play className="h-6 w-6 sm:h-7 sm:w-7 fill-white translate-x-0.5" />
          </Link>
        </div>
      </div>

      {/* 4. Reaction & Engagement Footer (Likes, Comments, Shares) */}
      <div className="flex items-center justify-between pt-1 text-zinc-400">
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Like Button */}
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 text-xs font-semibold transition-all active:scale-90 ${
              isLiked ? "text-rose-500" : "hover:text-white"
            }`}
          >
            <Heart className={`h-4 w-4 ${isLiked ? "fill-rose-500 text-rose-500" : ""}`} />
            <span>{likes.toLocaleString()}</span>
          </button>

          {/* Comment Button */}
          <button
            onClick={() => onOpenComments && onOpenComments(post)}
            className="flex items-center gap-1.5 text-xs font-semibold hover:text-white transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            <span>{post.commentsCount.toLocaleString()}</span>
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-xs font-semibold hover:text-white transition-colors"
          >
            <Share2 className="h-4 w-4" />
            <span>{post.sharesCount.toLocaleString()}</span>
          </button>
        </div>

        {/* Quick Link to Creator Live Room */}
        <Link
          href={`/live/${post.creatorId}`}
          className="text-[11px] font-bold text-pink-400 hover:text-pink-300 transition-colors"
        >
          Join Room →
        </Link>
      </div>

      {/* Share Toast */}
      {showShareToast && (
        <div className="absolute top-4 right-4 z-30 flex items-center gap-1.5 rounded-full bg-zinc-900 border border-pink-500/40 px-3 py-1 text-xs font-bold text-pink-400 shadow-xl animate-fade-in">
          <Check className="h-3.5 w-3.5" />
          <span>Stream link copied!</span>
        </div>
      )}
    </article>
  );
}
