"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  MoreHorizontal,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  Heart,
  MessageSquare,
  Mail,
  Bookmark,
  Eye,
  EyeOff,
  Settings,
  Plus,
  Check,
  X,
  Send,
  Smartphone,
  Laptop,
} from "lucide-react";
import { VerifiedBadge } from "@/components/common/VerifiedBadge";
import { useUser } from "@/lib/user-context";

export interface ReelPostItem {
  id: string;
  creatorId: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  mediaUrl: string;
  videoUrl?: string;
  caption: string;
  likesCount: number;
  commentsCount: number;
  isSensitive?: boolean;
  isFollowing?: boolean;
  isLiked?: boolean;
  isBookmarked?: boolean;
}

const DEFAULT_REELS: ReelPostItem[] = [
  {
    id: "reel-1",
    creatorId: "cosmickitti",
    displayName: "Cosmic Kitt...",
    username: "cosmickitti",
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
    mediaUrl:
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=1000&auto=format&fit=crop&q=80",
    caption: "Who took it best? ✨ New exclusive photo drop from today's backstage shoot! Let me know in comments 👇",
    likesCount: 5600,
    commentsCount: 0,
    isSensitive: true,
  },
  {
    id: "reel-2",
    creatorId: "black_panterita",
    displayName: "Black_",
    username: "Panterita...",
    avatarUrl:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80",
    mediaUrl:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1000&auto=format&fit=crop&q=80",
    caption: "Midnight vibe check 🔥 Live show starting in 20 minutes, tap below to enter the private lounge.",
    likesCount: 8900,
    commentsCount: 24,
    isSensitive: true,
  },
  {
    id: "reel-3",
    creatorId: "jaklinaba",
    displayName: "jaklinaba...",
    username: "jaklinaba...",
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80",
    mediaUrl:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=1000&auto=format&fit=crop&q=80",
    caption: "Sunset poolside memories 🌊 Tap to view full gallery on my feed.",
    likesCount: 12400,
    commentsCount: 56,
    isSensitive: true,
  },
];

interface FanslyReelViewerProps {
  initialIndex?: number;
  posts?: ReelPostItem[];
  onClose?: () => void;
  isFilterDisabledGlobally?: boolean;
}

