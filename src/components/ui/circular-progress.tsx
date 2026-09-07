"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type CircularProgressVariant = "accent" | "gold" | "white" | "success";
export type CircularProgressSize = "sm" | "md" | "lg" | "xl";

export interface CircularProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number; // 0 to 100, or undefined for indeterminate spinner
  variant?: CircularProgressVariant;
  size?: CircularProgressSize;
  strokeWidth?: number;
  showValue?: boolean;
}

export function CircularProgress({
  value,
  variant = "accent",
  size = "md",
  strokeWidth = 3,
  showValue = false,
  className,
  ...props
}: CircularProgressProps) {
  const isIndeterminate = value === undefined;

  const dimensionMap: Record<CircularProgressSize, number> = {
    sm: 24,
    md: 36,
    lg: 48,
    xl: 64,
  };

  const dim = dimensionMap[size];
  const radius = (dim - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = isIndeterminate
    ? 0
    : circumference - ((Math.min(100, Math.max(0, value)) / 100) * circumference);

  const strokeColors: Record<CircularProgressVariant, string> = {
    accent: "stroke-accent",
    gold: "stroke-amber-400",
    white: "stroke-white",
    success: "stroke-emerald-400",
  };

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center select-none",
        className
      )}
      style={{ width: dim, height: dim }}
      {...props}
    >
      <svg
        className={cn(
          "transform -rotate-90",
          isIndeterminate && "animate-spin"
        )}
        width={dim}
        height={dim}
      >
        {/* Background Track Circle */}
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Active Progress Arc */}
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          className={cn(
            "transition-all duration-300 ease-snappy",
            strokeColors[variant]
          )}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={isIndeterminate ? circumference * 0.75 : strokeDashoffset}
          strokeLinecap="round"
          fill="none"
        />
      </svg>

      {!isIndeterminate && showValue && size !== "sm" && (
        <span className="absolute font-mono text-[10px] font-bold text-zinc-200">
          {Math.round(value)}%
        </span>
      )}
    </div>
  );
}
