"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: "default" | "glass";
  error?: string | boolean;
  helperText?: string;
  showCharCount?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      variant = "default",
      error,
      helperText,
      showCharCount = false,
      maxLength,
      value,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const currentLength = typeof value === "string" ? value.length : 0;
    const hasError = Boolean(error);
    const errorMessage = typeof error === "string" ? error : undefined;

    const variantClasses = {
      default:
        "bg-surface-base border border-white/[0.08] text-zinc-100 placeholder:text-zinc-500 hover:border-white/[0.14] focus:border-accent focus:bg-surface-elevated focus:ring-1 focus:ring-accent/40",
      glass:
        "backdrop-blur-md bg-white/[0.04] border border-white/[0.1] text-zinc-100 placeholder:text-zinc-500 hover:border-white/[0.16] focus:border-accent focus:bg-white/[0.08] focus:ring-1 focus:ring-accent/40",
    }[variant];

    return (
      <div className="w-full">
        <textarea
          ref={ref}
          value={value}
          maxLength={maxLength}
          disabled={disabled}
          className={cn(
            "w-full rounded-md p-3 text-sm transition-all duration-150 ease-snappy outline-none disabled:opacity-40 disabled:pointer-events-none resize-y min-h-[80px]",
            variantClasses,
            hasError &&
              "border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/30",
            className
          )}
          {...props}
        />

        <div className="mt-1 flex items-center justify-between text-xs">
          {(errorMessage || helperText) ? (
            <p
              className={cn(
                "transition-opacity duration-150",
                hasError ? "text-rose-400 font-medium" : "text-zinc-400"
              )}
            >
              {errorMessage || helperText}
            </p>
          ) : (
            <span />
          )}

          {showCharCount && maxLength && (
            <span className="text-[11px] font-mono text-zinc-500">
              {currentLength}/{maxLength}
            </span>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
