"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Heart,
  MessageCircle,
  Gift,
  Sparkles,
  MoreHorizontal,
  Search,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  ShieldCheck,
  Coins,
  Send,
  Radio,
  Flame,
  UserCheck,
  Lock,
  Plus,
} from "lucide-react";
import { useUser } from "@/lib/user-context";
import { LiveStreamCanvas } from "./LiveStreamCanvas";
import { FloatingHearts } from "./FloatingHearts";
import { ChatDrawer } from "./drawers/ChatDrawer";
import { GiftingDrawer, MenuItem } from "./drawers/GiftingDrawer";
import { MarketplaceDrawer, PPVItem } from "./drawers/MarketplaceDrawer";
import { InteractionDrawer } from "./drawers/InteractionDrawer";
import { MoreOptionsDrawer } from "./drawers/MoreOptionsDrawer";
import { CreatorProfileDrawer } from "./drawers/CreatorProfileDrawer";
import { SearchDrawer } from "./drawers/SearchDrawer";
import { WalletModal } from "@/components/wallet/WalletModal";
import { ReportModal } from "@/components/trust/ReportModal";
import { TipAlertOverlay } from "@/components/consumer/TipAlertOverlay";

export interface CreatorStream {
  id: string;
  bio: string | null;
  streamTitle: string;
  isLive: boolean;
  viewerCount: number;
  tags: string;
  currentGoalTitle: string;
  currentGoalTarget: number;
  currentGoalProgress: number;
  isPrivateShow: boolean;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    kycStatus: string;
  };
  interactionItems?: MenuItem[];
  ppvContents?: PPVItem[];
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

