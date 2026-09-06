"use client";

import React from "react";
import { SocialSeatTier } from "@/types/seat";
import { SEAT_TIER_CONFIGS } from "@/modules/seats/seat-entitlement.service";
import { Crown, Sparkles, Star, Flame, Diamond, Users, Shield } from "lucide-react";

interface SeatBadgeProps {
  tier: SocialSeatTier | string | null | undefined;
  variant?: "pill" | "tag" | "icon" | "chat-prefix" | "glow-card";
  interactive?: boolean;
  onClick?: () => void;
  className?: string;
  showProximity?: boolean;
}

export function SeatBadge({
  tier,
  variant = "pill",
  interactive = false,
  onClick,
  className = "",
  showProximity = false,
}: SeatBadgeProps) {
  const safeTier = (tier as SocialSeatTier) || "STANDARD_VIEWER";
  const config = SEAT_TIER_CONFIGS[safeTier] || SEAT_TIER_CONFIGS.STANDARD_VIEWER;

  const renderIcon = () => {
    switch (safeTier) {
      case "CREATOR_SELECTED_GUEST":
        return <Star className="h-3 w-3 fill-amber-300 text-amber-300 animate-pulse" />;
      case "INNER_CIRCLE":
        return <Crown className="h-3 w-3 fill-rose-300 text-rose-300 animate-bounce-subtle" />;
      case "VIP":
        return <Diamond className="h-3 w-3 fill-cyan-400 text-cyan-400" />;
      case "FRONT_ROW":
        return <Flame className="h-3 w-3 fill-amber-400 text-amber-400" />;
      default:
        return <Users className="h-2.5 w-2.5 text-zinc-400" />;
    }
  };

  if (variant === "icon") {
    return (
      <span
        title={config.label}
        className={`inline-flex items-center justify-center rounded-full p-1 border ${config.borderClass} ${config.bgClass} ${config.glowClass} ${className}`}
      >
        {renderIcon()}
      </span>
    );
  }

  if (variant === "chat-prefix") {
    return (
      <span
        onClick={interactive ? onClick : undefined}
        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-black tracking-wider uppercase border shrink-0 transition-transform ${
          config.borderClass
        } ${config.bgClass} ${config.textColor} ${
          interactive ? "cursor-pointer hover:scale-105 active:scale-95" : ""
        } ${className}`}
      >
        {renderIcon()}
        <span>{config.shortLabel}</span>
      </span>
    );
  }

  if (variant === "tag") {
    return (
      <span
        onClick={interactive ? onClick : undefined}
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border backdrop-blur-md ${
          config.borderClass
        } ${config.bgClass} ${config.textColor} ${config.glowClass} ${
          interactive ? "cursor-pointer hover:scale-105" : ""
        } ${className}`}
      >
        {renderIcon()}
        <span>{config.label}</span>
      </span>
    );
  }

  if (variant === "glow-card") {
    return (
      <div
        onClick={interactive ? onClick : undefined}
        className={`relative flex items-center justify-between gap-2.5 rounded-2xl p-3 border backdrop-blur-xl ${
          config.borderClass
        } ${config.bgClass} ${config.glowClass} ${
          interactive ? "cursor-pointer hover:brightness-110" : ""
        } ${className}`}
      >
        <div className="flex items-center gap-2.5">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr ${config.auraGradient} text-white shadow-md`}>
            {renderIcon()}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-black tracking-wide ${config.textColor}`}>
                {config.label}
              </span>
              {showProximity && (
                <span className="rounded bg-black/40 px-1.5 py-0.2 text-[9px] text-zinc-300 font-medium">
                  {config.distanceToCreator <= 0.5
                    ? "Center Stage"
                    : config.distanceToCreator <= 1.0
                    ? "Inner Orbit"
                    : config.distanceToCreator <= 2.0
                    ? "Prime Ring"
                    : "Front Bleachers"}
                </span>
              )}
            </div>
            <p className="text-[10px] text-zinc-300 mt-0.5 line-clamp-1">
              {config.description}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Default Pill Variant
  return (
    <button
      type="button"
      onClick={interactive ? onClick : undefined}
      disabled={!interactive}
      className={`group relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black tracking-wide border backdrop-blur-md transition-all duration-200 ${
        config.borderClass
      } ${config.bgClass} ${config.textColor} ${config.glowClass} ${
        interactive
          ? "cursor-pointer hover:scale-105 hover:brightness-125 active:scale-95"
          : "cursor-default"
      } ${className}`}
    >
      {renderIcon()}
      <span>{config.label}</span>
      {showProximity && (
        <span className="text-[9px] text-zinc-400 font-normal">
          ({config.distanceToCreator}m)
        </span>
      )}
    </button>
  );
}
