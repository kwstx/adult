"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Search,
  MessageSquare,
  ChevronRight,
  RotateCw,
  User as UserIcon,
  Compass,
  Home as HomeIcon,
  Plus,
  LayoutGrid,
  Star,
  Sparkles,
  Users,
  Navigation,
  Bell,
  Flame,
  TrendingUp,
  Dumbbell,
  Plane,
  Briefcase,
  Radio,
  Coins,
} from "lucide-react";
import { VerifiedBadge } from "@/components/common/VerifiedBadge";
import { FanslyReelViewer } from "./FanslyReelViewer";
import { WalletModal } from "@/components/wallet/WalletModal";
import { useUser } from "@/lib/user-context";

// Who To Follow Item
export interface WhoToFollowItem {
  id: string;
  creatorId: string;
  displayName: string;
  username: string;
  bio: string;
  avatarUrl: string;
  isVerified: boolean;
  isFollowing?: boolean;
}

// Live Stream Item
export interface StreamItem {
  id: string;
  creatorId: string;
  displayName: string;
  username: string;
  tags: string;
  streamPreviewUrl: string;
  viewerCount: number;
  isVerified: boolean;
}

const DEFAULT_WHO_TO_FOLLOW: WhoToFollowItem[] = [
  {
    id: "wtf-1",
    creatorId: "panterita_",
    displayName: "Black_",
    username: "Panterita_",
    bio: "Model | Content Creator | Lifestyle",
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
    isVerified: true,
  },
  {
    id: "wtf-2",
    creatorId: "aaronmich",
    displayName: "Aaronmich...",
    username: "Aaronmich...",
    bio: "Fitness | Lifestyle | Business",
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
    isVerified: true,
  },
  {
    id: "wtf-3",
    creatorId: "jaklinaba",
    displayName: "jaklinaba...",
    username: "jaklinaba...",
    bio: "Fashion | Travel | Lifestyle",
    avatarUrl:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&auto=format&fit=crop&q=80",
    isVerified: true,
  },
  {
    id: "wtf-4",
    creatorId: "improperl",
    displayName: "Improperl...",
    username: "Improperl...",
    bio: "Fitness | Motivation | Lifestyle",
    avatarUrl:
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=200&auto=format&fit=crop&q=80",
    isVerified: true,
  },
];

const DEFAULT_STREAMS: StreamItem[] = [
  {
    id: "stream-1",
    creatorId: "hate",
    displayName: "Hate",
    username: "HateTheM...",
    tags: "Just chatting · 18+",
    streamPreviewUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80",
    viewerCount: 162,
    isVerified: true,
  },
  {
    id: "stream-2",
    creatorId: "kikokinet",
    displayName: "KikoKinet...",
    username: "KikoKinet...",
    tags: "Pool session · 18+",
    streamPreviewUrl:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80",
    viewerCount: 92,
    isVerified: true,
  },
  {
    id: "stream-3",
    creatorId: "monika_yo",
    displayName: "Monika_Yo...",
    username: "Monika_Yo...",
    tags: "Workout · 18+",
    streamPreviewUrl:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80",
    viewerCount: 73,
    isVerified: true,
  },
  {
    id: "stream-4",
    creatorId: "lunaraye",
    displayName: "LunaRaye",
    username: "LunaRaye",
    tags: "Beach vibes · 18+",
    streamPreviewUrl:
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&auto=format&fit=crop&q=80",
    viewerCount: 51,
    isVerified: true,
  },
  {
    id: "stream-5",
    creatorId: "sarastyle",
    displayName: "SaraStyle",
    username: "SaraStyle",
    tags: "Dance · 18+",
    streamPreviewUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop&q=80",
    viewerCount: 38,
    isVerified: true,
  },
  {
    id: "stream-6",
    creatorId: "violetdreams",
    displayName: "VioletDreams",
    username: "VioletDreams",
    tags: "Just chatting · 18+",
    streamPreviewUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80",
    viewerCount: 26,
    isVerified: true,
  },
];

