"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  RotateCw,
  Users,
  MessageSquare,
  HelpCircle,
  Smartphone,
  Laptop,
  Monitor,
} from "lucide-react";
import { FanslyHeartLogo } from "@/components/common/FanslyHeartLogo";
import { VerifiedBadge } from "@/components/common/VerifiedBadge";
import { FanslyReelViewer } from "./FanslyReelViewer";
import { WalletModal } from "@/components/wallet/WalletModal";
import { useUser } from "@/lib/user-context";

// Data types
export interface MadeForYouItem {
  id: string;
  creatorId: string;
  displayName: string;
  username: string;
  previewUrl: string;
  isBlurred?: boolean;
}

export interface WhoToFollowItem {
  id: string;
  creatorId: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  bannerUrl: string;
  isVerified: boolean;
  isFollowing?: boolean;
}

export interface StreamYouMightLikeItem {
  id: string;
  creatorId: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  streamPreviewUrl: string;
  viewerCount: number;
  isVerified: boolean;
}

const DEFAULT_MADE_FOR_YOU: MadeForYouItem[] = [
  {
    id: "mfy-1",
    creatorId: "cosmickitti",
    displayName: "Cosmic Kitt...",
    username: "cosmickitti",
    previewUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80",
    isBlurred: true,
  },
  {
    id: "mfy-2",
    creatorId: "black_panterita",
    displayName: "Black_",
    username: "Panterita...",
    previewUrl:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80",
    isBlurred: true,
  },
  {
    id: "mfy-3",
    creatorId: "jaklinaba",
    displayName: "jaklinaba...",
    username: "jaklinaba...",
    previewUrl:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&auto=format&fit=crop&q=80",
    isBlurred: true,
  },
  {
    id: "mfy-4",
    creatorId: "aaronmich",
    displayName: "Aaronmich...",
    username: "Aaronmich...",
    previewUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80",
    isBlurred: true,
  },
  {
    id: "mfy-5",
    creatorId: "improperl",
    displayName: "Improperl...",
    username: "Improperl...",
    previewUrl:
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500&auto=format&fit=crop&q=80",
    isBlurred: true,
  },
  {
    id: "mfy-6",
    creatorId: "hate",
    displayName: "Hate",
    username: "HateTheMu...",
    previewUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&auto=format&fit=crop&q=80",
    isBlurred: true,
  },
];

const DEFAULT_WHO_TO_FOLLOW: WhoToFollowItem[] = [
  {
    id: "wtf-1",
    creatorId: "black_panterita",
    displayName: "Black_",
    username: "Panterita...",
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    bannerUrl:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80",
    isVerified: true,
  },
  {
    id: "wtf-2",
    creatorId: "aaronmich",
    displayName: "Aaronmich...",
    username: "Aaronmich...",
    avatarUrl:
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
    bannerUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80",
    isVerified: true,
  },
  {
    id: "wtf-3",
    creatorId: "jaklinaba",
    displayName: "jaklinaba...",
    username: "jaklinaba...",
    avatarUrl:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80",
    bannerUrl:
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&auto=format&fit=crop&q=80",
    isVerified: true,
  },
  {
    id: "wtf-4",
    creatorId: "improperl",
    displayName: "Improperl...",
    username: "Improperl...",
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    bannerUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80",
    isVerified: true,
  },
  {
    id: "wtf-5",
    creatorId: "cosmickitti",
    displayName: "Cosmic Kitt...",
    username: "cosmickitti",
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    bannerUrl:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80",
    isVerified: true,
  },
  {
    id: "wtf-6",
    creatorId: "lexyshy_v",
    displayName: "LexyShy_V...",
    username: "LexyShy_V...",
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    bannerUrl:
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&auto=format&fit=crop&q=80",
    isVerified: true,
  },
];