export function FanslyReelViewer({
  initialIndex = 0,
  posts = DEFAULT_REELS,
  onClose,
  isFilterDisabledGlobally = false,
}: FanslyReelViewerProps) {
  const { currentUser } = useUser();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isMuted, setIsMuted] = useState(true);
  const [disableFilter, setDisableFilter] = useState(isFilterDisabledGlobally);
  const [revealedPosts, setRevealedPosts] = useState<Record<string, boolean>>({});
  const [likesMap, setLikesMap] = useState<Record<string, { count: number; liked: boolean }>>({});
  const [bookmarksMap, setBookmarksMap] = useState<Record<string, boolean>>({});
  const [followedMap, setFollowedMap] = useState<Record<string, boolean>>({});
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [commentsList, setCommentsList] = useState<string[]>([]);

  // Laptop view size mode: "framed" (classic 9:16 phone container) or "full"
  const [isFullWidthMode, setIsFullWidthMode] = useState(false);

  const touchStartY = useRef<number | null>(null);
  const touchCurrentY = useRef<number | null>(null);

  const currentPost = posts[currentIndex] || posts[0];

  const isRevealed =
    disableFilter || (currentPost && revealedPosts[currentPost.id]);

  const currentLikes =
    currentPost && likesMap[currentPost.id]
      ? likesMap[currentPost.id].count
      : currentPost?.likesCount || 5600;

  const isLiked =
    currentPost && likesMap[currentPost.id]
      ? likesMap[currentPost.id].liked
      : false;

  const isBookmarked = currentPost ? Boolean(bookmarksMap[currentPost.id]) : false;
  const isFollowing = currentPost ? Boolean(followedMap[currentPost.id]) : false;

  const goToNext = () => {
    if (currentIndex < posts.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsCaptionExpanded(false);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setIsCaptionExpanded(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showCommentsModal || showShareModal) return;
      if (e.key === "ArrowDown" || e.key === "j") goToNext();
      else if (e.key === "ArrowUp" || e.key === "k") goToPrev();
      else if (e.key === "m") setIsMuted((prev) => !prev);
      else if (e.key === "l" && currentPost) handleToggleLike();
      else if (e.key === "Escape" && onClose) onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, currentPost, showCommentsModal, showShareModal]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (touchStartY.current === null || touchCurrentY.current === null) return;
    const diff = touchStartY.current - touchCurrentY.current;
    if (diff > 50) goToNext();
    else if (diff < -50) goToPrev();
    touchStartY.current = null;
    touchCurrentY.current = null;
  };

  const handleToggleLike = () => {
    if (!currentPost) return;
    const current = likesMap[currentPost.id] || {
      count: currentPost.likesCount,
      liked: false,
    };
    setLikesMap((prev) => ({
      ...prev,
      [currentPost.id]: {
        count: current.liked ? current.count - 1 : current.count + 1,
        liked: !current.liked,
      },
    }));
  };

  const handleToggleFollow = () => {
    if (!currentPost) return;
    setFollowedMap((prev) => ({
      ...prev,
      [currentPost.id]: !prev[currentPost.id],
    }));
  };

  const handleToggleBookmark = () => {
    if (!currentPost) return;
    setBookmarksMap((prev) => ({
      ...prev,
      [currentPost.id]: !prev[currentPost.id],
    }));
  };

  const handleRevealPost = () => {
    if (!currentPost) return;
    setRevealedPosts((prev) => ({
      ...prev,
      [currentPost.id]: true,
    }));
  };

  const handleSendComment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentInput.trim()) return;
    setCommentsList((prev) => [...prev, commentInput.trim()]);
    setCommentInput("");
  };

  return (
    <div className="relative h-full w-full bg-black text-white select-none overflow-hidden flex items-center justify-center">
      {/* Ambient background on laptop screens */}
      <div className="hidden sm:block absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src={currentPost.mediaUrl}
          alt=""
          className="h-full w-full object-cover blur-3xl opacity-20 scale-125"
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Main Canvas Container (Full on mobile, centered phone canvas on laptop) */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative h-full w-full flex flex-col justify-between overflow-hidden bg-[#101216] transition-all duration-300 ${
          isFullWidthMode
            ? "max-w-4xl sm:h-[95vh] sm:rounded-3xl sm:border sm:border-white/10 sm:shadow-2xl"
            : "sm:max-w-[440px] sm:h-[92vh] sm:rounded-3xl sm:border sm:border-white/10 sm:shadow-2xl"
        }`}
      >
        {/* Background Media (Image / Video) */}
        <div className="absolute inset-0 z-0">
          <img
            src={currentPost.mediaUrl}
            alt={currentPost.displayName}
            className={`h-full w-full object-cover transition-all duration-500 ${
              isRevealed ? "filter-none scale-100" : "blur-2xl scale-110 opacity-60"
            }`}
          />
          {/* Subtle dark gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
        </div>

        {/* Top Controls: Close button + Laptop frame size toggle */}
        <div className="relative z-30 flex items-center justify-between p-3.5">
          {onClose ? (
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-black/80"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          ) : (
            <div />
          )}

          {/* Laptop frame size toggle button */}
          <button
            onClick={() => setIsFullWidthMode(!isFullWidthMode)}
            className="hidden sm:flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 px-3 py-1 text-xs font-semibold text-zinc-300 hover:text-white transition-all shadow"
            title="Toggle Laptop View Size"
          >
            {isFullWidthMode ? (
              <>
                <Smartphone className="h-3.5 w-3.5" />
                <span>Phone Frame</span>
              </>
            ) : (
              <>
                <Laptop className="h-3.5 w-3.5" />
                <span>Expand Frame</span>
              </>
            )}
          </button>
        </div>

        {/* ==================================================================== */}
        {/* SENSITIVE CONTENT DIALOG (Center Screen - Exact match for Image 2)   */}
        {/* ==================================================================== */}
        {!isRevealed && (
          <div className="relative z-20 flex-1 flex flex-col items-center justify-center p-6 text-center animate-fade-in pointer-events-auto">
            {/* White Eye-Off Icon */}
            <div className="mb-3 text-white/90">
              <EyeOff className="h-10 w-10 stroke-[1.75]" />
            </div>

            {/* Title */}
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Sensitive Content
            </h2>

            {/* Subtitle */}
            <p className="mt-1.5 text-xs text-white/80 max-w-xs leading-relaxed">
              This content may be sensitive to some users. You must be 18 or older to view this content.
            </p>

            {/* Action Buttons: View & Disable Filter */}
            <div className="mt-5 flex items-center gap-3">
              {/* 1. View Button (Cyan-blue Fansly pill) */}
              <button
                onClick={handleRevealPost}
                className="flex items-center gap-1.5 rounded-md bg-[#00a2f8] hover:bg-[#0091ea] active:scale-95 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-[#00a2f8]/30 transition-all"
              >
                <Eye className="h-4 w-4" />
                <span>View</span>
              </button>

              {/* 2. Disable Filter Button (Dark with subtle border) */}
              <button
                onClick={() => {
                  setDisableFilter(true);
                  handleRevealPost();
                }}
                className="flex items-center gap-1.5 rounded-md bg-[#1c2028]/90 hover:bg-[#252a35] border border-zinc-700/80 active:scale-95 px-4 py-2 text-xs sm:text-sm font-semibold text-white backdrop-blur-md transition-all"
              >
                <Settings className="h-4 w-4" />
                <span>Disable Filter</span>
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* RIGHT VERTICAL ACTION RAIL (Exact layout matching Image 2)            */}
        {/* ==================================================================== */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-3.5 pointer-events-auto">
          {/* 1. More Options (...) */}
          <button
            onClick={() => setShowOptionsMenu(!showOptionsMenu)}
            className="p-1.5 text-white/90 hover:text-white transition-colors"
            title="More options"
          >
            <MoreHorizontal className="h-6 w-6 stroke-[2]" />
          </button>

          {/* 2. Filter / Funnel */}
          <button
            onClick={() => setDisableFilter((prev) => !prev)}
            className={`p-1.5 transition-colors ${
              disableFilter ? "text-[#00a2f8]" : "text-white/90 hover:text-white"
            }`}
            title="Toggle Filter"
          >
            <SlidersHorizontal className="h-5 w-5 stroke-[2]" />
          </button>

          {/* 3. Audio Mute / Unmute */}
          <button
            onClick={() => setIsMuted((prev) => !prev)}
            className="p-1.5 text-white/90 hover:text-white transition-colors"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <VolumeX className="h-5 w-5 stroke-[2]" />
            ) : (
              <Volume2 className="h-5 w-5 text-[#00a2f8] stroke-[2]" />
            )}
          </button>

          {/* 4. Up Chevron (Previous Post) */}
          <button
            onClick={goToPrev}
            disabled={currentIndex === 0}
            className="p-1 text-white/90 hover:text-white disabled:opacity-30 transition-all"
            title="Previous (Up Arrow / K)"
          >
            <ChevronUp className="h-6 w-6 stroke-[2.5]" />
          </button>

          {/* 5. Down Chevron (Next Post) */}
          <button
            onClick={goToNext}
            disabled={currentIndex === posts.length - 1}
            className="p-1 text-white/90 hover:text-white disabled:opacity-30 transition-all"
            title="Next (Down Arrow / J)"
          >
            <ChevronDown className="h-6 w-6 stroke-[2.5]" />
          </button>

          {/* 6. Creator Avatar with Follow (+) badge */}
          <div className="relative my-1 flex flex-col items-center">
            <Link href={`/creator/${currentPost.username}`}>
              <img
                src={currentPost.avatarUrl}
                alt={currentPost.displayName}
                className="h-10 w-10 rounded-full object-cover ring-2 ring-white/20 shadow-md"
              />
            </Link>
            <button
              onClick={handleToggleFollow}
              className={`absolute -bottom-1.5 flex h-4 w-4 items-center justify-center rounded-full text-white shadow-md transition-transform ${
                isFollowing ? "bg-emerald-500" : "bg-[#00a2f8] hover:scale-110"
              }`}
              title={isFollowing ? "Following" : "Follow"}
            >
              {isFollowing ? (
                <Check className="h-2.5 w-2.5 stroke-[3]" />
              ) : (
                <Plus className="h-2.5 w-2.5 stroke-[3]" />
              )}
            </button>
          </div>

          {/* 7. Like (Heart) + Count */}
          <button
            onClick={handleToggleLike}
            className="flex flex-col items-center gap-0.5 text-white/90 hover:text-white transition-all active:scale-90"
          >
            <Heart
              className={`h-6 w-6 transition-colors ${
                isLiked ? "fill-rose-500 text-rose-500" : "stroke-[2]"
              }`}
            />
            <span className="text-[11px] font-bold">
              {currentLikes > 999
                ? `${(currentLikes / 1000).toFixed(1)}K`
                : currentLikes}
            </span>
          </button>

          {/* 8. Comment (Speech Bubble) + Count */}
          <button
            onClick={() => setShowCommentsModal(true)}
            className="flex flex-col items-center gap-0.5 text-white/90 hover:text-white transition-all"
          >
            <MessageSquare className="h-6 w-6 stroke-[2]" />
            <span className="text-[11px] font-bold">
              {currentPost.commentsCount}
            </span>
          </button>

          {/* 9. Message / Mail */}
          <button
            onClick={() => setShowShareModal(true)}
            className="p-1.5 text-white/90 hover:text-white transition-colors"
            title="Send Direct Message"
          >
            <Mail className="h-6 w-6 stroke-[2]" />
          </button>

          {/* 10. Bookmark Ribbon */}
          <button
            onClick={handleToggleBookmark}
            className="p-1.5 text-white/90 hover:text-white transition-colors active:scale-90"
            title="Save to bookmarks"
          >
            <Bookmark
              className={`h-6 w-6 transition-colors ${
                isBookmarked ? "fill-[#00a2f8] text-[#00a2f8]" : "stroke-[2]"
              }`}
            />
          </button>
        </div>

        {/* ==================================================================== */}
        {/* BOTTOM LEFT OVERLAY: CREATOR INFO & CAPTION (Exact Image 2 Match)    */}
        {/* ==================================================================== */}
        <div className="relative z-20 px-4 pb-20 sm:pb-6 pt-4 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-auto max-w-[78%] space-y-1">
          {/* Creator Name + Verified Badge + Handle */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              href={`/creator/${currentPost.username}`}
              className="font-bold text-sm text-white hover:text-[#00a2f8] transition-colors drop-shadow"
            >
              {currentPost.displayName}
            </Link>
            <VerifiedBadge size={14} />
            <span className="text-xs text-white/70">@{currentPost.username}</span>
          </div>

          {/* Caption with "... more" toggle */}
          <div className="text-xs text-white/90 leading-relaxed drop-shadow">
            <p className={isCaptionExpanded ? "" : "line-clamp-1"}>
              {currentPost.caption}
            </p>
            {!isCaptionExpanded && currentPost.caption.length > 25 && (
              <button
                onClick={() => setIsCaptionExpanded(true)}
                className="font-bold text-white hover:underline ml-1"
              >
                more
              </button>
            )}
          </div>

          {/* "(View Post)" Link */}
          <div className="pt-0.5">
            <Link
              href={`/creator/${currentPost.username}`}
              className="text-xs text-white/80 hover:text-white font-medium underline"
            >
              (View Post)
            </Link>
          </div>
        </div>

        {/* Comments Drawer / Modal */}
        {showCommentsModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 animate-fade-in">
            <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-[#101216] border border-zinc-800 p-5 space-y-4 shadow-2xl max-h-[80vh] flex flex-col animate-modal-in">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <h3 className="text-sm font-bold text-white">Comments</h3>
                <button
                  onClick={() => setShowCommentsModal(false)}
                  className="p-1 rounded-full text-zinc-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 py-2">
                {commentsList.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-6">
                    No comments yet. Be the first to comment!
                  </p>
                ) : (
                  commentsList.map((c, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs">
                      <div className="h-7 w-7 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-white">
                        U
                      </div>
                      <div className="flex-1 bg-zinc-900 rounded-2xl p-2.5 border border-zinc-800">
                        <span className="font-bold text-white">You: </span>
                        <span className="text-zinc-200">{c}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSendComment} className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                <input
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Write a comment..."
                  className="flex-1 rounded-full bg-zinc-900 border border-zinc-800 px-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00a2f8]"
                />
                <button
                  type="submit"
                  disabled={!commentInput.trim()}
                  className="p-2 rounded-full bg-[#00a2f8] text-white disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Share / Direct Message Modal */}
        {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
            <div className="w-full max-w-sm rounded-3xl bg-[#101216] border border-zinc-800 p-5 space-y-4 shadow-2xl text-center">
              <h3 className="text-sm font-bold text-white">Send Direct Message</h3>
              <p className="text-xs text-zinc-400">
                Message @{currentPost.username} directly from your inbox.
              </p>
              <div className="flex gap-2 pt-2">
                <Link
                  href="/messages"
                  onClick={() => setShowShareModal(false)}
                  className="flex-1 rounded-full bg-[#00a2f8] py-2 text-xs font-bold text-white text-center hover:bg-[#0091ea]"
                >
                  Open Chat
                </Link>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="flex-1 rounded-full bg-zinc-900 border border-zinc-800 py-2 text-xs font-bold text-zinc-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
