"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type ProgressVariant = "accent" | "gold" | "success" | "gradient" | "danger";
export type ProgressSize = "xs" | "sm" | "md" | "lg";

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100 or current value if max provided
  max?: number;
  variant?: ProgressVariant;
  size?: ProgressSize;
  showLabel?: boolean;
  animated?: boolean;
}

export function ProgressBar({
  value,
  max = 100,
  variant = "accent",
  size = "md",
  showLabel = false,
  animated = false,
  className,
  ...props
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const sizeClasses: Record<ProgressSize, string> = {
    xs: "h-1",
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  const variantFills: Record<ProgressVariant, string> = {
    accent: "bg-accent shadow-[0_0_12px_rgba(244,37,103,0.5)]",
    gold: "bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]",
    success: "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]",
    gradient: "bg-gradient-to-r from-purple-600 via-pink-600 to-accent shadow-[0_0_12px_rgba(244,37,103,0.5)]",
    danger: "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]",
  };

  return (
    <div className={cn("w-full", className)} {...props}>
      {showLabel && (
        <div className="flex items-center justify-between text-xs font-mono font-medium text-zinc-400 mb-1">
          <span>Progress</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}

      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-zinc-900 border border-white/[0.06]",
          sizeClasses[size]
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300 ease-snappy relative",
            variantFills[variant],
            animated && "animate-pulse"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// --- Livestream Goal Progress Bar ---
export interface StreamGoalBarProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  current: number;
  target: number;
  unit?: string;
  checkpoints?: number[];
}

export function StreamGoalBar({
  title,
  current,
  target,
  unit = "Tokens",
  checkpoints = [],
  className,
  ...props
}: StreamGoalBarProps) {
  const percentage = Math.min(100, Math.max(0, (current / target) * 100));

  return (
    <div
      className={cn(
        "w-full p-3 rounded-md bg-surface-base/90 border border-white/[0.08] backdrop-blur-md shadow-md",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
          {title}
        </span>
        <span className="text-xs font-mono font-semibold text-amber-400 tabular-nums">
          {current.toLocaleString()} / {target.toLocaleString()} {unit}
        </span>
      </div>

      {/* Progress Track */}
      <div className="relative w-full h-3 rounded-full bg-zinc-900 border border-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-accent transition-all duration-300 ease-snappy shadow-[0_0_15px_rgba(244,37,103,0.4)]"
          style={{ width: `${percentage}%` }}
        />

        {/* Checkpoint Markers */}
        {checkpoints.map((cp, idx) => {
          const cpPercent = (cp / target) * 100;
          return (
            <div
              key={idx}
              className="absolute top-0 bottom-0 w-0.5 bg-white/40"
              style={{ left: `${cpPercent}%` }}
              title={`Milestone: ${cp} ${unit}`}
            />
          );
        })}
      </div>
    </div>
  );
}
