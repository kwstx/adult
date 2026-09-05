"use client";

import React, { useState, useEffect } from "react";
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
  Radio,
  Flame,
  UserCheck,
  Plus,
  Zap,
  Send,
} from "lucide-react";
import { useUser } from "@/lib/user-context";
import { useLiveFeedController } from "@/hooks/useLiveFeedController";
import { LiveStreamCanvas } from "./LiveStreamCanvas";
import { FloatingHearts } from "./FloatingHearts";
import { ChatDrawer } from "./drawers/ChatDrawer";
import { GiftingDrawer } from "./drawers/GiftingDrawer";
import { MarketplaceDrawer } from "./drawers/MarketplaceDrawer";
import { InteractionDrawer } from "./drawers/InteractionDrawer";
import { MoreOptionsDrawer } from "./drawers/MoreOptionsDrawer";
import { CreatorProfileDrawer } from "./drawers/CreatorProfileDrawer";
import { SearchDrawer } from "./drawers/SearchDrawer";
import { WalletModal } from "@/components/wallet/WalletModal";
import { ReportModal } from "@/components/trust/ReportModal";
import { TipAlertOverlay } from "@/components/consumer/TipAlertOverlay";

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

interface LiveFeedSlidingWindowProps {
  initialCreatorId?: string;
}

