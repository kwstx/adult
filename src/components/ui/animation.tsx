"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// --- Live Pulse Radar Beacon ---
export function PulseBeacon({
  color = "live",
  size = "md",
  className,
}: {
  color?: "live" | "accent" | "gold";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "h-2 w-2",
    md: "h-2.5 w-2.5",
    lg: "h-3.5 w-3.5",
  }[size];

  const colorStyles = {
    live: {
      dot: "bg-emerald-500",
      ping: "bg-emerald-400",
    },
    accent: {
      dot: "bg-accent",
      ping: "bg-accent",
    },
    gold: {
      dot: "bg-amber-400",
      ping: "bg-amber-300",
    },
  }[color];

  return (
    <span className={cn("relative inline-flex items-center justify-center", sizeClasses, className)}>
      <span
        className={cn(
          "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
          colorStyles.ping
        )}
      />
      <span className={cn("relative inline-flex rounded-full", sizeClasses, colorStyles.dot)} />
    </span>
  );
}

// --- Audio Visualizer Equalizer Wave Indicator ---
export function AudioWaveIndicator({
  isPlaying = true,
  className,
}: {
  isPlaying?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-end gap-0.5 h-3.5 w-4", className)}>
      <span
        className={cn(
          "w-0.5 bg-accent rounded-full",
          isPlaying ? "h-3 animate-[pulse_0.6s_ease-in-out_infinite]" : "h-1"
        )}
      />
      <span
        className={cn(
          "w-0.5 bg-accent rounded-full",
          isPlaying ? "h-3.5 animate-[pulse_0.8s_ease-in-out_infinite_0.2s]" : "h-1.5"
        )}
      />
      <span
        className={cn(
          "w-0.5 bg-accent rounded-full",
          isPlaying ? "h-2 animate-[pulse_0.5s_ease-in-out_infinite_0.4s]" : "h-1"
        )}
      />
    </div>
  );
}

// --- Skeleton / Shimmer Box ---
export function ShimmerBox({
  className,
  rounded = "md",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  rounded?: "none" | "sm" | "md" | "lg" | "full";
}) {
  const roundedClasses = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    full: "rounded-full",
  }[rounded];

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-zinc-900 border border-white/[0.04]",
        roundedClasses,
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    </div>
  );
}

// --- Count Up Number Animation for Balances & XP ---
export function CountUpNumber({
  target,
  duration = 600,
  formatter = (val) => val.toLocaleString(),
  className,
}: {
  target: number;
  duration?: number;
  formatter?: (val: number) => string;
  className?: string;
}) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCurrent(Math.floor(easeProgress * target));

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [target, duration]);

  return <span className={cn("tabular-nums font-mono", className)}>{formatter(current)}</span>;
}

// --- Event-Driven Milestone Animation Primitives ---
export { MajorGiftOverlay } from "@/components/animation/MajorGiftOverlay";
export { AnimatedRelationshipBadge } from "@/components/animation/AnimatedRelationshipBadge";
export { GoalMetamorphosisCard } from "@/components/animation/GoalMetamorphosisCard";
export { VipEntranceOverlay } from "@/components/animation/VipEntranceOverlay";