export function LiveDiscoveryMachine() {
  const { currentUser, updateBalance } = useUser();

  // Streams list & active index
  const [streams, setStreams] = useState<CreatorStream[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Active top navigation tab
  const [activeTab, setActiveTab] = useState<"following" | "live" | "explore">("live");

  // Filtering & search
  const [selectedTag, setSelectedTag] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Real-time reactions & audio
  const [isMuted, setIsMuted] = useState(true);
  const [likesCount, setLikesCount] = useState<Record<string, number>>({});
  const [heartTrigger, setHeartTrigger] = useState(0);
  const [followedCreators, setFollowedCreators] = useState<Set<string>>(new Set());

  // Bottom quick input
  const [quickMessage, setQuickMessage] = useState("");

  // Drawers / Progressive Disclosure Modals
  const [activeDrawer, setActiveDrawer] = useState<
    "none" | "chat" | "gifting" | "marketplace" | "interaction" | "more" | "profile" | "search"
  >("none");
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Swipe gesture handling
  const touchStartY = useRef<number | null>(null);
  const isScrolling = useRef(false);

  // Fetch live streams from API
  useEffect(() => {
    setIsLoading(true);
    const tagParam = selectedTag === "All" ? "" : `tag=${encodeURIComponent(selectedTag)}`;
    const queryParam = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : "";

    fetch(`/api/creators?${tagParam}${queryParam}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.creators && data.creators.length > 0) {
          setStreams(data.creators);
          setCurrentIndex(0);
        } else {
          setStreams([]);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [selectedTag, searchQuery]);

  const currentStream = streams[currentIndex] || null;

  // Stream full detailed data (PPVs, interactions) when switching
  useEffect(() => {
    if (!currentStream) return;

    fetch(`/api/creators/${currentStream.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.creator) {
          setStreams((prev) =>
            prev.map((s) => (s.id === data.creator.id ? { ...s, ...data.creator } : s))
          );
        }
      })
      .catch(() => {});
  }, [currentStream?.id]);

  // Navigation handlers
  const goToNextStream = useCallback(() => {
    if (currentIndex < streams.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setActiveDrawer("none");
    }
  }, [currentIndex, streams.length]);

  const goToPrevStream = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setActiveDrawer("none");
    }
  }, [currentIndex]);

  // Touch gesture handlers for mobile vertical swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY.current - touchEndY;
    const SWIPE_THRESHOLD = 50;

    if (diff > SWIPE_THRESHOLD) {
      // Swipe Up -> Next Stream
      goToNextStream();
    } else if (diff < -SWIPE_THRESHOLD) {
      // Swipe Down -> Prev Stream
      goToPrevStream();
    }
    touchStartY.current = null;
  };

  // Mouse wheel navigation with debounce
  const handleWheel = (e: React.WheelEvent) => {
    if (isScrolling.current || activeDrawer !== "none") return;

    if (Math.abs(e.deltaY) > 40) {
      isScrolling.current = true;
      if (e.deltaY > 0) {
        goToNextStream();
      } else {
        goToPrevStream();
      }
      setTimeout(() => {
        isScrolling.current = false;
      }, 600);
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeDrawer !== "none" || (e.target as HTMLElement).tagName === "INPUT") {
        if (e.key === "Escape") setActiveDrawer("none");
        return;
      }

      switch (e.key) {
        case "ArrowDown":
        case "j":
          goToNextStream();
          break;
        case "ArrowUp":
        case "k":
          goToPrevStream();
          break;
        case "m":
        case "M":
          setIsMuted((prev) => !prev);
          break;
        case "l":
        case "L":
          handleLike();
          break;
        case "c":
        case "C":
          setActiveDrawer("chat");
          break;
        case "g":
        case "G":
          setActiveDrawer("gifting");
          break;
        case "d":
        case "D":
          setActiveDrawer("marketplace");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeDrawer, goToNextStream, goToPrevStream]);

  // Like interaction handler
  const handleLike = () => {
    if (!currentStream) return;
    setLikesCount((prev) => ({
      ...prev,
      [currentStream.id]: (prev[currentStream.id] || 1420) + 1,
    }));
    setHeartTrigger((prev) => prev + 1);
  };

  // Follow toggle handler
  const handleToggleFollow = (creatorId: string) => {
    setFollowedCreators((prev) => {
      const next = new Set(prev);
      if (next.has(creatorId)) {
        next.delete(creatorId);
      } else {
        next.add(creatorId);
      }
      return next;
    });
  };

  // Quick message sender
  const handleSendQuickMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickMessage.trim() || !currentStream) return;

    const textToSend = quickMessage.trim();
    setQuickMessage("");

    try {
      await fetch(`/api/realtime/${currentStream.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: currentUser.id,
          text: textToSend,
        }),
      });
      // Pop open chat drawer to continue conversation
      setActiveDrawer("chat");
    } catch {
      // Handled
    }
  };

  const currentLikes = currentStream
    ? likesCount[currentStream.id] || currentStream.viewerCount * 6 + 120
    : 0;
  const isFollowingCurrent = currentStream
    ? followedCreators.has(currentStream.id)
    : false;

  const currentTags = currentStream?.tags
    ? currentStream.tags.split(",").map((t) => t.trim())
    : ["live", "interactive"];

  return (
    <div
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative h-[100dvh] w-full select-none overflow-hidden bg-black text-white flex items-center justify-center"
    >
      {/* Real-time Tip Alerts Toast Overlay */}
      {currentStream && <TipAlertOverlay creatorId={currentStream.id} />}

      {/* Floating Hearts Particle Container */}
      <FloatingHearts triggerKey={heartTrigger} />

      {/* Main Feed Container (Full width/height on Mobile, Centered Phone aspect canvas on Desktop) */}
      <div className="relative h-full w-full sm:max-w-[480px] sm:h-[94vh] sm:rounded-3xl sm:border sm:border-zinc-800/80 sm:shadow-[0_0_80px_rgba(0,0,0,0.9)] overflow-hidden bg-zinc-950 flex flex-col justify-between">
        {/* ==================================================================== */}
        {/* 1. BACKGROUND VIDEO STREAM CANVAS */}
        {/* ==================================================================== */}
        {isLoading ? (
          <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-950">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
            <p className="mt-3 text-xs font-semibold text-zinc-400 animate-pulse">
              Connecting to Live Stream Network...
            </p>
          </div>
        ) : !currentStream ? (
          <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-950 p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-900 text-zinc-500 mb-4">
              <Radio className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-white">No Live Streams Found</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs">
              Try switching your category filter or clearing your search.
            </p>
            <button
              onClick={() => {
                setSelectedTag("All");
                setSearchQuery("");
              }}
              className="mt-4 rounded-xl bg-pink-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-pink-600/30"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="absolute inset-0 z-0">
            <LiveStreamCanvas
              posterUrl={currentStream.user.avatarUrl || undefined}
              creatorName={currentStream.user.displayName}
              isLive={currentStream.isLive}
              isPrivateShow={currentStream.isPrivateShow}
              onDoubleTapLike={handleLike}
              isMuted={isMuted}
              onToggleMute={() => setIsMuted(!isMuted)}
            />
          </div>
        )}

        {/* ==================================================================== */}
        {/* 2. TOP TINY BRAND & NAVIGATION LAYER */}
        {/* ==================================================================== */}
        <div className="relative z-20 flex items-center justify-between px-4 pt-4 pb-2 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          {/* Brand & Tabs */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-black text-sm tracking-tight text-white drop-shadow-md">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-tr from-pink-600 to-amber-400 text-white shadow-md shadow-pink-600/30">
                <Flame className="h-3.5 w-3.5" />
              </span>
              <span className="hidden sm:inline">AuraLive</span>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 text-xs font-bold">
              <button
                onClick={() => setActiveTab("following")}
                className={`transition-colors drop-shadow-md ${
                  activeTab === "following" ? "text-white font-black" : "text-zinc-400 hover:text-white"
                }`}
              >
                Following
              </button>
              <span className="text-zinc-600">•</span>
              <button
                onClick={() => setActiveTab("live")}
                className={`relative transition-colors drop-shadow-md ${
                  activeTab === "live"
                    ? "text-white font-black"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <span>LIVE</span>
                {activeTab === "live" && (
                  <span className="absolute -bottom-1 left-1/2 h-0.5 w-3 -translate-x-1/2 rounded-full bg-pink-500 shadow-[0_0_8px_#ec4899]" />
                )}
              </button>
              <span className="text-zinc-600">•</span>
              <button
                onClick={() => setActiveTab("explore")}
                className={`transition-colors drop-shadow-md ${
                  activeTab === "explore" ? "text-white font-black" : "text-zinc-400 hover:text-white"
                }`}
              >
                Explore
              </button>
            </div>
          </div>

          {/* Right Action Icons: Search, Wallet, Sound */}
          <div className="flex items-center gap-2">
            {/* Search Trigger */}
            <button
              onClick={() => setActiveDrawer("search")}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-zinc-300 backdrop-blur-md hover:bg-black/60 hover:text-white transition-all border border-white/10"
              title="Search and Filters"
            >
              <Search className="h-3.5 w-3.5" />
            </button>

            {/* Wallet Token Pill */}
            <button
              onClick={() => setIsWalletOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold text-amber-400 backdrop-blur-md border border-amber-500/30 hover:border-amber-400 transition-all shadow-sm"
              title="Wallet Tokens"
            >
              <Coins className="h-3.5 w-3.5" />
              <span>{currentUser.walletBalance.toLocaleString()}</span>
            </button>

            {/* Sound Toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-zinc-300 backdrop-blur-md hover:bg-black/60 hover:text-white transition-all border border-white/10"
              title={isMuted ? "Unmute stream" : "Mute stream"}
            >
              {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5 text-pink-400" />}
            </button>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 3. MIDDLE OVERLAY: STREAM BADGES & DESKTOP NAV CONTROLS */}
        {/* ==================================================================== */}
        <div className="relative z-20 flex-1 flex flex-col justify-between pointer-events-none p-4">
          {/* Top-Left Live Status & Viewer Count */}
          {currentStream && (
            <div className="flex items-center gap-2 pointer-events-auto">
              <span className="flex items-center gap-1.5 rounded-full bg-rose-600/90 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-black text-white shadow-lg shadow-rose-600/40">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                LIVE
              </span>
              <span className="flex items-center gap-1 rounded-full bg-black/50 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-bold text-zinc-200 border border-white/10">
                {currentStream.viewerCount.toLocaleString()} Viewers
              </span>
              <span className="flex items-center gap-1 rounded-full bg-black/50 backdrop-blur-md px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="h-3 w-3" />
                2257
              </span>
            </div>
          )}

          {/* Desktop Stream Switch Arrows */}
          <div className="hidden sm:flex flex-col items-end gap-2 pointer-events-auto self-end">
            <button
              onClick={goToPrevStream}
              disabled={currentIndex === 0}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md border border-white/10 hover:bg-black/80 disabled:opacity-30 transition-all"
              title="Previous Stream (Up Arrow)"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              onClick={goToNextStream}
              disabled={currentIndex === streams.length - 1}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md border border-white/10 hover:bg-black/80 disabled:opacity-30 transition-all"
              title="Next Stream (Down Arrow)"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 4. RIGHT-SIDE VERTICALLY STACKED INTERACTION CONTROLS */}
        {/* ==================================================================== */}
        {currentStream && (
          <div className="absolute right-3 bottom-20 z-30 flex flex-col items-center gap-3.5 pointer-events-auto">
            {/* Creator Avatar with Mini Follow Indicator */}
            <div className="relative mb-1 flex flex-col items-center">
              <button
                onClick={() => setActiveDrawer("profile")}
                className="relative group"
                title="View Creator Profile"
              >
                <img
                  src={
                    currentStream.user.avatarUrl ||
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                  }
                  alt={currentStream.user.displayName}
                  className="h-11 w-11 rounded-full object-cover ring-2 ring-pink-500 shadow-lg group-hover:scale-105 transition-transform"
                />
                <span className="absolute -bottom-0.5 right-0 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-black" />
              </button>

              {/* Follow Button */}
              {!isFollowingCurrent && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFollow(currentStream.id);
                  }}
                  className="absolute -bottom-2 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-tr from-pink-600 to-rose-500 text-white shadow-md shadow-pink-600/40 hover:scale-110 active:scale-90 transition-transform"
                  title="Follow Creator"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* ❤️ LIKE CONTROL */}
            <button
              onClick={handleLike}
              className="group flex flex-col items-center gap-1 text-white hover:scale-110 active:scale-90 transition-transform"
              title="Send Love (Tap / Double-tap)"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white shadow-lg group-hover:border-pink-500/50 group-hover:text-pink-400">
                <Heart className="h-5 w-5 fill-rose-500 text-rose-500 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-[11px] font-extrabold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {currentLikes > 999 ? `${(currentLikes / 1000).toFixed(1)}k` : currentLikes}
              </span>
            </button>

            {/* 💬 CHAT / COMMENTS CONTROL */}
            <button
              onClick={() => setActiveDrawer("chat")}
              className="group flex flex-col items-center gap-1 text-white hover:scale-110 active:scale-90 transition-transform"
              title="Open Live Chat"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white shadow-lg group-hover:border-pink-500/50 group-hover:text-pink-300">
                <MessageCircle className="h-5 w-5" />
              </div>
              <span className="text-[11px] font-extrabold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {currentStream.viewerCount}
              </span>
            </button>

            {/* 🎁 GIFT / TIP MENU CONTROL */}
            <button
              onClick={() => setActiveDrawer("gifting")}
              className="group flex flex-col items-center gap-1 text-white hover:scale-110 active:scale-90 transition-transform"
              title="Send Gifts & Actions"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-pink-600/80 to-amber-500/80 backdrop-blur-md border border-amber-400/40 text-amber-300 shadow-lg shadow-pink-600/20 group-hover:scale-105">
                <Gift className="h-5 w-5" />
              </div>
              <span className="text-[11px] font-extrabold text-amber-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                Gift
              </span>
            </button>

            {/* 💎 MARKETPLACE / PPV VAULT CONTROL */}
            <button
              onClick={() => setActiveDrawer("marketplace")}
              className="group flex flex-col items-center gap-1 text-white hover:scale-110 active:scale-90 transition-transform"
              title="Exclusive PPV Vault & Store"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-pink-400 shadow-lg group-hover:border-pink-500/50 group-hover:scale-105">
                <Sparkles className="h-5 w-5" />
              </div>
              <span className="text-[11px] font-extrabold text-pink-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                Vault
              </span>
            </button>

            {/* ⋯ MORE ACTIONS CONTROL */}
            <button
              onClick={() => setActiveDrawer("more")}
              className="group flex flex-col items-center gap-1 text-white hover:scale-110 active:scale-90 transition-transform"
              title="Stream Settings & Safety"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-zinc-300 shadow-lg group-hover:border-white/30">
                <MoreHorizontal className="h-4 w-4" />
              </div>
            </button>
          </div>
        )}

        {/* ==================================================================== */}
        {/* 5. BOTTOM CREATOR IDENTITY & CONTEXT OVERLAY */}
        {/* ==================================================================== */}
        {currentStream && (
          <div className="relative z-20 px-4 pb-3 pt-6 bg-gradient-to-t from-black/95 via-black/60 to-transparent">
            {/* Creator Identity Row */}
            <div className="max-w-[76%] space-y-1.5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveDrawer("profile")}
                  className="font-black text-sm text-white hover:text-pink-400 transition-colors drop-shadow-md truncate"
                >
                  {currentStream.user.displayName}
                </button>
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400 border border-emerald-500/40">
                  <ShieldCheck className="h-2.5 w-2.5" />
                  2257
                </span>
              </div>

              {/* Stream Title / Context */}
              <p className="text-xs text-zinc-200 line-clamp-2 leading-relaxed drop-shadow-sm font-medium">
                {currentStream.streamTitle}
              </p>

              {/* Live Goal Snippet Badge (Tap opens Interaction Goal Drawer) */}
              <button
                onClick={() => setActiveDrawer("interaction")}
                className="flex items-center gap-1.5 rounded-full bg-zinc-900/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-amber-300 border border-amber-500/30 hover:border-amber-400 transition-all max-w-full"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="truncate">
                  🎯 {currentStream.currentGoalTitle} [
                  {Math.round(
                    (currentStream.currentGoalProgress / (currentStream.currentGoalTarget || 1)) * 100
                  )}
                  %]
                </span>
              </button>

              {/* Category Tags */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {currentTags.map((tag) => (
                  <span
                    key={tag}
                    onClick={() => {
                      setSelectedTag(tag);
                    }}
                    className="cursor-pointer text-[10px] font-semibold text-zinc-400 hover:text-pink-400"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* ================================================================ */}
            {/* 6. BOTTOM INTERACTIVE BAR */}
            {/* ================================================================ */}
            <div className="mt-3 flex items-center gap-2 pt-2 border-t border-white/10">
              {/* Quick Chat Input / “Ask a question” */}
              <form onSubmit={handleSendQuickMessage} className="relative flex-1">
                <input
                  type="text"
                  value={quickMessage}
                  onChange={(e) => setQuickMessage(e.target.value)}
                  placeholder="Ask a question or say something..."
                  className="w-full rounded-full bg-black/60 pl-4 pr-9 py-2 text-xs text-white placeholder-zinc-400 backdrop-blur-md border border-white/15 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500 transition-all"
                />
                <button
                  type="submit"
                  disabled={!quickMessage.trim()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-pink-600 text-white disabled:opacity-30 hover:bg-pink-500 transition-colors"
                >
                  <Send className="h-3 w-3" />
                </button>
              </form>

              {/* “Interact” Button */}
              <button
                onClick={() => setActiveDrawer("interaction")}
                className="flex items-center gap-1 rounded-full bg-gradient-to-r from-pink-600 via-rose-600 to-amber-500 px-3 py-2 text-xs font-bold text-white shadow-md shadow-pink-600/30 hover:opacity-95 active:scale-95 transition-all shrink-0"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Interact</span>
              </button>

              {/* Quick 1-Tap 10 Tokens Tip Button */}
              <button
                onClick={() => {
                  if (currentUser.walletBalance < 10) {
                    setIsWalletOpen(true);
                  } else {
                    updateBalance(currentUser.walletBalance - 10);
                    setHeartTrigger((prev) => prev + 1);
                  }
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30 hover:scale-110 active:scale-90 transition-all shrink-0"
                title="Send 10 Tokens Instant Cheer"
              >
                <Coins className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* 7. PROGRESSIVE DISCLOSURE DRAWERS (Rendered on demand) */}
      {/* ==================================================================== */}
      {currentStream && (
        <>
          {/* Live Chat Drawer */}
          <ChatDrawer
            isOpen={activeDrawer === "chat"}
            onClose={() => setActiveDrawer("none")}
            creatorId={currentStream.id}
            creatorName={currentStream.user.displayName}
            onOpenGiftDrawer={() => setActiveDrawer("gifting")}
          />

          {/* Interactive Gifting Drawer */}
          <GiftingDrawer
            isOpen={activeDrawer === "gifting"}
            onClose={() => setActiveDrawer("none")}
            creatorId={currentStream.id}
            creatorName={currentStream.user.displayName}
            menuItems={currentStream.interactionItems || []}
            onOpenWalletModal={() => {
              setActiveDrawer("none");
              setIsWalletOpen(true);
            }}
            onTipSent={() => setHeartTrigger((prev) => prev + 1)}
          />

          {/* PPV Media Vault & Marketplace Drawer */}
          <MarketplaceDrawer
            isOpen={activeDrawer === "marketplace"}
            onClose={() => setActiveDrawer("none")}
            creatorId={currentStream.id}
            creatorName={currentStream.user.displayName}
            ppvItems={currentStream.ppvContents || []}
            onOpenWalletModal={() => {
              setActiveDrawer("none");
              setIsWalletOpen(true);
            }}
          />

          {/* Live Goal & Community Milestone Drawer */}
          <InteractionDrawer
            isOpen={activeDrawer === "interaction"}
            onClose={() => setActiveDrawer("none")}
            creatorId={currentStream.id}
            creatorName={currentStream.user.displayName}
            goalTitle={currentStream.currentGoalTitle}
            goalProgress={currentStream.currentGoalProgress}
            goalTarget={currentStream.currentGoalTarget}
            onOpenGiftDrawer={() => setActiveDrawer("gifting")}
            onOpenWalletModal={() => {
              setActiveDrawer("none");
              setIsWalletOpen(true);
            }}
          />

          {/* Stream Settings, 2257 Compliance, Quality Drawer */}
          <MoreOptionsDrawer
            isOpen={activeDrawer === "more"}
            onClose={() => setActiveDrawer("none")}
            creatorId={currentStream.id}
            creatorName={currentStream.user.displayName}
            onOpenReportModal={() => {
              setActiveDrawer("none");
              setIsReportOpen(true);
            }}
          />

          {/* Creator Profile Detail Drawer */}
          <CreatorProfileDrawer
            isOpen={activeDrawer === "profile"}
            onClose={() => setActiveDrawer("none")}
            creatorId={currentStream.id}
            creatorName={currentStream.user.displayName}
            username={currentStream.user.username}
            avatarUrl={currentStream.user.avatarUrl || undefined}
            bio={currentStream.bio}
            viewerCount={currentStream.viewerCount}
            tags={currentTags}
            isFollowing={isFollowingCurrent}
            onToggleFollow={() => handleToggleFollow(currentStream.id)}
            onOpenGiftDrawer={() => setActiveDrawer("gifting")}
            onOpenMarketplace={() => setActiveDrawer("marketplace")}
          />
        </>
      )}

      {/* Global Search & Category Discovery Drawer */}
      <SearchDrawer
        isOpen={activeDrawer === "search"}
        onClose={() => setActiveDrawer("none")}
        selectedTag={selectedTag}
        onSelectTag={setSelectedTag}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categoryTags={CATEGORY_TAGS}
      />

      {/* Wallet Modal */}
      <WalletModal isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} />

      {/* Report Modal */}
      {currentStream && (
        <ReportModal
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          creatorId={currentStream.id}
          creatorName={currentStream.user.displayName}
        />
      )}
    </div>
  );
}