export function FanslyHomeFeed() {
  const { currentUser } = useUser();
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [activeReelIndex, setActiveReelIndex] = useState<number | null>(null);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [isRefreshingStreams, setIsRefreshingStreams] = useState(false);
  const [activeNav, setActiveNav] = useState<"home" | "explore" | "messages" | "profile">("home");
  const [activeCategory, setActiveCategory] = useState<string>("live-now");

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
    }, 500);
  };

  // If a reel is selected, show Fullscreen Reel Viewer
  if (activeReelIndex !== null) {
    return (
      <div className="fixed inset-0 z-50 bg-[#060608]">
        <FanslyReelViewer
          initialIndex={activeReelIndex}
          onClose={() => setActiveReelIndex(null)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#060608] text-white select-none">
      <div className="flex w-full min-h-screen">
        {/* ==================================================================== */}
        {/* LEFT SIDEBAR (Visible on Desktop / Laptop)                           */}
        {/* ==================================================================== */}
        <aside className="hidden lg:flex flex-col w-60 xl:w-64 shrink-0 min-h-screen border-r border-zinc-800/60 bg-[#07070a] p-4 justify-between sticky top-0 h-screen overflow-y-auto">
          <div className="space-y-6">
            {/* 1. Brand Logo */}
            <div className="px-2 pt-1">
              <Link href="/" className="hover:opacity-90 transition-opacity inline-block">
                <span className="text-3xl font-bold tracking-tight text-white font-sans">
                  Uber
                </span>
              </Link>
            </div>

            {/* 2. Main Navigation Items */}
            <nav className="space-y-1">
              {/* Home */}
              <button
                onClick={() => setActiveNav("home")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeNav === "home"
                    ? "bg-[#18181f] text-white border border-white/10 shadow-sm"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
                }`}
              >
                <HomeIcon className="h-4 w-4 fill-white text-white" />
                <span>Home</span>
              </button>

              {/* Explore */}
              <Link
                href="/discover"
                onClick={() => setActiveNav("explore")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeNav === "explore"
                    ? "bg-[#18181f] text-white border border-white/10"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
                }`}
              >
                <Compass className="h-4 w-4 stroke-[2]" />
                <span>Explore</span>
              </Link>

              {/* Messages */}
              <Link
                href="/messages"
                onClick={() => setActiveNav("messages")}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeNav === "messages"
                    ? "bg-[#18181f] text-white border border-white/10"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-4 w-4 stroke-[2]" />
                  <span>Messages</span>
                </div>
                <span className="bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  3
                </span>
              </Link>

              {/* Profile */}
              <Link
                href="/profile"
                onClick={() => setActiveNav("profile")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeNav === "profile"
                    ? "bg-[#18181f] text-white border border-white/10"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
                }`}
              >
                <UserIcon className="h-4 w-4 stroke-[2]" />
                <span>Profile</span>
              </Link>
            </nav>

            {/* 3. Categories Menu */}
            <div className="space-y-1 pt-1">
              <div className="px-3.5 pb-1 text-xs font-semibold text-zinc-400">
                Categories
              </div>

              {/* Live Now (Active category with purple left indicator) */}
              <button
                onClick={() => setActiveCategory("live-now")}
                className={`w-full relative flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeCategory === "live-now"
                    ? "bg-[#16161c] text-white border-l-2 border-purple-500 pl-3"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
                }`}
              >
                <Flame className="h-4 w-4 text-purple-400 fill-purple-400/30" />
                <span>Live Now</span>
              </button>

              {/* Discover */}
              <button
                onClick={() => setActiveCategory("discover")}
                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900/50 transition-all"
              >
                <Compass className="h-4 w-4 stroke-[1.8]" />
                <span>Discover</span>
              </button>

              {/* Trending */}
              <button
                onClick={() => setActiveCategory("trending")}
                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900/50 transition-all"
              >
                <TrendingUp className="h-4 w-4 stroke-[1.8]" />
                <span>Trending</span>
              </button>

              {/* Girls */}
              <button
                onClick={() => setActiveCategory("girls")}
                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900/50 transition-all"
              >
                <UserIcon className="h-4 w-4 stroke-[1.8]" />
                <span>Girls</span>
              </button>

              {/* Fitness */}
              <button
                onClick={() => setActiveCategory("fitness")}
                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900/50 transition-all"
              >
                <Dumbbell className="h-4 w-4 stroke-[1.8]" />
                <span>Fitness</span>
              </button>

              {/* Travel */}
              <button
                onClick={() => setActiveCategory("travel")}
                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900/50 transition-all"
              >
                <Plane className="h-4 w-4 stroke-[1.8]" />
                <span>Travel</span>
              </button>

              {/* Business */}
              <button
                onClick={() => setActiveCategory("business")}
                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900/50 transition-all"
              >
                <Briefcase className="h-4 w-4 stroke-[1.8]" />
                <span>Business</span>
              </button>

              {/* More */}
              <button
                onClick={() => setActiveCategory("more")}
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900/50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <LayoutGrid className="h-4 w-4 stroke-[1.8]" />
                  <span>More</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
              </button>
            </div>
          </div>

          {/* 4. Bottom Activity & Coins Cards */}
          <div className="space-y-2.5 pt-4">
            {/* "Your Activity" Card */}
            <div>
              <div className="px-3.5 pb-1.5 text-xs font-semibold text-zinc-400">
                Your Activity
              </div>
              <div className="rounded-2xl bg-[#111116] border border-zinc-800/80 p-3 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="relative shrink-0">
                    <img
                      src={
                        currentUser?.avatarUrl ||
                        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
                      }
                      alt="You"
                      className="h-8 w-8 rounded-full object-cover"
                    />
                    <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-1.5 ring-[#111116]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">You're live</p>
                    <p className="text-[10px] text-zinc-400 truncate">Your stream is going</p>
                    <p className="text-[9.5px] text-zinc-500">1.2k viewers</p>
                  </div>
                </div>

                <Link
                  href="/creator/studio"
                  className="w-full rounded-full border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 py-1 text-[11px] font-medium text-white flex items-center justify-center gap-1 transition-all"
                >
                  <span>Go to Stream</span>
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* Coins Balance Box */}
            <div className="rounded-2xl bg-[#111116] border border-zinc-800/80 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <span className="text-sm">🪙</span>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-400 font-medium">Coins</p>
                  <p className="text-xs font-bold text-white flex items-center gap-0.5">
                    <span>✦</span> 2,430
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsWalletOpen(true)}
                className="h-6 w-6 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center text-xs font-bold transition-all"
                title="Add Coins"
              >
                +
              </button>
            </div>
          </div>
        </aside>

        {/* ==================================================================== */}
        {/* MAIN CONTENT AREA                                                    */}
        {/* ==================================================================== */}
        <main className="flex-1 flex flex-col min-w-0 px-4 sm:px-6 lg:px-7 py-3 sm:py-4 space-y-4 pb-24 lg:pb-10">
          {/* Mobile Header (Mobile view only) */}
          <div className="lg:hidden flex items-center justify-between pb-1">
            <Link href="/">
              <span className="text-2xl font-bold tracking-tight text-white font-sans">
                Uber
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/discover" className="text-zinc-300 hover:text-white p-1">
                <Search className="h-5 w-5" />
              </Link>
              <Link href="/messages" className="text-zinc-300 hover:text-white p-1">
                <MessageSquare className="h-5 w-5" />
              </Link>
              <button
                onClick={() => setIsWalletOpen(true)}
                className="rounded-full bg-[#18181f] border border-zinc-700 px-3 py-1 text-xs font-semibold text-white"
              >
                ${currentUser?.walletBalance !== undefined ? currentUser.walletBalance : 0}
              </button>
            </div>
          </div>

          {/* Top Search & Header Bar (Desktop & Tablet) */}
          <div className="hidden lg:flex items-center justify-between gap-4">
            {/* Rounded Search Bar with Placeholder */}
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search creators, categories, or keywords..."
                className="w-full bg-[#111116] border border-zinc-800/80 rounded-full pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
              />
            </div>

            {/* Right Action Icons: Notification Bell, Chat, Profile Avatar */}
            <div className="flex items-center gap-3.5">
              {/* Notification Bell with red badge */}
              <Link
                href="/notifications"
                className="relative text-zinc-300 hover:text-white p-2 transition-colors"
                title="Notifications"
              >
                <Bell className="h-5 w-5 stroke-[1.8]" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500" />
              </Link>

              {/* Message Square */}
              <Link
                href="/messages"
                className="text-zinc-300 hover:text-white p-2 transition-colors"
                title="Messages"
              >
                <MessageSquare className="h-5 w-5 stroke-[1.8]" />
              </Link>

              {/* User Profile Avatar */}
              <Link
                href="/profile"
                className="relative shrink-0 ring-1 ring-zinc-700 rounded-full hover:ring-white transition-all"
              >
                <img
                  src={
                    currentUser?.avatarUrl ||
                    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
                  }
                  alt="Profile"
                  className="h-8 w-8 rounded-full object-cover"
                />
              </Link>
            </div>
          </div>

          {/* ================================================================== */}
          {/* HERO BANNER: "MADE FOR YOU"                                        */}
          {/* ================================================================== */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#101017] via-[#151421] to-[#22132d] border border-white/10 p-6 md:p-8 shadow-2xl min-h-[190px] md:min-h-[220px] flex flex-col justify-between">
            {/* Creator Photo on Right */}
            <div className="absolute right-0 top-0 bottom-0 w-3/5 md:w-1/2 overflow-hidden pointer-events-none">
              <img
                src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1000&auto=format&fit=crop&q=80"
                alt="Personalized Creator"
                className="h-full w-full object-cover object-right"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#101017] via-[#101017]/70 to-transparent" />
            </div>

            {/* Left Texts & Button */}
            <div className="relative z-10 space-y-2 max-w-sm">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white leading-[1.1]">
                Made For
                <br />
                You
              </h2>
              <p className="text-xs md:text-sm text-zinc-300 leading-relaxed font-normal">
                Personalized creators,
                <br />
                just for your taste.
              </p>

              <div className="pt-2">
                <Link
                  href="/discover"
                  className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-black/30 backdrop-blur-md px-4 py-1.5 text-xs font-medium text-white hover:bg-white/15 transition-all active:scale-95 shadow-sm"
                >
                  <span>Explore</span>
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />
                </Link>
              </div>
            </div>

            {/* Bottom Right: "Swipe for more" + 3 Dash Indicators */}
            <div className="relative z-10 self-end flex flex-col items-center gap-1">
              <span className="text-[10px] text-zinc-300 font-normal tracking-tight">
                Swipe for more
              </span>
              <div className="flex items-center gap-1">
                <span className="h-[3px] w-7 rounded-full bg-white shadow-sm" />
                <span className="h-[3px] w-2.5 rounded-full bg-zinc-600" />
                <span className="h-[3px] w-2.5 rounded-full bg-zinc-600" />
              </div>
            </div>
          </section>

          {/* ================================================================== */}
          {/* MAIN 2-COLUMN SECTION: LEFT FEED + RIGHT STREAMS                   */}
          {/* ================================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
            {/* ---------------------------------------------------------------- */}
            {/* LEFT FEED: STORY ROW + WHO TO FOLLOW (7 of 12 columns)            */}
            {/* ---------------------------------------------------------------- */}
            <div className="lg:col-span-7 space-y-5">
              {/* Quick Access / Story Cards (5 Perfectly Aligned Cards) */}
              <section className="grid grid-cols-5 gap-2.5 sm:gap-3">
                {/* 1. Discover New Creators */}
                <Link
                  href="/discover"
                  className="relative overflow-hidden flex flex-col items-start justify-between rounded-2xl bg-[#101015] border border-zinc-800/90 hover:border-white p-3 h-[142px] sm:h-[156px] w-full text-left transition-colors duration-200 active:scale-95 shadow-sm group before:absolute before:top-0 before:left-0 before:w-full before:h-full before:bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.04)_50%,transparent_75%)] before:pointer-events-none"
                >
                  {/* Top-Left: Plus in Circle */}
                  <div className="relative z-10 h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-zinc-900/90 border border-white/10 flex items-center justify-center text-white shadow-inner group-hover:scale-105 transition-transform">
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5 stroke-[2.5]" />
                  </div>

                  {/* Bottom: Left-aligned Text & Chevron */}
                  <div className="relative z-10 w-full text-left">
                    <div className="text-[11px] sm:text-xs font-semibold text-white leading-tight tracking-tight">
                      Discover
                      <br />
                      New Creators
                    </div>
                    <div className="flex items-center h-4 mt-1">
                      <ChevronRight className="h-3.5 w-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </Link>

                {/* 2. Live Now (Multi-color Story Ring with Large Avatar) */}
                <div
                  onClick={() => setActiveReelIndex(0)}
                  className="flex flex-col items-center justify-between rounded-2xl bg-[#0e0e13] border border-zinc-800/90 hover:border-white p-2 sm:p-3 h-[142px] sm:h-[156px] w-full text-center cursor-pointer transition-colors duration-200 active:scale-95 shadow-sm group"
                >
                  {/* Large Avatar with Multi-color Story Ring */}
                  <div className="relative rounded-full p-[2px] bg-gradient-to-tr from-[#3b82f6] via-[#ec4899] to-[#f43f5e] shadow-sm group-hover:scale-105 transition-transform shrink-0">
                    <img
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80"
                      alt="Live Now"
                      className="h-14 w-14 sm:h-16 sm:w-16 rounded-full object-cover ring-2 ring-[#0e0e13]"
                    />
                    {/* Green Online Dot */}
                    <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-[#22c55e] ring-2 ring-[#0e0e13]" />
                  </div>

                  {/* Text Block: Title (Single Line) + Subtitle (Single Line) */}
                  <div className="w-full text-center px-0.5">
                    <div className="flex items-center justify-center text-[11px] sm:text-xs md:text-[13px] font-bold text-white tracking-tight whitespace-nowrap h-5">
                      <svg
                        className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-red-500 mr-1 shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <circle cx="12" cy="12" r="9" />
                        <circle cx="12" cy="12" r="3.5" fill="currentColor" />
                      </svg>
                      <span className="whitespace-nowrap">Live Now</span>
                    </div>
                    <p className="text-[9.5px] sm:text-[10.5px] text-zinc-400 font-normal whitespace-nowrap h-4 leading-4 mt-0.5">
                      342 online
                    </p>
                  </div>
                </div>

                {/* 3. Top Rated (Warm Ring with Exactly Same Avatar Size) */}
                <div
                  onClick={() => setActiveReelIndex(1)}
                  className="flex flex-col items-center justify-between rounded-2xl bg-[#0e0e13] border border-zinc-800/90 hover:border-white p-2 sm:p-3 h-[142px] sm:h-[156px] w-full text-center cursor-pointer transition-colors duration-200 active:scale-95 shadow-sm group"
                >
                  <div className="relative rounded-full p-[2px] bg-gradient-to-tr from-amber-600/70 via-amber-400 to-amber-200 shadow-sm group-hover:scale-105 transition-transform shrink-0">
                    <img
                      src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&auto=format&fit=crop&q=80"
                      alt="Top Rated"
                      className="h-14 w-14 sm:h-16 sm:w-16 rounded-full object-cover ring-2 ring-[#0e0e13]"
                    />
                    <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-[#22c55e] ring-2 ring-[#0e0e13]" />
                  </div>

                  {/* Text Block: Title (Single Line) */}
                  <div className="w-full text-center px-0.5">
                    <div className="flex items-center justify-center gap-1 text-[11px] sm:text-xs md:text-[13px] font-bold text-white tracking-tight whitespace-nowrap h-5">
                      <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-[#c0d4ec] text-[#c0d4ec] shrink-0" />
                      <span className="whitespace-nowrap">Top Rated</span>
                    </div>
                    <p className="text-[9.5px] sm:text-[10.5px] text-zinc-400 font-normal whitespace-nowrap h-4 leading-4 mt-0.5">
                      Trending now
                    </p>
                  </div>
                </div>

                {/* 4. New (Silver Ring with Exactly Same Avatar Size) */}
                <div
                  onClick={() => setActiveReelIndex(2)}
                  className="flex flex-col items-center justify-between rounded-2xl bg-[#0e0e13] border border-zinc-800/90 hover:border-white p-2 sm:p-3 h-[142px] sm:h-[156px] w-full text-center cursor-pointer transition-colors duration-200 active:scale-95 shadow-sm group"
                >
                  <div className="relative rounded-full p-[2px] bg-gradient-to-tr from-zinc-500/70 via-zinc-300 to-white shadow-sm group-hover:scale-105 transition-transform shrink-0">
                    <img
                      src="https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=300&auto=format&fit=crop&q=80"
                      alt="New"
                      className="h-14 w-14 sm:h-16 sm:w-16 rounded-full object-cover ring-2 ring-[#0e0e13]"
                    />
                    <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-[#22c55e] ring-2 ring-[#0e0e13]" />
                  </div>

                  {/* Text Block: Title (Single Line) */}
                  <div className="w-full text-center px-0.5">
                    <div className="flex items-center justify-center gap-1 text-[11px] sm:text-xs md:text-[13px] font-bold text-white tracking-tight whitespace-nowrap h-5">
                      <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-[#c0d4ec] text-[#c0d4ec] shrink-0" />
                      <span className="whitespace-nowrap">New</span>
                    </div>
                    <p className="text-[9.5px] sm:text-[10.5px] text-zinc-400 font-normal whitespace-nowrap h-4 leading-4 mt-0.5">
                      Just joined
                    </p>
                  </div>
                </div>

                {/* 5. Categories (Single Line) */}
                <Link
                  href="/discover"
                  className="flex flex-col items-center justify-between rounded-2xl bg-[#0e0e13] border border-zinc-800/90 hover:border-white p-2 sm:p-3 h-[142px] sm:h-[156px] w-full text-center transition-colors duration-200 active:scale-95 shadow-sm group"
                >
                  <div className="h-13 w-13 sm:h-15 sm:w-15 md:h-16 md:w-16 flex items-center justify-center text-white group-hover:scale-105 transition-transform shrink-0">
                    <LayoutGrid className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 stroke-[1.8]" />
                  </div>

                  {/* Text Block: Title (Single Line) */}
                  <div className="w-full text-center px-0.5">
                    <div className="flex items-center justify-center text-[11px] sm:text-xs md:text-[13px] font-bold text-white tracking-tight whitespace-nowrap h-5">
                      <span className="whitespace-nowrap">Categories</span>
                    </div>
                    <div className="flex items-center justify-center h-4 mt-0.5">
                      <ChevronRight className="h-3.5 w-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </Link>
              </section>

              {/* Who To Follow Section */}
              <section className="space-y-3 pt-1">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    Who To Follow
                  </h2>
                  <Link
                    href="/following"
                    className="flex items-center gap-0.5 text-xs text-zinc-400 hover:text-white transition-colors"
                  >
                    <span>See all</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <div className="space-y-2.5">
                  {DEFAULT_WHO_TO_FOLLOW.map((creator) => {
                    const isFollowing = Boolean(followingMap[creator.id]);

                    return (
                      <div
                        key={creator.id}
                        className="flex items-center justify-between rounded-2xl bg-[#111116] border border-zinc-800/80 p-3 hover:border-zinc-700 transition-all"
                      >
                        {/* Avatar + Info */}
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <Link
                            href={`/creator/${creator.username}`}
                            className="relative shrink-0"
                          >
                            <img
                              src={creator.avatarUrl}
                              alt={creator.displayName}
                              className="h-11 w-11 rounded-full object-cover ring-1 ring-zinc-700"
                            />
                            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[#111116]" />
                          </Link>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-sm text-white truncate">
                                {creator.displayName}
                              </span>
                              {creator.isVerified && <VerifiedBadge size={13} />}
                            </div>
                            <p className="text-[11px] text-zinc-400 truncate">
                              @{creator.username}
                            </p>
                            <p className="text-[10.5px] text-zinc-500 truncate pt-0.5">
                              {creator.bio}
                            </p>
                          </div>
                        </div>

                        {/* Follow Button + Chevron */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => toggleFollow(creator.id)}
                            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                              isFollowing
                                ? "bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700"
                                : "bg-white text-zinc-950 hover:bg-zinc-200 shadow-sm"
                            }`}
                          >
                            {isFollowing ? "Following" : "Follow"}
                          </button>
                          <ChevronRight className="h-4 w-4 text-zinc-500" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* RIGHT SIDEBAR: "STREAMS YOU MIGHT LIKE" (5 of 12 columns)         */}
            {/* ---------------------------------------------------------------- */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    Streams You Might Like
                  </h2>
                  <button
                    onClick={handleRefreshStreams}
                    className="text-zinc-400 hover:text-white transition-transform active:rotate-180 p-0.5"
                    title="Refresh Streams"
                  >
                    <RotateCw
                      className={`h-3.5 w-3.5 ${
                        isRefreshingStreams ? "animate-spin text-blue-400" : ""
                      }`}
                    />
                  </button>
                </div>

                <Link
                  href="/live"
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              {/* 6 Streams Stacked Vertically */}
              <div className="space-y-2.5">
                {DEFAULT_STREAMS.map((stream) => (
                  <div
                    key={stream.id}
                    className="flex items-center justify-between rounded-2xl bg-[#111116] border border-zinc-800/80 p-2.5 hover:border-zinc-700 transition-all gap-3"
                  >
                    {/* Thumbnail */}
                    <Link
                      href={`/live/${stream.creatorId}`}
                      className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-zinc-900 group"
                    >
                      <img
                        src={stream.streamPreviewUrl}
                        alt={stream.displayName}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {/* LIVE Badge */}
                      <span className="absolute top-1 left-1 rounded bg-rose-600 px-1 py-0.2 text-[8.5px] font-extrabold text-white uppercase tracking-wider">
                        LIVE
                      </span>
                      {/* Viewer Count */}
                      <div className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-black/70 backdrop-blur-xs px-1.5 py-0.5 text-[9.5px] font-semibold text-white">
                        <Users className="h-2.5 w-2.5" />
                        <span>{stream.viewerCount}</span>
                      </div>
                    </Link>

                    {/* Creator Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-sm text-white truncate">
                          {stream.displayName}
                        </span>
                        {stream.isVerified && <VerifiedBadge size={13} />}
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate">
                        @{stream.username}
                      </p>
                      <p className="text-[10.5px] text-zinc-500 truncate pt-0.5">
                        {stream.tags}
                      </p>
                    </div>

                    {/* Watch Button */}
                    <Link
                      href={`/live/${stream.creatorId}`}
                      className="shrink-0 rounded-full border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 active:scale-95 px-4 py-1.5 text-xs font-semibold text-white transition-all shadow-sm"
                    >
                      Watch
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Wallet Modal */}
      <WalletModal isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} />
    </div>
  );
}
