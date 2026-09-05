"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Users,
  Target,
  ChevronLeft,
  UserPlus,
  Check,
  Flame,
  Sparkles,
} from "lucide-react";
import type { RoomConfig, ViewerRelationship, StreamGoalData } from "@/modules/livestream/room-session.service";

interface CreatorIdentityOverlayProps {
  roomConfig: RoomConfig;
  relationship: ViewerRelationship;
  goal: StreamGoalData;
  viewerCount: number;
  onToggleFollow: () => void;
  onOpenGoalDrawer: () => void;
}

export function CreatorIdentityOverlay({
  roomConfig,
  relationship,
  goal,
  viewerCount,
  onToggleFollow,
  onOpenGoalDrawer,
}: CreatorIdentityOverlayProps) {
  return (
    <div className="absolute top-0 left-0 right-0 z-30 flex flex-col gap-3 p-4 sm:p-6 pointer-events-none">
      {/* Main Top Header Bar */}
      <div className="flex items-center justify-between gap-3">
        {/* Left Side: Creator Identity Pill */}
        <div className="pointer-events-auto flex items-center gap-2 sm:gap-3 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 p-1.5 pr-4 shadow-2xl transition-all hover:bg-black/75">
          {/* Back Navigation Button */}
          <Link
            href="/discover"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            title="Back to Discovery"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>

          {/* Creator Avatar with Neon Live Ring */}
          <div className="relative">
            <img
              src={
                roomConfig.avatarUrl ||
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
              }
              alt={roomConfig.displayName}
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-full object-cover ring-2 ring-pink-500 shadow-md shadow-pink-500/30"
            />
            {roomConfig.isLive && (
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-pink-600 ring-2 ring-black">
                <span className="h-2 w-2 rounded-full bg-white animate-ping" />
              </span>
            )}
          </div>

          {/* Creator Information & Relationship Badge */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-white text-xs sm:text-sm truncate max-w-[130px] sm:max-w-[180px]">
                {roomConfig.displayName}
              </span>
              {roomConfig.is2257Compliant && (
                <span
                  title="2257 Verified Creator Identity"
                  className="flex items-center text-emerald-400 shrink-0"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                </span>
              )}
            </div>

            {/* Viewer's Relationship Level Badge */}
            <div className="flex items-center gap-1.5 text-[10px]">
              {relationship.fanBadge ? (
                <span className="rounded-full bg-gradient-to-r from-amber-500/20 to-pink-500/20 border border-amber-500/40 px-2 py-0.2 font-black text-amber-300">
                  {relationship.fanBadge}
                </span>
              ) : (
                <span className="text-zinc-400 font-medium">@{roomConfig.username}</span>
              )}
            </div>
          </div>

          {/* Follow / Following Toggle Button */}
          <button
            onClick={onToggleFollow}
            className={`ml-1 flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-all shadow-md ${
              relationship.isFollowing
                ? "bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700"
                : "bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-pink-600/30 hover:from-pink-500 hover:to-rose-500"
            }`}
          >
            {relationship.isFollowing ? (
              <>
                <Check className="h-3 w-3" />
                <span>Following</span>
              </>
            ) : (
              <>
                <UserPlus className="h-3 w-3" />
                <span>Follow</span>
              </>
            )}
          </button>
        </div>

        {/* Right Side: Presence Viewer Count */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Live Status & Viewer Count */}
          <div className="flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 px-3.5 py-1.5 text-xs font-black text-white shadow-2xl">
            {roomConfig.isLive ? (
              <>
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-rose-400 font-black tracking-wider text-[10px]">LIVE</span>
                <span className="text-zinc-500">|</span>
                <Users className="h-3.5 w-3.5 text-zinc-400" />
                <span>{viewerCount.toLocaleString()}</span>
              </>
            ) : (
              <span className="text-zinc-400 font-bold text-xs">OFFLINE</span>
            )}
          </div>
        </div>
      </div>

      {/* Creator's Live Goal Overlay Widget */}
      {roomConfig.isLive && (
        <div className="pointer-events-auto max-w-sm sm:max-w-md">
          <button
            onClick={onOpenGoalDrawer}
            className="w-full flex flex-col gap-1.5 rounded-2xl bg-black/55 backdrop-blur-xl border border-white/10 p-2.5 shadow-2xl text-left hover:bg-black/70 transition-all group"
          >
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                  <Target className="h-3 w-3" />
                </span>
                <span className="font-extrabold text-white truncate max-w-[200px] sm:max-w-[260px]">
                  {goal.title}
                </span>
              </div>
              <span className="font-black text-amber-400 text-[11px] shrink-0">
                {goal.progress} / {goal.target} 🪙 ({goal.percentage}%)
              </span>
            </div>

            {/* Live Progress Bar */}
            <div className="h-2 w-full rounded-full bg-zinc-900/90 overflow-hidden border border-white/5 p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 transition-all duration-500 shadow-md shadow-pink-500/30"
                style={{ width: `${goal.percentage}%` }}
              />
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
