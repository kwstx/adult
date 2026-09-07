"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Crown, Zap } from "lucide-react";
import { FanStatusTier, FAN_STATUS_STYLES } from "@/types/fan-status";
import { normalizeRelationshipTier } from "@/modules/relationship/tier-definitions";

export interface AnimatedRelationshipBadgeProps {
  tier: FanStatusTier | string | null | undefined;
  level: number;
  displayName?: string;
  isAscending?: boolean;
  previousLevel?: number;
  previousTier?: string;
  variant?: "pill" | "stacked" | "compact" | "dot";
  interactive?: boolean;
  onClick?: () => void;
  className?: string;
}

export function AnimatedRelationshipBadge({
  tier,
  level,
  displayName,
  isAscending = false,
  previousLevel,
  previousTier,
  variant = "pill",
  interactive = false,
  onClick,
  className = "",
}: AnimatedRelationshipBadgeProps) {
  const [animating, setAnimating] = useState(isAscending);
  const [displayedLevel, setDisplayedLevel] = useState(previousLevel !== undefined ? previousLevel : level);

  const tierCode = normalizeRelationshipTier(tier);
  const style = FAN_STATUS_STYLES[tierCode] || FAN_STATUS_STYLES.NEW_FAN;

  useEffect(() => {
    if (isAscending) {
      setAnimating(true);
      // Roll up number
      const timer = setTimeout(() => {
        setDisplayedLevel(level);
      }, 400);

      const endTimer = setTimeout(() => {
        setAnimating(false);
      }, 3500);

      return () => {
        clearTimeout(timer);
        clearTimeout(endTimer);
      };
    } else {
      setDisplayedLevel(level);
      setAnimating(false);
    }
  }, [isAscending, level]);

  // If in ascension animation state, render radiant aura and spark particles
  const auraGlow = animating
    ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-black shadow-[0_0_25px_rgba(245,158,11,0.8)] scale-105 animate-pulse"
    : style.glowClass;

  if (variant === "stacked") {
    return (
      <div
        onClick={interactive && onClick ? onClick : undefined}
        className={`relative flex flex-col items-start gap-0.5 transition-transform duration-300 ${
          interactive ? "cursor-pointer group select-none" : ""
        } ${className}`}
      >
        {animating && (
          <span className="absolute -top-3 left-0 text-[9px] font-black text-amber-300 uppercase tracking-widest flex items-center gap-1 animate-bounce">
            <Sparkles className="w-2.5 h-2.5 text-amber-400" />
            LEVEL UP!
          </span>
        )}
        {displayName && (
          <span className="text-xs font-bold text-zinc-100 group-hover:text-white transition-colors tracking-tight">
            {displayName}
          </span>
        )}
        <div
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border backdrop-blur-md transition-all duration-300 ${style.bgClass} ${style.borderClass} ${style.textColor} ${auraGlow}`}
        >
          <span className="text-[11px] leading-none select-none">{style.symbol}</span>
          <span>{style.shortLabel}</span>
          {displayedLevel > 0 && (
            <span className={`text-[9px] font-mono pl-0.5 ${animating ? "font-black text-amber-300 scale-110" : "opacity-75"}`}>
              Lv.{displayedLevel}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Default Pill Variant
  return (
    <span
      onClick={interactive && onClick ? onClick : undefined}
      className={`relative inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border backdrop-blur-md transition-all duration-300 ${style.bgClass} ${style.borderClass} ${style.textColor} ${auraGlow} ${
        interactive ? "cursor-pointer hover:brightness-125 hover:scale-[1.02] active:scale-95" : ""
      } ${className}`}
    >
      {animating && (
        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
        </span>
      )}
      <span className="text-[11px] leading-none select-none">{style.symbol}</span>
      <span className="font-medium">{style.shortLabel}</span>
      {displayedLevel > 0 && (
        <span
          className={`text-[9px] font-mono pl-1 border-l border-white/10 transition-all duration-300 ${
            animating ? "font-black text-amber-300 scale-110" : "opacity-75"
          }`}
        >
          Lv.{displayedLevel}
        </span>
      )}
    </span>
  );
}