export function LiveFeedSlidingWindow({ initialCreatorId }: LiveFeedSlidingWindowProps) {
  const { currentUser } = useUser();

  // Category filter state
  const [selectedTag, setSelectedTag] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"following" | "live" | "explore">("live");

  // Interactive overlays state
  const [activeDrawer, setActiveDrawer] = useState<
    "none" | "chat" | "gifting" | "marketplace" | "interaction" | "more" | "profile" | "search"
  >("none");
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Likes & reactions state
  const [likesMap, setLikesMap] = useState<Record<string, number>>({});
  const [heartTrigger, setHeartTrigger] = useState(0);
  const [followedMap, setFollowedMap] = useState<Record<string, boolean>>({});
  const [quickMessage, setQuickMessage] = useState("");

  // Initialize the sliding window live feed controller
  const {
    candidates,
    currentIndex,
    slidingWindow,
    currentCandidate,
    nextCandidate,
    previousCandidate,
    isLoading,
    isMuted,
    toggleMute,
    dragOffsetY,
    goToNextStream,
    goToPrevStream,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleWheel,
    telemetry,
  } = useLiveFeedController({
    userId: currentUser.id,
    initialCreatorId,
    categoryTag: selectedTag,
    costTier: "BALANCED",
  });

  // Sync follow state map from candidate metadata
  useEffect(() => {
    if (candidates.length > 0) {
      const followState: Record<string, boolean> = {};
      candidates.forEach((c) => {
        if (followedMap[c.id] === undefined) {
          followState[c.id] = c.userRelationship.isFollowing;
        }
      });
      setFollowedMap((prev) => ({ ...followState, ...prev }));
    }
  }, [candidates, followedMap]);

  // Keyboard Shortcuts (Arrow keys, J/K, M, L, F, C, G)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeDrawer !== "none" || (e.target as HTMLElement).tagName === "INPUT") {
        if (e.key === "Escape") setActiveDrawer("none");
        return;
      }

      switch (e.key) {
        case "ArrowDown":
        case "j":
        case "J":
          goToNextStream();
          break;
        case "ArrowUp":
        case "k":
        case "K":
          goToPrevStream();
          break;
        case "m":
        case "M":
          toggleMute();
          break;
        case "l":
        case "L":
          handleLike();
          break;
        case "f":
        case "F":
          if (currentCandidate) handleToggleFollow(currentCandidate.id);
          break;
        case "c":
        case "C":
          if (currentCandidate) {
            telemetry.trackChatOpen(currentCandidate.id);
            setActiveDrawer("chat");
          }
          break;
        case "g":
        case "G":
          if (currentCandidate) {
            telemetry.trackInteractionMenuOpen(currentCandidate.id);
            setActiveDrawer("gifting");
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeDrawer, goToNextStream, goToPrevStream, toggleMute, currentCandidate, telemetry]);

  // Like cheer action
  const handleLike = () => {
    if (!currentCandidate) return;
    setLikesMap((prev) => ({
      ...prev,
      [currentCandidate.id]:
        (prev[currentCandidate.id] || currentCandidate.popularitySignals.trendingScore) + 1,
    }));
    setHeartTrigger((prev) => prev + 1);
    telemetry.trackLike(currentCandidate.id);
  };

  // Follow toggle action
  const handleToggleFollow = (creatorId: string) => {
    const isNowFollowing = !followedMap[creatorId];
    setFollowedMap((prev) => ({
      ...prev,
      [creatorId]: isNowFollowing,
    }));
    telemetry.trackFollow(creatorId, isNowFollowing);
  };

  // Quick Chat Send
  const handleSendQuickMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickMessage.trim() || !currentCandidate) return;

    const textToSend = quickMessage.trim();
    setQuickMessage("");

    try {
      await fetch(`/api/realtime/${currentCandidate.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: currentUser.id,
          text: textToSend,
        }),
      });
      telemetry.trackChatOpen(currentCandidate.id);
      setActiveDrawer("chat");
    } catch {
      // Ignored
    }
  };

  const isFollowingCurrent = currentCandidate ? Boolean(followedMap[currentCandidate.id]) : false;
  const currentLikes = currentCandidate
    ? likesMap[currentCandidate.id] || currentCandidate.popularitySignals.trendingScore
    : 0;

  return (
    <div
      onWheel={activeDrawer === "none" ? handleWheel : undefined}
      onTouchStart={activeDrawer === "none" ? handleTouchStart : undefined}
      onTouchMove={activeDrawer === "none" ? handleTouchMove : undefined}
      onTouchEnd={activeDrawer === "none" ? handleTouchEnd : undefined}
      className="relative h-[100dvh] w-full select-none overflow-hidden bg-black text-white flex items-center justify-center"
    >
      {/* Real-time Floating Tip Overlay */}
      {currentCandidate && <TipAlertOverlay creatorId={currentCandidate.id} />}

      {/* Floating Hearts Particle System */}
      <FloatingHearts triggerKey={heartTrigger} />

      {/* Main Viewport Container */}
      <div className="relative h-full w-full sm:max-w-[480px] sm:h-[94vh] sm:rounded-3xl sm:border sm:border-zinc-800/80 sm:shadow-[0_0_80px_rgba(0,0,0,0.9)] overflow-hidden bg-zinc-950 flex flex-col justify-between">
        
        {/* ==================================================================== */}
        {/* 1. 3-SLOT SLIDING WINDOW (Previous: Z, Current: A, Next: B)           */}
        {/* ==================================================================== */}
        {isLoading ? (
          <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-950">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-pink-500 border-t-transparent shadow-[0_0_20px_rgba(236,72,153,0.5)]" />
            <p className="mt-4 text-xs font-bold text-zinc-400 animate-pulse tracking-wide">
              Connecting to Live Feed State Machine...
            </p>
          </div>
        ) : !currentCandidate ? (
          <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-950 p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-900 text-zinc-500 mb-4 ring-1 ring-zinc-800">
              <Radio className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-white">No Live Streams Found</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs leading-relaxed">
              Try switching your category filter or explore new trending creators.
            </p>
            <button
              onClick={() => setSelectedTag("All")}
              className="mt-5 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-pink-600/30 hover:scale-105 transition-transform"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div
            className="absolute inset-0 z-0 transition-transform duration-300 ease-out will-change-transform"
            style={{
              transform: `translate3d(0, ${dragOffsetY}px, 0)`,
            }}
          >
            {/* ---------------------------------------------------------------- */}
            {/* SLOT 0: PREVIOUS ITEM (Creator Z) - Positioned at -100% (Suspended) */}
            {/* ---------------------------------------------------------------- */}
            {previousCandidate && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ transform: "translate3d(0, -100%, 0)" }}
              >
                <LiveStreamCanvas
                  posterUrl={previousCandidate.stream.posterUrl || undefined}
                  creatorName={previousCandidate.creator.displayName}
                  isLive={previousCandidate.stream.isLive}
                  isPrivateShow={previousCandidate.stream.isPrivateShow}
                  isActive={false}
                  isPreloaded={false}
                  isMuted={true}
                />
              </div>
            )}

            {/* ---------------------------------------------------------------- */}
            {/* SLOT 1: CURRENT ITEM (Creator A) - Positioned at 0% (Active Play) */}
            {/* ---------------------------------------------------------------- */}
            <div className="absolute inset-0">
              <LiveStreamCanvas
                posterUrl={currentCandidate.stream.posterUrl || undefined}
                creatorName={currentCandidate.creator.displayName}
                isLive={currentCandidate.stream.isLive}
                isPrivateShow={currentCandidate.stream.isPrivateShow}
                isActive={true}
                onDoubleTapLike={handleLike}
                isMuted={isMuted}
                onToggleMute={toggleMute}
              />
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* SLOT 2: NEXT ITEM (Creator B) - Positioned at +100% (Pre-Warmed) */}
            {/* ---------------------------------------------------------------- */}
            {nextCandidate && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ transform: "translate3d(0, 100%, 0)" }}
              >
                <LiveStreamCanvas
                  posterUrl={nextCandidate.stream.posterUrl || undefined}
                  creatorName={nextCandidate.creator.displayName}
                  isLive={nextCandidate.stream.isLive}
                  isPrivateShow={nextCandidate.stream.isPrivateShow}
                  isActive={false}
                  isPreloaded={true}
                  isMuted={true}
                />
              </div>
            )}
          </div>
        )}

        {/* Up-Next Peek Banner when user drags up */}
        {dragOffsetY < -25 && nextCandidate && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full bg-black/85 px-3.5 py-1.5 text-[11px] font-bold text-white backdrop-blur-md border border-white/20 shadow-2xl animate-fade-in pointer-events-none">
            <ChevronUp className="h-3.5 w-3.5 text-pink-400 animate-bounce" />
            <span>Up Next: {nextCandidate.creator.displayName}</span>
          </div>
        )}

        {/* ==================================================================== */}
        {/* 2. TOP BRAND & CATEGORY NAVIGATION BAR                               */}
        {/* ==================================================================== */}
        <div className="relative z-20 flex items-center justify-between px-4 pt-4 pb-2 bg-gradient-to-b from-black/85 via-black/40 to-transparent">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-black text-sm tracking-tight text-white drop-shadow-md">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-tr from-pink-600 to-amber-400 text-white shadow-md shadow-pink-600/40">
                <Flame className="h-3.5 w-3.5" />
              </span>
              <span className="hidden sm:inline">AuraLive</span>
            </div>

            {/* Tabs */}
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
                  activeTab === "live" ? "text-white font-black" : "text-zinc-400 hover:text-white"
                }`}
              >
                <span>LIVE</span>
                {activeTab === "live" && (
                  <span className="absolute -bottom-1 left-1/2 h-0.5 w-3 -translate-x-1/2 rounded-full bg-pink-500 shadow-[0_0_8px_#ec4899]" />
                )}
              </button>
              <span className="text-zinc-600">•</span>
              <button
                onClick={() => setActiveDrawer("search")}
                className={`transition-colors drop-shadow-md ${
                  activeTab === "explore" ? "text-white font-black" : "text-zinc-400 hover:text-white"
                }`}
              >
                Explore
              </button>
            </div>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveDrawer("search")}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-zinc-300 backdrop-blur-md hover:bg-black/60 hover:text-white transition-all border border-white/10"
              title="Search & Categories"
            >
              <Search className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() => setIsWalletOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold text-amber-400 backdrop-blur-md border border-amber-500/30 hover:border-amber-400 transition-all shadow-sm"
              title="Wallet Balance"
            >
              <Coins className="h-3.5 w-3.5" />
              <span>{currentUser.walletBalance.toLocaleString()}</span>
            </button>

            <button
              onClick={toggleMute}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-zinc-300 backdrop-blur-md hover:bg-black/60 hover:text-white transition-all border border-white/10"
              title={isMuted ? "Unmute stream (M)" : "Mute stream (M)"}
            >
              {isMuted ? (
                <VolumeX className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5 text-pink-400" />
              )}
            </button>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 3. MIDDLE OVERLAY: POPULARITY SIGNALS & DESKTOP CONTROLS              */}
        {/* ==================================================================== */}
        <div className="relative z-20 flex-1 flex flex-col justify-between pointer-events-none p-4">
          {currentCandidate && (
            <div className="flex items-center gap-2 flex-wrap pointer-events-auto">
              <span className="flex items-center gap-1.5 rounded-full bg-rose-600/95 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-black text-white shadow-lg shadow-rose-600/40">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                LIVE
              </span>

              <span className="flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-bold text-zinc-200 border border-white/10">
                {currentCandidate.viewerCount.toLocaleString()} Viewers
              </span>

              <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/20 to-pink-500/20 backdrop-blur-md px-2 py-0.5 text-[10px] font-extrabold text-amber-300 border border-amber-500/30 shadow-sm">
                <Zap className="h-3 w-3 text-amber-400 fill-amber-400" />
                <span>{currentCandidate.popularitySignals.heatIndex}% Hype</span>
              </span>

              <span className="flex items-center gap-1 rounded-full bg-black/50 backdrop-blur-md px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/25">
                <ShieldCheck className="h-3 w-3" />
                2257 Verified
              </span>
            </div>
          )}

          {/* Desktop Stream Switch Arrows */}
          <div className="hidden sm:flex flex-col items-end gap-2 pointer-events-auto self-end">
            <button
              onClick={goToPrevStream}
              disabled={currentIndex === 0}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md border border-white/10 hover:bg-black/80 disabled:opacity-30 transition-all"
              title="Previous Live (Up Arrow / K)"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              onClick={goToNextStream}
              disabled={currentIndex === candidates.length - 1}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md border border-white/10 hover:bg-black/80 disabled:opacity-30 transition-all"
              title="Next Live (Down Arrow / J)"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 4. RIGHT-SIDE VERTICALLY STACKED ACTION RAIL                          */}
        {/* ==================================================================== */}
        {currentCandidate && (
          <div className="absolute right-3 bottom-20 z-30 flex flex-col items-center gap-3.5 pointer-events-auto">
            {/* Creator Avatar & Follow Button */}
            <div className="relative mb-1 flex flex-col items-center">
              <button
                onClick={() => {
                  telemetry.trackStreamEnter(currentCandidate.id);
                  setActiveDrawer("profile");
                }}
                className="relative group"
                title="View Creator Profile"
              >
                <img
                  src={
                    currentCandidate.creator.avatarUrl ||
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                  }
                  alt={currentCandidate.creator.displayName}
                  className="h-11 w-11 rounded-full object-cover ring-2 ring-pink-500 shadow-lg group-hover:scale-105 transition-transform"
                />
                <span className="absolute -bottom-0.5 right-0 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-black" />
              </button>

              {!isFollowingCurrent ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFollow(currentCandidate.id);
                  }}
                  className="absolute -bottom-2 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-tr from-pink-600 to-rose-500 text-white shadow-md shadow-pink-600/40 hover:scale-110 active:scale-90 transition-transform"
                  title="Follow Creator (F)"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFollow(currentCandidate.id);
                  }}
                  className="absolute -bottom-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md shadow-emerald-600/40 hover:scale-110 active:scale-90 transition-transform"
                  title="Following (Click to unfollow)"
                >
                  <UserCheck className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* ❤️ LIKE */}
            <button
              onClick={handleLike}
              className="group flex flex-col items-center gap-1 text-white hover:scale-110 active:scale-90 transition-transform"
              title="Like & Send Love (L)"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white shadow-lg group-hover:border-pink-500/50 group-hover:text-pink-400">
                <Heart className="h-5 w-5 fill-rose-500 text-rose-500 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-[11px] font-extrabold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {currentLikes > 999 ? `${(currentLikes / 1000).toFixed(1)}k` : currentLikes}
              </span>
            </button>

            {/* 💬 LIVE CHAT */}
            <button
              onClick={() => {
                telemetry.trackChatOpen(currentCandidate.id);
                setActiveDrawer("chat");
              }}
              className="group flex flex-col items-center gap-1 text-white hover:scale-110 active:scale-90 transition-transform"
              title="Open Live Chat (C)"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white shadow-lg group-hover:border-pink-500/50 group-hover:text-pink-300">
                <MessageCircle className="h-5 w-5" />
              </div>
              <span className="text-[11px] font-extrabold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {currentCandidate.popularitySignals.chatVelocity}/m
              </span>
            </button>

            {/* 🎁 GIFTS & INTERACTIONS */}
            <button
              onClick={() => {
                telemetry.trackInteractionMenuOpen(currentCandidate.id);
                setActiveDrawer("gifting");
              }}
              className="group flex flex-col items-center gap-1 text-white hover:scale-110 active:scale-90 transition-transform"
              title="Gifts & Interaction Menu (G)"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-pink-600/80 to-amber-500/80 backdrop-blur-md border border-amber-400/40 text-amber-300 shadow-lg shadow-pink-600/20 group-hover:scale-105">
                <Gift className="h-5 w-5" />
              </div>
              <span className="text-[11px] font-extrabold text-amber-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                Gift
              </span>
            </button>

            {/* 💎 PPV MEDIA VAULT */}
            <button
              onClick={() => {
                telemetry.trackMarketplaceOpen(currentCandidate.id);
                setActiveDrawer("marketplace");
              }}
              className="group flex flex-col items-center gap-1 text-white hover:scale-110 active:scale-90 transition-transform"
              title="Exclusive PPV Vault & Photoshoots"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-pink-400 shadow-lg group-hover:border-pink-500/50 group-hover:scale-105">
                <Sparkles className="h-5 w-5" />
              </div>
              <span className="text-[11px] font-extrabold text-pink-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                Vault
              </span>
            </button>

            {/* ⋯ MORE SETTINGS */}
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
        {/* 5. BOTTOM CREATOR IDENTITY & INTERACTIVE HUD                          */}
        {/* ==================================================================== */}
        {currentCandidate && (
          <div className="relative z-20 px-4 pb-3 pt-6 bg-gradient-to-t from-black/95 via-black/60 to-transparent">
            <div className="max-w-[76%] space-y-1.5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    telemetry.trackStreamEnter(currentCandidate.id);
                    setActiveDrawer("profile");
                  }}
                  className="font-black text-sm text-white hover:text-pink-400 transition-colors drop-shadow-md truncate"
                >
                  {currentCandidate.creator.displayName}
                </button>
                {currentCandidate.userRelationship.hasSubscription && (
                  <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/30 to-pink-500/30 px-1.5 py-0.2 text-[9px] font-bold text-amber-300 border border-amber-500/40">
                    VIP Sub
                  </span>
                )}
              </div>

              {/* Stream Title */}
              <p className="text-xs text-zinc-200 line-clamp-2 leading-relaxed drop-shadow-sm font-medium">
                {currentCandidate.stream.streamTitle}
              </p>

              {/* Live Goal Progress Bar */}
              <button
                onClick={() => {
                  telemetry.trackInteractionMenuOpen(currentCandidate.id);
                  setActiveDrawer("interaction");
                }}
                className="flex items-center gap-1.5 rounded-full bg-zinc-900/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-amber-300 border border-amber-500/30 hover:border-amber-400 transition-all max-w-full"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="truncate">
                  🎯 {currentCandidate.presentation.currentGoal.title} [
                  {currentCandidate.presentation.currentGoal.percentage}%]
                </span>
              </button>

              {/* Category Tags */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {currentCandidate.stream.tags.map((t) => (
                  <span
                    key={t}
                    onClick={() => setSelectedTag(t)}
                    className="cursor-pointer text-[10px] font-semibold text-zinc-400 hover:text-pink-400 transition-colors"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>

            {/* Quick Chat Dispatcher */}
            <div className="mt-3 flex items-center gap-2 pt-2 border-t border-white/10">
              <form onSubmit={handleSendQuickMessage} className="relative flex-1">
                <input
                  type="text"
                  value={quickMessage}
                  onChange={(e) => setQuickMessage(e.target.value)}
                  placeholder="Send a quick chat message..."
                  className="w-full rounded-full bg-zinc-900/80 border border-white/15 px-3.5 py-2 text-xs text-white placeholder-zinc-500 backdrop-blur-md focus:border-pink-500 focus:outline-none pr-9 shadow-inner"
                />
                <button
                  type="submit"
                  disabled={!quickMessage.trim()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-pink-600 text-white disabled:opacity-30 hover:bg-pink-500 transition-colors"
                >
                  <Send className="h-3 w-3" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* 6. MODALS & INTERACTIVE DRAWERS                                      */}
        {/* ==================================================================== */}
        {currentCandidate && (
          <>
            <ChatDrawer
              isOpen={activeDrawer === "chat"}
              onClose={() => setActiveDrawer("none")}
              creatorId={currentCandidate.id}
              creatorName={currentCandidate.creator.displayName}
              onOpenGiftDrawer={() => setActiveDrawer("gifting")}
            />

            <GiftingDrawer
              isOpen={activeDrawer === "gifting"}
              onClose={() => setActiveDrawer("none")}
              creatorId={currentCandidate.id}
              creatorName={currentCandidate.creator.displayName}
              menuItems={currentCandidate.presentation.interactionItems}
              onOpenWalletModal={() => setIsWalletOpen(true)}
            />

            <InteractionDrawer
              isOpen={activeDrawer === "interaction"}
              onClose={() => setActiveDrawer("none")}
              creatorId={currentCandidate.id}
              creatorName={currentCandidate.creator.displayName}
              goalTitle={currentCandidate.presentation.currentGoal.title}
              goalProgress={currentCandidate.presentation.currentGoal.progress}
              goalTarget={currentCandidate.presentation.currentGoal.target}
              onOpenGiftDrawer={() => setActiveDrawer("gifting")}
              onOpenWalletModal={() => setIsWalletOpen(true)}
            />

            <MarketplaceDrawer
              isOpen={activeDrawer === "marketplace"}
              onClose={() => setActiveDrawer("none")}
              creatorId={currentCandidate.id}
              creatorName={currentCandidate.creator.displayName}
              ppvItems={[]}
              onOpenWalletModal={() => setIsWalletOpen(true)}
            />

            <CreatorProfileDrawer
              isOpen={activeDrawer === "profile"}
              onClose={() => setActiveDrawer("none")}
              creatorId={currentCandidate.id}
              creatorName={currentCandidate.creator.displayName}
              username={currentCandidate.creator.username}
              avatarUrl={currentCandidate.creator.avatarUrl || undefined}
              bio={currentCandidate.creator.bio}
              viewerCount={currentCandidate.viewerCount}
              tags={currentCandidate.stream.tags}
              isFollowing={isFollowingCurrent}
              onToggleFollow={() => handleToggleFollow(currentCandidate.id)}
              onOpenGiftDrawer={() => setActiveDrawer("gifting")}
              onOpenMarketplace={() => setActiveDrawer("marketplace")}
            />

            <MoreOptionsDrawer
              isOpen={activeDrawer === "more"}
              onClose={() => setActiveDrawer("none")}
              creatorId={currentCandidate.id}
              creatorName={currentCandidate.creator.displayName}
              onOpenReportModal={() => setIsReportOpen(true)}
            />
          </>
        )}

        <SearchDrawer
          isOpen={activeDrawer === "search"}
          onClose={() => setActiveDrawer("none")}
          selectedTag={selectedTag}
          onSelectTag={(t) => {
            setSelectedTag(t);
            setActiveDrawer("none");
          }}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          categoryTags={CATEGORY_TAGS}
        />

        <WalletModal isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} />

        {currentCandidate && (
          <ReportModal
            isOpen={isReportOpen}
            onClose={() => setIsReportOpen(false)}
            creatorId={currentCandidate.id}
            creatorName={currentCandidate.creator.displayName}
          />
        )}
      </div>
    </div>
  );
}
