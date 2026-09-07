"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type CardVariant =
  | "default"
  | "elevated"
  | "glass"
  | "interactive"
  | "accent-rim"
  | "gold-rim";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  glow?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = "default", glow = false, className, children, ...props }, ref) => {
    const variantClasses: Record<CardVariant, string> = {
      default: "bg-surface-card border border-white/[0.08] text-zinc-100",
      elevated:
        "bg-surface-elevated border border-white/[0.12] shadow-elevated text-zinc-100",
      glass: "glass-panel text-zinc-100",
      interactive:
        "bg-surface-card border border-white/[0.08] text-zinc-100 hover:border-white/[0.2] hover:bg-surface-hover hover:shadow-ambient hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-150 cursor-pointer",
      "accent-rim":
        "bg-surface-card border border-white/[0.08] border-t-2 border-t-accent text-zinc-100 shadow-sm",
      "gold-rim":
        "bg-surface-card border border-white/[0.08] border-t-2 border-t-amber-400 text-zinc-100 shadow-sm",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg overflow-hidden relative",
          variantClasses[variant],
          glow && "shadow-accent-glow border-accent/40",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export const CardHeader = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-5 pb-3", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-semibold tracking-[-0.015em] text-zinc-100",
      className
    )}
    {...props}
  >
    {children}
  </h3>
));
CardTitle.displayName = "CardTitle";

export const CardDescription = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs text-zinc-400 leading-relaxed", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

export const CardContent = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-5 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

export const CardFooter = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center justify-between p-5 pt-0 text-sm text-zinc-400 border-t border-white/[0.04] mt-3",
      className
    )}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

// --- Media Card (For Livestreams, Video Vaults, PPV Thumbnails) ---
export interface MediaCardProps extends React.HTMLAttributes<HTMLDivElement> {
  aspectRatio?: "16/9" | "9/16" | "1/1" | "4/3";
  isLive?: boolean;
  viewerCount?: number;
  badge?: React.ReactNode;
  overlayFooter?: React.ReactNode;
  imageUrl?: string;
}

export function MediaCard({
  aspectRatio = "16/9",
  isLive = false,
  viewerCount,
  badge,
  overlayFooter,
  imageUrl,
  className,
  children,
  ...props
}: MediaCardProps) {
  const aspectClasses = {
    "16/9": "aspect-video",
    "9/16": "aspect-[9/16]",
    "1/1": "aspect-square",
    "4/3": "aspect-[4/3]",
  }[aspectRatio];

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg bg-surface-base border border-white/[0.08] transition-all duration-200 hover:border-white/[0.2] hover:shadow-ambient cursor-pointer",
        aspectClasses,
        className
      )}
      {...props}
    >
      {/* Background Image / Placeholder */}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="Media preview"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-zinc-900 to-zinc-950 flex items-center justify-center text-zinc-700">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-800/20 via-transparent to-black" />
        </div>
      )}

      {/* Dark Vignette Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30 pointer-events-none" />

      {/* Top Badges */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
        <div className="flex items-center gap-1.5">
          {isLive && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs bg-red-600/90 backdrop-blur-sm text-[11px] font-bold uppercase tracking-wider text-white shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </span>
          )}
          {badge}
        </div>

        {viewerCount !== undefined && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-black/60 backdrop-blur-md text-[11px] font-mono font-medium text-zinc-300 border border-white/[0.08]">
            <svg
              className="h-3 w-3 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            {viewerCount.toLocaleString()}
          </span>
        )}
      </div>

      {/* Content / Overlay Footer */}
      <div className="absolute bottom-0 inset-x-0 p-3 z-10 flex flex-col justify-end">
        {overlayFooter || children}
      </div>
    </div>
  );
}
