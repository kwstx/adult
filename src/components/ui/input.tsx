"use client";

import React, { forwardRef, useState } from "react";
import { Eye, EyeOff, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type InputSize = "sm" | "md" | "lg";
export type InputVariant = "default" | "glass" | "flush";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: InputSize;
  variant?: InputVariant;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  error?: string | boolean;
  helperText?: string;
  clearable?: boolean;
  onClear?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      type = "text",
      size = "md",
      variant = "default",
      startIcon,
      endIcon,
      error,
      helperText,
      clearable = false,
      onClear,
      disabled,
      className,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPasswordType = type === "password";
    const actualType = isPasswordType && showPassword ? "text" : type;

    // Size styles
    const sizeClasses = {
      sm: "h-8 text-xs px-2.5 rounded-sm",
      md: "h-10 text-sm px-3.5 rounded-md",
      lg: "h-12 text-base px-4 rounded-md",
    }[size];

    // Variant styles
    const variantClasses = {
      default:
        "bg-surface-base border border-white/[0.08] text-zinc-100 placeholder:text-zinc-500 hover:border-white/[0.14] focus:border-accent focus:bg-surface-elevated focus:ring-1 focus:ring-accent/40",
      glass:
        "backdrop-blur-md bg-white/[0.04] border border-white/[0.1] text-zinc-100 placeholder:text-zinc-500 hover:border-white/[0.16] focus:border-accent focus:bg-white/[0.08] focus:ring-1 focus:ring-accent/40",
      flush:
        "bg-transparent border-b border-white/[0.12] rounded-none px-0 text-zinc-100 placeholder:text-zinc-500 hover:border-white/[0.2] focus:border-accent focus:ring-0",
    }[variant];

    const hasError = Boolean(error);
    const errorMessage = typeof error === "string" ? error : undefined;

    return (
      <div className="w-full">
        <div className="relative flex items-center">
          {startIcon && (
            <div className="pointer-events-none absolute left-3 flex items-center justify-center text-zinc-400">
              {startIcon}
            </div>
          )}

          <input
            ref={ref}
            type={actualType}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className={cn(
              "w-full transition-all duration-150 ease-snappy outline-none disabled:opacity-40 disabled:pointer-events-none",
              sizeClasses,
              variantClasses,
              startIcon && "pl-9",
              (endIcon || isPasswordType || (clearable && value)) && "pr-10",
              hasError &&
                "border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/30",
              className
            )}
            {...props}
          />

          <div className="absolute right-2.5 flex items-center gap-1.5 text-zinc-400">
            {clearable && Boolean(value) && (
              <button
                type="button"
                tabIndex={-1}
                onClick={onClear}
                className="rounded-full p-1 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Clear input"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            {isPasswordType && (
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((prev) => !prev)}
                className="rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            )}

            {endIcon && !isPasswordType && endIcon}
          </div>
        </div>

        {/* Error or Helper Message */}
        {(errorMessage || helperText) && (
          <p
            className={cn(
              "mt-1.5 text-xs transition-opacity duration-150",
              hasError ? "text-rose-400 font-medium" : "text-zinc-400"
            )}
          >
            {errorMessage || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
