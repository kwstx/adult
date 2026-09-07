"use client";

import React from "react";
import { LucideIcon, Coins, Radio, Crown, Heart, Flame, Sparkles, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type IconSize = "xs" | "sm" | "md" | "lg" | "xl";
export type IconVariant = "default" | "accent" | "gold" | "muted" | "subtle" | "danger" | "success";

export interface IconProps extends React.SVGAttributes<SVGSVGElement> {
  icon: LucideIcon;
  size?: IconSize;
  variant?: IconVariant;
  glow?: boolean;
}

export function Icon({
  icon: IconComponent,
  size = "md",
  variant = "default",
  glow = false,
  className,
  ...props
}: IconProps) {
  const sizeClasses: Record<IconSize, string> = {
    xs: "h-3 w-3",
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
    xl: "h-8 w-8",
  };

  const variantClasses: Record<IconVariant, string> = {
    default: "text-current",
    accent: "text-accent",
    gold: "text-amber-400",
    muted: "text-zinc-400",
    subtle: "text-zinc-500",
    danger: "text-rose-500",
    success: "text-emerald-400",
  };

  return (
    <IconComponent
      className={cn(
        "inline-block shrink-0 transition-colors",
        sizeClasses[size],
        variantClasses[variant],
        glow && variant === "accent" && "drop-shadow-[0_0_8px_rgba(244,37,103,0.6)]",
        glow && variant === "gold" && "drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]",
        className
      )}
      {...props}
    />
  );
}

// Domain-Specific Icon Shortcuts
export function TokenIcon({ size = "sm", className }: { size?: IconSize; className?: string }) {
  return <Icon icon={Coins} size={size} variant="gold" glow className={className} />;
}

export function LiveIcon({ size = "sm", className }: { size?: IconSize; className?: string }) {
  return <Icon icon={Radio} size={size} variant="accent" glow className={cn("animate-pulse", className)} />;
}

export function VipIcon({ size = "sm", className }: { size?: IconSize; className?: string }) {
  return <Icon icon={Crown} size={size} variant="gold" glow className={className} />;
}

export function HeartIconCustom({ size = "sm", className }: { size?: IconSize; className?: string }) {
  return <Icon icon={Heart} size={size} variant="accent" className={className} />;
}

export function FlameIconCustom({ size = "sm", className }: { size?: IconSize; className?: string }) {
  return <Icon icon={Flame} size={size} variant="accent" className={className} />;
}

export function SparklesIcon({ size = "sm", className }: { size?: IconSize; className?: string }) {
  return <Icon icon={Sparkles} size={size} variant="accent" className={className} />;
}