const DEFAULT_STREAMS: StreamYouMightLikeItem[] = [
  {
    id: "stream-1",
    creatorId: "hate",
    displayName: "Hate",
    username: "HateTheMu...",
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    streamPreviewUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80",
    viewerCount: 162,
    isVerified: true,
  },
  {
    id: "stream-2",
    creatorId: "kikokinet",
    displayName: "KikoKinet...",
    username: "KikoKinet...",
    avatarUrl:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    streamPreviewUrl:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80",
    viewerCount: 92,
    isVerified: true,
  },
  {
    id: "stream-3",
    creatorId: "monika_yo",
    displayName: "Monika_Yo...",
    username: "Monika_Yo...",
    avatarUrl:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80",
    streamPreviewUrl:
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&auto=format&fit=crop&q=80",
    viewerCount: 73,
    isVerified: true,
  },
  {
    id: "stream-4",
    creatorId: "lexyshy_v",
    displayName: "LexyShy_V...",
    username: "LexyShy_V...",
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    streamPreviewUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&auto=format&fit=crop&q=80",
    viewerCount: 46,
    isVerified: true,
  },
  {
    id: "stream-5",
    creatorId: "jaklinaba",
    displayName: "jaklinaba...",
    username: "jaklinaba...",
    avatarUrl:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80",
    streamPreviewUrl:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&auto=format&fit=crop&q=80",
    viewerCount: 88,
    isVerified: true,
  },
  {
    id: "stream-6",
    creatorId: "aaronmich",
    displayName: "Aaronmich...",
    username: "Aaronmich...",
    avatarUrl:
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
    streamPreviewUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80",
    viewerCount: 114,
    isVerified: true,
  },
];

