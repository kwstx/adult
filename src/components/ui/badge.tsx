"use client";

import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "default"
  | "accent"
  | "secondary"
  | "outline"
  | "live"
  | "vip"
  | "tier"
  | "success"
  | "danger"
  | "warning";

export type BadgeSize = "sm" | "md" | "lg";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  pulse?: boolean;
  onDismiss?: () => void;
  icon?: React.ReactNode;
}

export function Badge({
  variant = "default",
  size = "md",
  dot = false,
  pulse = false,
  onDismiss,
  icon,
  className,
  children,
  ...props
}: BadgeProps) {
  const variantClasses: Record<BadgeVariant, string> = {
    default:
      "bg-surface-elevated text-zinc-300 border border-white/[0.08]",
    accent:
      "bg-accent/15 text-accent border border-accent/30 shadow-[0_0_10px_rgba(244,37,103,0.15)]",
    secondary:
      "bg-zinc-800/80 text-zinc-300 border border-zinc-700/60",
    outline:
      "bg-transparent text-zinc-300 border border-white/[0.16]",
    live:
      "bg-rose-600/90 text-white font-bold tracking-wider border border-rose-500 shadow-[0_0_12px_rgba(225,29,72,0.4)]",
    vip:
      "bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]",
    tier:
      "bg-gradient-to-r from-purple-950/60 to-pink-950/60 text-purple-200 border border-purple-500/30",
    success:
      "bg-emerald-950/50 text-emerald-300 border border-emerald-500/30",
    danger:
      "bg-rose-950/50 text-rose-300 border border-rose-500/30",
    warning:
      "bg-amber-950/50 text-amber-300 border border-amber-500/30",
  };

  const sizeClasses: Record<BadgeSize, string> = {
    sm: "text-[10px] px-1.5 py-0.5 rounded-xs gap-1",
    md: "text-xs px-2.5 py-0.5 rounded-sm gap-1.5 font-medium",
    lg: "text-xs px-3 py-1 rounded-sm gap-2 font-semibold",
  };

  const dotColors: Record<BadgeVariant, string> = {
    default: "bg-zinc-400",
    accent: "bg-accent",
    secondary: "bg-zinc-400",
    outline: "bg-zinc-300",
    live: "bg-white",
    vip: "bg-amber-400",
    tier: "bg-purple-400",
    success: "bg-emerald-400",
    danger: "bg-rose-400",
    warning: "bg-amber-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center select-none font-medium leading-none tracking-tight",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            dotColors[variant],
            pulse && "animate-pulse"
          )}
        />
      )}

      {icon && <span className="inline-flex shrink-0">{icon}</span>}

      <span>{children}</span>

      {onDismiss && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="ml-0.5 rounded-full p-0.5 hover:bg-white/20 transition-colors"
          aria-label="Remove badge"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
}
