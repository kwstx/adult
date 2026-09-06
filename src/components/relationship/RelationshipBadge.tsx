"use client";

import React from "react";
import { Sparkles, Shield, HeartHandshake, Crown, Flame, Trophy } from "lucide-react";
import { RelationshipTierCode } from "@/modules/relationship/types";

interface RelationshipBadgeProps {
  tier: RelationshipTierCode;
  level?: number;
  size?: "xs" | "sm" | "md" | "lg";
  showLevel?: boolean;
  showName?: boolean;
  className?: string;
}

export function RelationshipBadge({
  tier,
  level,
  size = "sm",
  showLevel = true,
  showName = true,
  className = "",
}: RelationshipBadgeProps) {
  const getTierDetails = (t: RelationshipTierCode) => {
    switch (t) {
      case "ELITE":
        return {
          name: "Elite",
          icon: Trophy,
          gradient: "from-amber-400 via-yellow-300 to-amber-600 text-amber-950 font-black",
          border: "border-amber-400/80 shadow-[0_0_15px_rgba(245,158,11,0.5)]",
          iconColor: "text-amber-950",
          glow: "animate-pulse",
        };
      case "INNER_CIRCLE":
        return {
          name: "Inner Circle",
          icon: Flame,
          gradient: "from-pink-500 via-rose-500 to-purple-600 text-white font-extrabold",
          border: "border-pink-500/70 shadow-[0_0_12px_rgba(236,72,153,0.4)]",
          iconColor: "text-pink-100",
          glow: "",
        };
      case "VIP":
        return {
          name: "VIP",
          icon: Crown,
          gradient: "from-purple-600 via-indigo-500 to-pink-500 text-white font-extrabold",
          border: "border-purple-500/60 shadow-[0_0_10px_rgba(168,85,247,0.35)]",
          iconColor: "text-purple-200",
          glow: "",
        };
      case "REGULAR":
        return {
          name: "Regular",
          icon: HeartHandshake,
          gradient: "from-emerald-600 to-teal-500 text-white font-bold",
          border: "border-emerald-500/40",
          iconColor: "text-emerald-200",
          glow: "",
        };
      case "SUPPORTER":
        return {
          name: "Supporter",
          icon: Shield,
          gradient: "from-blue-600 to-cyan-500 text-white font-bold",
          border: "border-blue-500/40",
          iconColor: "text-blue-200",
          glow: "",
        };
      case "NEW_FAN":
      default:
        return {
          name: "New Fan",
          icon: Sparkles,
          gradient: "from-zinc-700 to-zinc-500 text-zinc-200 font-semibold",
          border: "border-zinc-700",
          iconColor: "text-zinc-300",
          glow: "",
        };
    }
  };

  const details = getTierDetails(tier);
  const IconComponent = details.icon;

  const sizeClasses = {
    xs: "px-1.5 py-0.5 text-[9px] gap-1",
    sm: "px-2.5 py-0.5 text-[10px] gap-1.5",
    md: "px-3 py-1 text-xs gap-2",
    lg: "px-4 py-1.5 text-sm gap-2.5",
  };

  const iconSizes = {
    xs: "h-2.5 w-2.5",
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full bg-gradient-to-r uppercase tracking-wider border shadow-sm ${details.gradient} ${details.border} ${details.glow} ${sizeClasses[size]} ${className}`}
    >
      <IconComponent className={`${iconSizes[size]} ${details.iconColor} shrink-0`} />
      {showName && <span>{details.name}</span>}
      {showLevel && level !== undefined && (
        <span className="opacity-90 font-mono text-[9px] ml-0.5 bg-black/25 px-1 rounded-sm">
          Lv.{level}
        </span>
      )}
    </span>
  );
}
