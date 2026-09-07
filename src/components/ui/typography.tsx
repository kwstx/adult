"use client";

import React from "react";
import { cn } from "@/lib/utils";

// --- Display Typography ---
export interface DisplayProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "div";
  size?: "2xl" | "xl" | "lg";
  gradient?: boolean;
}

export function Display({
  as: Component = "h1",
  size = "xl",
  gradient = false,
  className,
  children,
  ...props
}: DisplayProps) {
  const sizeClasses = {
    "2xl": "text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-[-0.04em] leading-[1.05]",
    xl: "text-3xl sm:text-4xl md:text-5xl font-bold tracking-[-0.035em] leading-[1.1]",
    lg: "text-2xl sm:text-3xl md:text-4xl font-bold tracking-[-0.03em] leading-[1.15]",
  }[size];

  return (
    <Component
      className={cn(
        sizeClasses,
        "text-zinc-50",
        gradient &&
          "bg-gradient-to-r from-white via-zinc-200 to-accent bg-clip-text text-transparent",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

// --- Headings ---
export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  size?: "1" | "2" | "3" | "4" | "5" | "6";
}

export function Heading({
  as: Component = "h2",
  size,
  className,
  children,
  ...props
}: HeadingProps) {
  // Map default size from tag if size prop not explicitly provided
  const effectiveSize =
    size ||
    (Component === "h1"
      ? "1"
      : Component === "h2"
      ? "2"
      : Component === "h3"
      ? "3"
      : Component === "h4"
      ? "4"
      : Component === "h5"
      ? "5"
      : "6");

  const sizeClasses = {
    "1": "text-2xl sm:text-3xl font-bold tracking-[-0.025em] leading-tight",
    "2": "text-xl sm:text-2xl font-semibold tracking-[-0.02em] leading-tight",
    "3": "text-lg sm:text-xl font-semibold tracking-[-0.015em] leading-snug",
    "4": "text-base sm:text-lg font-semibold tracking-[-0.01em] leading-snug",
    "5": "text-sm sm:text-base font-medium tracking-normal leading-normal",
    "6": "text-xs sm:text-sm font-medium tracking-normal leading-normal",
  }[effectiveSize];

  return (
    <Component
      className={cn(sizeClasses, "text-zinc-100", className)}
      {...props}
    >
      {children}
    </Component>
  );
}

// --- Body Text ---
export interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  as?: "p" | "span" | "div";
  size?: "lg" | "base" | "sm" | "xs";
  variant?: "primary" | "secondary" | "muted" | "subtle" | "accent" | "gold" | "danger" | "success";
  weight?: "normal" | "medium" | "semibold" | "bold";
  truncate?: boolean;
}

export function Text({
  as: Component = "p",
  size = "base",
  variant = "primary",
  weight = "normal",
  truncate = false,
  className,
  children,
  ...props
}: TextProps) {
  const sizeClasses = {
    lg: "text-lg leading-relaxed",
    base: "text-base leading-normal",
    sm: "text-sm leading-normal",
    xs: "text-xs leading-normal",
  }[size];

  const variantClasses = {
    primary: "text-zinc-100",
    secondary: "text-zinc-300",
    muted: "text-zinc-400",
    subtle: "text-zinc-500",
    accent: "text-accent font-semibold",
    gold: "text-amber-400 font-semibold",
    danger: "text-rose-400",
    success: "text-emerald-400",
  }[variant];

  const weightClasses = {
    normal: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold",
    bold: "font-bold",
  }[weight];

  return (
    <Component
      className={cn(
        sizeClasses,
        variantClasses,
        weightClasses,
        truncate && "truncate",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

// --- Caption ---
export interface CaptionProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "muted" | "subtle" | "accent" | "gold";
}

export function Caption({
  variant = "muted",
  className,
  children,
  ...props
}: CaptionProps) {
  const variantClasses = {
    muted: "text-zinc-400",
    subtle: "text-zinc-500",
    accent: "text-accent",
    gold: "text-amber-400",
  }[variant];

  return (
    <span
      className={cn("text-xs leading-none", variantClasses, className)}
      {...props}
    >
      {children}
    </span>
  );
}

// --- Overline (All-Caps Editorial Tag) ---
export interface OverlineProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "subtle" | "muted" | "accent" | "gold";
}

export function Overline({
  variant = "subtle",
  className,
  children,
  ...props
}: OverlineProps) {
  const variantClasses = {
    subtle: "text-zinc-500",
    muted: "text-zinc-400",
    accent: "text-accent",
    gold: "text-amber-400",
  }[variant];

  return (
    <span
      className={cn(
        "text-[11px] font-bold uppercase tracking-[0.08em] select-none",
        variantClasses,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

// --- Monospace Numeric (Financial Balances & Token Quantities) ---
export interface MonoNumberProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: "2xl" | "xl" | "lg" | "base" | "sm" | "xs";
  variant?: "primary" | "accent" | "gold" | "muted";
  weight?: "normal" | "medium" | "bold";
}

export function MonoNumber({
  size = "base",
  variant = "primary",
  weight = "bold",
  className,
  children,
  ...props
}: MonoNumberProps) {
  const sizeClasses = {
    "2xl": "text-3xl sm:text-4xl",
    xl: "text-2xl sm:text-3xl",
    lg: "text-xl",
    base: "text-base",
    sm: "text-sm",
    xs: "text-xs",
  }[size];

  const variantClasses = {
    primary: "text-zinc-100",
    accent: "text-accent",
    gold: "text-amber-400",
    muted: "text-zinc-400",
  }[variant];

  const weightClasses = {
    normal: "font-normal",
    medium: "font-medium",
    bold: "font-bold",
  }[weight];

  return (
    <span
      className={cn(
        "font-mono tabular-nums tracking-tight",
        sizeClasses,
        variantClasses,
        weightClasses,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
