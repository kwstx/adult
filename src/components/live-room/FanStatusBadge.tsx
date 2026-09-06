"use client";

import React from "react";
import { FanStatusTier } from "@/types/fan-status";
import { FAN_STATUS_STYLES } from "@/modules/relationship/fan-status.service";
import { normalizeRelationshipTier } from "@/modules/relationship/tier-definitions";

interface FanStatusBadgeProps {
  tier: FanStatusTier | string | null | undefined;
  variant?: "inline" | "pill" | "stacked" | "compact" | "dot";
  displayName?: string;
  avatarUrl?: string;
  level?: number;
  streakDays?: number;
  interactive?: boolean;
  onClick?: () => void;
  className?: string;
}

export function FanStatusBadge({
  tier,
  variant = "pill",
  displayName,
  avatarUrl,
  level,
  streakDays,
  interactive = false,
  onClick,
  className = "",
}: FanStatusBadgeProps) {
  const tierCode = normalizeRelationshipTier(tier);
  const style = FAN_STATUS_STYLES[tierCode] || FAN_STATUS_STYLES.NEW_FAN;

  // 1. Stacked Layout: Matches "Alex / 🔥 Supporter", "Maria / 💎 VIP", "Chris / 👑 Inner Circle"
  if (variant === "stacked") {
    return (
      <div
        onClick={interactive && onClick ? onClick : undefined}
        className={`flex flex-col items-start gap-0.5 ${
          interactive ? "cursor-pointer group select-none" : ""
        } ${className}`}
      >
        {displayName && (
          <span className="text-xs font-bold text-zinc-100 group-hover:text-white transition-colors tracking-tight">
            {displayName}
          </span>
        )}
        <div
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border backdrop-blur-md transition-all duration-300 ${style.bgClass} ${style.borderClass} ${style.textColor} ${style.glowClass}`}
        >
          <span className="text-[11px] leading-none select-none">{style.symbol}</span>
          <span>{style.shortLabel}</span>
          {level && level > 0 && (
            <span className="text-[9px] opacity-60 font-mono pl-0.5">
              Lv.{level}
            </span>
          )}
        </div>
      </div>
    );
  }

  // 2. Inline Pill: Sleek, compact badge for inside chat lines or lists
  if (variant === "pill") {
    return (
      <span
        onClick={interactive && onClick ? onClick : undefined}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border backdrop-blur-md transition-all duration-300 ${style.bgClass} ${style.borderClass} ${style.textColor} ${style.glowClass} ${
          interactive
            ? "cursor-pointer hover:brightness-125 hover:scale-[1.02] active:scale-95"
            : ""
        } ${className}`}
      >
        <span className="text-[10px] leading-none select-none">{style.symbol}</span>
        <span className="font-medium">{style.shortLabel}</span>
        {streakDays && streakDays >= 3 && (
          <span className="hidden sm:inline text-[9px] opacity-70 font-mono border-l border-white/10 pl-1 ml-0.5">
            {streakDays}d
          </span>
        )}
      </span>
    );
  }

  // 3. Compact: Minimal symbol + text for tight spaces
  if (variant === "compact") {
    return (
      <span
        onClick={interactive && onClick ? onClick : undefined}
        className={`inline-flex items-center gap-0.5 text-[10px] font-medium tracking-tight ${style.textColor} ${
          interactive ? "cursor-pointer hover:underline" : ""
        } ${className}`}
        title={`${style.label} - ${style.description}`}
      >
        <span>{style.symbol}</span>
        <span>{style.shortLabel}</span>
      </span>
    );
  }

  // 4. Dot: Microscopic prestige indicator
  if (variant === "dot") {
    return (
      <span
        onClick={interactive && onClick ? onClick : undefined}
        className={`inline-flex items-center justify-center h-4 w-4 rounded-full text-[9px] border ${style.bgClass} ${style.borderClass} ${
          interactive ? "cursor-pointer hover:scale-110" : ""
        } ${className}`}
        title={style.label}
      >
        {style.symbol}
      </span>
    );
  }

  // 5. Default Inline Badge
  return (
    <span
      onClick={interactive && onClick ? onClick : undefined}
      className={`inline-flex items-center gap-1 text-[11px] font-medium ${style.textColor} ${
        interactive ? "cursor-pointer hover:underline" : ""
      } ${className}`}
    >
      <span className="text-xs">{style.symbol}</span>
      <span>{style.shortLabel}</span>
    </span>
  );
}
