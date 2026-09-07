"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "vip"
  | "glass";

export type ButtonSize =
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "icon-xs"
  | "icon-sm"
  | "icon-md"
  | "icon-lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isIconOnly = size.startsWith("icon");

    // Base layout & fast micro-spring animation
    const baseClasses =
      "inline-flex items-center justify-center font-medium transition-all duration-150 ease-snappy select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98]";

    // Variant styles
    const variantClasses: Record<ButtonVariant, string> = {
      primary:
        "bg-accent text-white font-semibold shadow-lg shadow-accent/20 hover:bg-accent-hover hover:shadow-accent/40 active:bg-brand-700",
      secondary:
        "bg-surface-card text-zinc-200 border border-white/[0.08] hover:bg-surface-hover hover:border-white/[0.14] hover:text-white active:bg-surface-active",
      outline:
        "bg-transparent text-zinc-300 border border-white/[0.14] hover:border-white hover:text-white hover:bg-white/[0.04] active:bg-white/[0.08]",
      ghost:
        "bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] active:bg-white/[0.1]",
      danger:
        "bg-rose-600 text-white font-semibold shadow-lg shadow-rose-600/20 hover:bg-rose-700 hover:shadow-rose-600/35 active:bg-rose-800",
      vip: "bg-amber-500 text-zinc-950 font-bold shadow-lg shadow-amber-500/25 hover:bg-amber-400 hover:shadow-amber-500/40 active:bg-amber-600",
      glass:
        "backdrop-blur-md bg-white/[0.06] border border-white/[0.12] text-white hover:bg-white/[0.12] hover:border-white/[0.2] shadow-sm",
    };

    // Size styles
    const sizeClasses: Record<ButtonSize, string> = {
      xs: "text-xs px-2.5 py-1 rounded-xs gap-1.5",
      sm: "text-xs sm:text-sm px-3 py-1.5 rounded-sm gap-2",
      md: "text-sm px-4 py-2.5 rounded-md gap-2.5",
      lg: "text-base px-6 py-3.5 rounded-md gap-3",
      xl: "text-lg px-8 py-4 rounded-lg gap-3.5",
      "icon-xs": "p-1 rounded-xs",
      "icon-sm": "p-1.5 rounded-sm",
      "icon-md": "p-2.5 rounded-md",
      "icon-lg": "p-3.5 rounded-md",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg
              className="h-4 w-4 animate-spin text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {!isIconOnly && children && (
              <span className="opacity-80">{children}</span>
            )}
          </span>
        ) : (
          <>
            {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
