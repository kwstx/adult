"use client";

import React, { useState } from "react";
import {
  X,
  ShieldCheck,
  Users,
  Sparkles,
  Heart,
  Coins,
  Lock,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import { useUser } from "@/lib/user-context";

interface CreatorProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  creatorId: string;
  creatorName: string;
  username: string;
  avatarUrl?: string;
  bio?: string | null;
  viewerCount: number;
  tags: string[];
  isFollowing?: boolean;
  onToggleFollow?: () => void;
  onOpenGiftDrawer: () => void;
  onOpenMarketplace: () => void;
}

export function CreatorProfileDrawer({
  isOpen,
  onClose,
  creatorId,
  creatorName,
  username,
  avatarUrl,
  bio,
  viewerCount,
  tags,
  isFollowing = false,
  onToggleFollow,
  onOpenGiftDrawer,
  onOpenMarketplace,
}: CreatorProfileDrawerProps) {
  const { currentUser } = useUser();
  const [following, setFollowing] = useState(isFollowing);

  if (!isOpen) return null;

  const handleFollow = () => {
    setFollowing(!following);
    if (onToggleFollow) onToggleFollow();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center p-0 sm:p-4 animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 flex max-h-[85vh] sm:max-h-[600px] w-full max-w-lg flex-col rounded-t-3xl sm:rounded-3xl border border-zinc-800/90 bg-zinc-950/95 shadow-2xl backdrop-blur-2xl overflow-hidden animate-slide-up">
        {/* Header Banner */}
        <div className="relative h-28 bg-gradient-to-r from-pink-900 via-rose-950 to-zinc-900 p-4">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full bg-black/50 p-1.5 text-zinc-300 backdrop-blur-md hover:bg-black/70 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Profile Card Overlay */}
        <div className="px-6 pb-6 pt-0 -mt-12 space-y-4">
          <div className="flex items-end justify-between">
            <div className="relative">
              <img
                src={
                  avatarUrl ||
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"
                }
                alt={creatorName}
                className="h-20 w-20 rounded-3xl object-cover ring-4 ring-zinc-950 shadow-2xl"
              />
              <span className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-zinc-950" />
            </div>

            <button
              onClick={handleFollow}
              className={`rounded-2xl px-5 py-2 text-xs font-bold transition-all shadow-md ${
                following
                  ? "bg-zinc-800 text-zinc-300 border border-zinc-700"
                  : "bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-pink-600/30 hover:from-pink-500 hover:to-rose-500"
              }`}
            >
              {following ? "Following ✨" : "+ Follow"}
            </button>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-white">{creatorName}</h3>
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="h-3 w-3" />
                2257 Verified
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-medium">@{username}</p>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center gap-6 py-2 border-y border-zinc-800/80 text-xs">
            <div>
              <span className="font-extrabold text-white">12.4K</span>
              <span className="text-zinc-400 ml-1">Followers</span>
            </div>
            <div>
              <span className="font-extrabold text-pink-400">{viewerCount}</span>
              <span className="text-zinc-400 ml-1">Watching Live</span>
            </div>
            <div>
              <span className="font-extrabold text-amber-400">98.6%</span>
              <span className="text-zinc-400 ml-1">Rating</span>
            </div>
          </div>

          {/* Bio */}
          {bio && (
            <p className="text-xs text-zinc-300 leading-relaxed">
              {bio}
            </p>
          )}

          {/* Tags */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {tags.map((t) => (
              <span
                key={t}
                className="rounded-xl bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-zinc-400 border border-zinc-800"
              >
                #{t}
              </span>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => {
                onClose();
                onOpenGiftDrawer();
              }}
              className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-amber-500 py-3 font-bold text-white shadow-xl shadow-pink-600/30 hover:opacity-95 transition-all text-xs"
            >
              <Sparkles className="h-4 w-4" />
              <span>Send Tip / Gift</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenMarketplace();
              }}
              className="flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 border border-zinc-800 py-3 font-bold text-zinc-200 hover:bg-zinc-850 hover:text-white transition-all text-xs"
            >
              <Lock className="h-4 w-4 text-amber-400" />
              <span>PPV Media Vault</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