export function FanslyHomeFeed() {
  const { currentUser } = useUser();
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [activeReelIndex, setActiveReelIndex] = useState<number | null>(null);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [whoToFollowPage, setWhoToFollowPage] = useState(0);
  const [streamsPage, setStreamsPage] = useState(0);
  const [isRefreshingStreams, setIsRefreshingStreams] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Screen width mode for adjustable laptop / desktop display
  const [screenWidthMode, setScreenWidthMode] = useState<"phone" | "laptop" | "wide">("laptop");

  const toggleFollow = (id: string) => {
    setFollowingMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleRefreshStreams = () => {
    setIsRefreshingStreams(true);
    setTimeout(() => {
      setIsRefreshingStreams(false);
      setStreamsPage((prev) => (prev === 0 ? 1 : 0));
    }, 400);
  };

  // If a reel is selected, show the Fullscreen Reel Viewer (Image 2)
  if (activeReelIndex !== null) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <FanslyReelViewer
          initialIndex={activeReelIndex}
          onClose={() => setActiveReelIndex(null)}
        />
      </div>
    );
  }

  // Dynamic container class based on screen mode
  const containerClass =
    screenWidthMode === "phone"
      ? "max-w-md mx-auto"
      : screenWidthMode === "laptop"
      ? "max-w-4xl mx-auto"
      : "max-w-6xl mx-auto";

  return (
    <div className="min-h-screen w-full bg-[#101216] text-white select-none pb-20">
      {/* ==================================================================== */}
      {/* 1. TOP HEADER (Exact Image 1 Match with Laptop Adjuster)             */}
      {/* ==================================================================== */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#101216]/95 backdrop-blur-xl">
        <div className={`flex items-center justify-between px-4 py-2.5 ${containerClass}`}>
          {/* Left: User Avatar with online indicator */}
          <Link href="/profile" className="relative group shrink-0">
            <div className="relative h-9 w-9 rounded-full bg-zinc-800 p-0.5 ring-1 ring-white/15 group-hover:ring-[#00a2f8] transition-all">
              <img
                src={
                  currentUser?.avatarUrl ||
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                }
                alt={currentUser?.displayName || "Profile"}
                className="h-full w-full rounded-full object-cover"
              />
              {/* Green Online Dot */}
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[#101216]" />
            </div>
          </Link>

          {/* Center: Fansly Cyan-Blue Heart Logo */}
          <div className="flex items-center justify-center">
            <FanslyHeartLogo className="h-7 w-7 transition-transform hover:scale-105 cursor-pointer" />
          </div>

          {/* Right: Screen Mode Switcher + Help + Balance Badge ($0) */}
          <div className="flex items-center gap-2">
            {/* Screen Width Adjuster for Laptop / Desktop screens */}
            <div className="hidden sm:flex items-center rounded-lg bg-[#16181f] border border-zinc-850 p-0.5">
              <button
                onClick={() => setScreenWidthMode("phone")}
                className={`p-1.5 rounded-md text-xs transition-all ${
                  screenWidthMode === "phone"
                    ? "bg-[#00a2f8] text-white shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
                title="Mobile View (390px)"
              >
                <Smartphone className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setScreenWidthMode("laptop")}
                className={`p-1.5 rounded-md text-xs transition-all ${
                  screenWidthMode === "laptop"
                    ? "bg-[#00a2f8] text-white shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
                title="Laptop / Medium View (896px)"
              >
                <Laptop className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setScreenWidthMode("wide")}
                className={`p-1.5 rounded-md text-xs transition-all ${
                  screenWidthMode === "wide"
                    ? "bg-[#00a2f8] text-white shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
                title="Full Wide View (1152px)"
              >
                <Monitor className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Help / Support Icon */}
            <button
              onClick={() => setShowHelpModal(true)}
              className="p-1.5 text-zinc-400 hover:text-white transition-colors"
              title="Help & FAQ"
            >
              <div className="relative">
                <MessageSquare className="h-5 w-5" />
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-zinc-300">
                  ?
                </span>
              </div>
            </button>

            {/* Wallet Balance Badge */}
            <button
              onClick={() => setIsWalletOpen(true)}
              className="flex items-center justify-center rounded-md bg-[#16181f] border border-zinc-800/90 px-2.5 py-1 text-xs font-semibold text-white hover:border-[#00a2f8]/50 hover:bg-zinc-850 transition-all shadow-sm"
            >
              <span>
                ${currentUser?.walletBalance !== undefined ? currentUser.walletBalance : 0}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area (Adjustable Width for Laptops & Mobile) */}
      <main className={`${containerClass} space-y-6 px-3 sm:px-4 pt-4 transition-all duration-300`}>
        {/* ==================================================================== */}
        {/* 2. SECTION: "MADE FOR YOU" (Adaptive Grid for Laptop Screen)         */}
        {/* ==================================================================== */}
        <section className="space-y-3">
          {/* Section Header */}
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Made For You
            </h2>
            <button
              onClick={() => setActiveReelIndex(0)}
              className="p-1 text-zinc-400 hover:text-white transition-colors"
              title="Filter"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>

          {/* Vertical Preview Cards (3 on Mobile, 4 to 6 on Laptop/Desktop) */}
          <div
            className={`grid gap-2.5 ${
              screenWidthMode === "phone"
                ? "grid-cols-3"
                : screenWidthMode === "laptop"
                ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-6"
                : "grid-cols-3 sm:grid-cols-4 md:grid-cols-6"
            }`}
          >
            {DEFAULT_MADE_FOR_YOU.slice(0, screenWidthMode === "phone" ? 3 : 6).map((item, index) => (
              <div
                key={item.id}
                onClick={() => setActiveReelIndex(index)}
                className="group relative aspect-[9/16] w-full cursor-pointer overflow-hidden rounded-xl sm:rounded-2xl bg-[#181b22] border border-white/5 transition-all hover:border-[#00a2f8]/50 hover:shadow-xl hover:shadow-[#00a2f8]/15 hover:-translate-y-0.5"
              >
                {/* Blurred Image Background */}
                <img
                  src={item.previewUrl}
                  alt={item.displayName}
                  className="h-full w-full object-cover blur-xl scale-125 opacity-70 group-hover:scale-130 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/20" />

                {/* Centered White EyeOff Icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <EyeOff className="h-6 w-6 sm:h-7 sm:w-7 text-white drop-shadow-md group-hover:scale-110 transition-transform" />
                </div>

                {/* Creator Label Tag on Laptop View */}
                <div className="absolute bottom-2 inset-x-2 hidden group-hover:flex items-center justify-center rounded-lg bg-black/70 backdrop-blur-md py-1 px-1.5 text-[10px] font-bold text-white truncate">
                  {item.displayName}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ==================================================================== */}
        {/* 3. SECTION: "WHO TO FOLLOW" (1-col on phone, 2-col on Laptop)        */}
        {/* ==================================================================== */}
        <section className="space-y-3">
          {/* Section Header */}
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Who To Follow
            </h2>
            <div className="flex items-center gap-1 text-zinc-500">
              <button
                onClick={() => setWhoToFollowPage((prev) => Math.max(0, prev - 1))}
                className="p-0.5 hover:text-white disabled:opacity-30"
                disabled={whoToFollowPage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setWhoToFollowPage((prev) => prev + 1)}
                className="p-0.5 hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* List of Creator Follow Cards in Adaptive Grid */}
          <div
            className={`grid gap-2.5 ${
              screenWidthMode === "phone"
                ? "grid-cols-1"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {DEFAULT_WHO_TO_FOLLOW.slice(0, screenWidthMode === "phone" ? 4 : 6).map((creator) => {
              const isFollowing = Boolean(followingMap[creator.id]);

              return (
                <div
                  key={creator.id}
                  className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-[#16181f] border border-white/5 p-3 sm:p-3.5 flex items-center justify-between transition-all hover:border-white/10 hover:shadow-lg"
                >
                  {/* Background Banner Teaser on Right */}
                  <div className="absolute right-0 top-0 bottom-0 w-3/5 overflow-hidden pointer-events-none opacity-60">
                    <img
                      src={creator.bannerUrl}
                      alt="Banner"
                      className="h-full w-full object-cover object-right"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#16181f] via-[#16181f]/70 to-transparent" />
                  </div>

                  {/* Left: Avatar + Name + Handle */}
                  <div className="relative z-10 flex items-center gap-2.5 min-w-0 pr-2">
                    <Link
                      href={`/creator/${creator.username}`}
                      className="relative shrink-0"
                    >
                      <img
                        src={creator.avatarUrl}
                        alt={creator.displayName}
                        className="h-10 w-10 sm:h-11 sm:w-11 rounded-full object-cover ring-1 ring-white/10"
                      />
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-1.5 ring-[#16181f]" />
                    </Link>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-xs sm:text-sm text-white truncate">
                          {creator.displayName}
                        </span>
                        {creator.isVerified && <VerifiedBadge size={13} />}
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate">
                        @{creator.username}
                      </p>
                    </div>
                  </div>

                  {/* Right: Bright Blue "Follow" Pill Button */}
                  <button
                    onClick={() => toggleFollow(creator.id)}
                    className={`relative z-10 shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition-all shadow-md active:scale-95 ${
                      isFollowing
                        ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                        : "bg-[#0091ea] hover:bg-[#0081d0] text-white shadow-[#0091ea]/30"
                    }`}
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Carousel Pagination Dots (. o ->) */}
          <div className="flex items-center justify-center gap-1.5 py-1 text-zinc-600">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00a2f8]" />
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
            <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
          </div>
        </section>

        {/* ==================================================================== */}
        {/* 4. SECTION: "STREAMS YOU MIGHT LIKE" (Adaptive Grid for Laptops)     */}
        {/* ==================================================================== */}
        <section className="space-y-3 pt-2">
          {/* Section Header */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Streams You Might Like
              </h2>
              <button
                onClick={handleRefreshStreams}
                className="p-1 text-zinc-400 hover:text-white transition-transform active:rotate-180"
                title="Refresh Streams"
              >
                <RotateCw
                  className={`h-3.5 w-3.5 ${
                    isRefreshingStreams ? "animate-spin text-[#00a2f8]" : ""
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center gap-1 text-zinc-500">
              <button
                onClick={() => setStreamsPage((prev) => Math.max(0, prev - 1))}
                className="p-0.5 hover:text-white disabled:opacity-30"
                disabled={streamsPage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setStreamsPage((prev) => prev + 1)}
                className="p-0.5 hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* List of Stream Cards in Adaptive Grid */}
          <div
            className={`grid gap-2.5 ${
              screenWidthMode === "phone"
                ? "grid-cols-1"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {DEFAULT_STREAMS.slice(0, screenWidthMode === "phone" ? 4 : 6).map((stream) => (
              <div
                key={stream.id}
                className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-[#16181f] border border-white/5 p-3 sm:p-3.5 flex items-center justify-between transition-all hover:border-white/10 hover:shadow-lg"
              >
                {/* Background Stream Teaser Preview on Right */}
                <div className="absolute right-0 top-0 bottom-0 w-3/5 overflow-hidden pointer-events-none opacity-50">
                  <img
                    src={stream.streamPreviewUrl}
                    alt="Stream Preview"
                    className="h-full w-full object-cover object-right"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#16181f] via-[#16181f]/80 to-transparent" />
                </div>

                {/* Left: Avatar with glowing live ring + Name + Handle */}
                <div className="relative z-10 flex items-center gap-2.5 min-w-0 pr-2">
                  <Link
                    href={`/live/${stream.creatorId}`}
                    className="relative shrink-0 p-0.5 rounded-full ring-2 ring-rose-500/80 hover:scale-105 transition-transform"
                  >
                    <img
                      src={stream.avatarUrl}
                      alt={stream.displayName}
                      className="h-9 w-9 sm:h-10 sm:w-10 rounded-full object-cover"
                    />
                    <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-[#16181f]" />
                  </Link>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-xs sm:text-sm text-white truncate">
                        {stream.displayName}
                      </span>
                      {stream.isVerified && <VerifiedBadge size={13} />}
                    </div>
                    <p className="text-[11px] text-zinc-400 truncate">
                      @{stream.username}
                    </p>
                  </div>
                </div>

                {/* Right: Viewer Count + Coral/Pink "Watch" Button */}
                <div className="relative z-10 flex flex-col items-end gap-1 shrink-0">
                  {/* Viewer Count in Coral */}
                  <div className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-[#f45d74]">
                    <Users className="h-3.5 w-3.5" />
                    <span>{stream.viewerCount}</span>
                  </div>

                  {/* Watch Button (Coral/Pink pill) */}
                  <Link
                    href={`/live/${stream.creatorId}`}
                    className="rounded-full bg-[#f45d74] hover:bg-[#e05368] active:scale-95 px-4 py-1 text-xs font-bold text-white text-center shadow-md shadow-[#f45d74]/30 transition-all"
                  >
                    Watch
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Carousel Pagination Dots (. o) */}
          <div className="flex items-center justify-center gap-1.5 py-1 text-zinc-600">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00a2f8]" />
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
          </div>
        </section>
      </main>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-[#16181f] border border-zinc-800 p-5 space-y-4 shadow-2xl text-center">
            <div className="h-12 w-12 rounded-2xl bg-[#00a2f8]/20 text-[#00a2f8] flex items-center justify-center mx-auto">
              <HelpCircle className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-white">Support & Community</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Explore creators, watch interactive livestreams, support your favorite performers, and unlock exclusive content.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setShowHelpModal(false)}
                className="w-full rounded-full bg-[#00a2f8] py-2.5 text-xs font-bold text-white hover:bg-[#0091ea]"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Top-Up Modal */}
      <WalletModal isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} />
    </div>
  );
}
