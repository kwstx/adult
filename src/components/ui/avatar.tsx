"use client";

import React, { useState } from "react";
import { Check, Crown, User } from "lucide-react";
import { cn } from "@/lib/utils";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
export type AvatarStatus = "online" | "offline" | "busy" | "live";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  status?: AvatarStatus;
  isLive?: boolean;
  isVerified?: boolean;
  isVip?: boolean;
  tierLevel?: number;
}

export function Avatar({
  src,
  alt,
  name,
  size = "md",
  status,
  isLive = false,
  isVerified = false,
  isVip = false,
  tierLevel,
  className,
  ...props
}: AvatarProps) {
  const [hasError, setHasError] = useState(false);

  // Size dimensions
  const sizeClasses: Record<AvatarSize, string> = {
    xs: "h-5 w-5 text-[9px]",
    sm: "h-7 w-7 text-xs",
    md: "h-9 w-9 text-sm",
    lg: "h-12 w-12 text-base",
    xl: "h-16 w-16 text-xl",
    "2xl": "h-24 w-24 text-3xl",
  };

  // Initials generator
  const getInitials = (fullName?: string) => {
    if (!fullName) return "";
    const parts = fullName.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(name || alt);

  // Status dot positioning and styling
  const statusColors: Record<AvatarStatus, string> = {
    online: "bg-emerald-500 ring-black",
    offline: "bg-zinc-600 ring-black",
    busy: "bg-rose-500 ring-black",
    live: "bg-rose-600 ring-black animate-pulse",
  };

  const statusDotSizes: Record<AvatarSize, string> = {
    xs: "h-1.5 w-1.5 right-0 bottom-0 ring-1",
    sm: "h-2 w-2 right-0 bottom-0 ring-1",
    md: "h-2.5 w-2.5 right-0 bottom-0 ring-2",
    lg: "h-3.5 w-3.5 right-0 bottom-0 ring-2",
    xl: "h-4 w-4 right-0.5 bottom-0.5 ring-2",
    "2xl": "h-5 w-5 right-1 bottom-1 ring-4",
  };

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 select-none items-center justify-center rounded-full",
        sizeClasses[size],
        isLive &&
          "ring-2 ring-accent ring-offset-2 ring-offset-black shadow-[0_0_15px_rgba(244,37,103,0.4)]",
        className
      )}
      {...props}
    >
      <div className="h-full w-full overflow-hidden rounded-full bg-zinc-800 border border-white/[0.08] flex items-center justify-center">
        {src && !hasError ? (
          <img
            src={src}
            alt={alt || name || "Avatar"}
            onError={() => setHasError(true)}
            className="h-full w-full object-cover"
          />
        ) : initials ? (
          <span className="font-semibold text-zinc-200">{initials}</span>
        ) : (
          <User className="h-1/2 w-1/2 text-zinc-500" />
        )}
      </div>

      {/* Status Dot */}
      {status && (
        <span
          className={cn(
            "absolute rounded-full ring-offset-0",
            statusColors[status],
            statusDotSizes[size]
          )}
        />
      )}

      {/* Verified Check Badge */}
      {isVerified && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center rounded-full bg-accent p-0.5 text-white shadow-sm ring-2 ring-black">
          <Check className="h-2.5 w-2.5 stroke-[3]" />
        </span>
      )}

      {/* VIP Crown Badge */}
      {isVip && !isVerified && (
        <span className="absolute -top-1.5 -right-1 flex items-center justify-center rounded-full bg-amber-500 p-0.5 text-zinc-950 shadow-sm ring-2 ring-black">
          <Crown className="h-2.5 w-2.5 stroke-[2.5]" />
        </span>
      )}

      {/* Fan Tier Badge */}
      {tierLevel !== undefined && (
        <span className="absolute -bottom-1 inset-x-0 mx-auto w-max px-1 py-0.2 rounded-full bg-purple-900/90 border border-purple-500/50 text-[9px] font-mono font-bold text-purple-200 leading-tight ring-1 ring-black">
          L{tierLevel}
        </span>
      )}
    </div>
  );
}

// --- Avatar Group ---
export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  max?: number;
  size?: AvatarSize;
}

export function AvatarGroup({
  max = 4,
  size = "md",
  className,
  children,
  ...props
}: AvatarGroupProps) {
  const childrenArray = React.Children.toArray(children);
  const visibleChildren = childrenArray.slice(0, max);
  const remainingCount = childrenArray.length - max;

  const sizeClasses: Record<AvatarSize, string> = {
    xs: "h-5 w-5 text-[9px]",
    sm: "h-7 w-7 text-xs",
    md: "h-9 w-9 text-xs",
    lg: "h-12 w-12 text-sm",
    xl: "h-16 w-16 text-base",
    "2xl": "h-24 w-24 text-lg",
  };

  return (
    <div
      className={cn("flex items-center -space-x-2.5 overflow-hidden", className)}
      {...props}
    >
      {visibleChildren}

      {remainingCount > 0 && (
        <div
          className={cn(
            "relative inline-flex shrink-0 items-center justify-center rounded-full bg-zinc-800 border-2 border-black font-mono font-semibold text-zinc-300 select-none shadow-sm",
            sizeClasses[size]
          )}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}
