"use client";

import React, { useState } from "react";
import { UserPlus, UserCheck, UserMinus, AlertCircle } from "lucide-react";
import { useOptimisticFollow } from "@/hooks/state/useOptimisticFollow";

export interface OptimisticFollowButtonProps {
  creatorId: string;
  creatorDisplayName?: string;
  initialIsFollowing?: boolean;
  initialFollowerCount?: number;
  variant?: "primary" | "pill" | "compact" | "stream-overlay";
  showCount?: boolean;
  className?: string;
  onFollowChange?: (isFollowing: boolean, followerCount: number) => void;
}

/**
 * OptimisticFollowButton
 *
 * Demonstrates the Optimistic UI pattern:
 * - Instant visual state change: Pressing "Follow" immediately changes to "Following" (and updates count)
 *   while the background network request processes.
 * - Non-blocking user experience for low-risk social actions.
 * - Automatic snapshot rollback + toast feedback if the network request fails.
 */
export function OptimisticFollowButton({
  creatorId,
  creatorDisplayName = "Creator",
  initialIsFollowing = false,
  initialFollowerCount = 0,
  variant = "primary",
  showCount = false,
  className = "",
  onFollowChange,
}: OptimisticFollowButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const {
    isFollowing,
    followerCount,
    isPending,
    error,
    toggleFollow,
  } = useOptimisticFollow(creatorId, {
    initialIsFollowing,
    initialFollowerCount,
    onSuccess: (following, count) => {
      onFollowChange?.(following, count);
    },
    onError: (err) => {
      setToastMessage(`Failed to update follow status: ${err.message}`);
      setTimeout(() => setToastMessage(null), 4000);
    },
  });

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleFollow();
  };

  // -------------------------------------------------------------
  // Variant Render Styles
  // -------------------------------------------------------------
  const getButtonStyles = () => {
    if (isFollowing) {
      if (isHovered) {
        // Hover state: "Unfollow" preview
        return "bg-rose-950/40 text-rose-400 border border-rose-500/40 hover:bg-rose-900/60";
      }
      // Active "Following" state
      return "bg-zinc-900/90 text-zinc-300 border border-zinc-700/80 hover:border-zinc-600";
    }

    // Default "Follow" state (vibrant CTA)
    return "bg-gradient-to-r from-pink-600 to-rose-600 text-white font-black shadow-lg shadow-pink-600/30 hover:opacity-95 active:scale-95 border border-pink-500/30";
  };

  return (
    <div className="relative inline-flex flex-col items-center">
      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`group relative flex items-center justify-center gap-1.5 transition-all duration-200 select-none ${
          variant === "compact"
            ? "px-2.5 py-1 text-xs rounded-xl"
            : variant === "pill"
            ? "px-4 py-1.5 text-xs font-bold rounded-full"
            : variant === "stream-overlay"
            ? "px-3 py-1.5 text-xs font-bold rounded-2xl backdrop-blur-md"
            : "px-4 py-2 text-sm font-bold rounded-2xl"
        } ${getButtonStyles()} ${className}`}
        aria-label={isFollowing ? `Following ${creatorDisplayName}` : `Follow ${creatorDisplayName}`}
      >
        {/* Dynamic Icon with instant state switch */}
        {isFollowing ? (
          isHovered ? (
            <UserMinus className="h-3.5 w-3.5 transition-transform group-hover:scale-110 text-rose-400" />
          ) : (
            <UserCheck className="h-3.5 w-3.5 text-pink-400 transition-transform" />
          )
        ) : (
          <UserPlus className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
        )}

        {/* Dynamic Label with instant state switch */}
        <span className="font-semibold tracking-wide">
          {isFollowing ? (isHovered ? "Unfollow" : "Following") : "Follow"}
        </span>

        {/* Optional Follower Count */}
        {showCount && (
          <span
            className={`ml-1 text-[11px] font-mono px-1.5 py-0.5 rounded-md ${
              isFollowing
                ? "bg-zinc-800 text-zinc-400"
                : "bg-pink-700/50 text-pink-100"
            }`}
          >
            {followerCount.toLocaleString()}
          </span>
        )}

        {/* In-Flight Background Sync Pulse Indicator */}
        {isPending && (
          <span
            className="absolute -top-1 -right-1 flex h-2.5 w-2.5"
            title="Syncing with server..."
          >
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-pink-500" />
          </span>
        )}
      </button>

      {/* Rollback Notification Toast */}
      {toastMessage && (
        <div className="absolute top-full mt-2 z-50 flex items-center gap-1.5 rounded-xl bg-rose-950/90 border border-rose-500/60 px-3 py-1.5 text-[11px] font-bold text-rose-300 shadow-xl backdrop-blur-md animate-fade-in whitespace-nowrap">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
