"use client";

import React, { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  options?: SelectOption[];
  size?: "sm" | "md" | "lg";
  variant?: "default" | "glass";
  startIcon?: React.ReactNode;
  error?: string | boolean;
  helperText?: string;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      options = [],
      size = "md",
      variant = "default",
      startIcon,
      error,
      helperText,
      placeholder,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: "h-8 text-xs pl-2.5 pr-8 rounded-sm",
      md: "h-10 text-sm pl-3.5 pr-9 rounded-md",
      lg: "h-12 text-base pl-4 pr-10 rounded-md",
    }[size];

    const variantClasses = {
      default:
        "bg-surface-base border border-white/[0.08] text-zinc-100 hover:border-white/[0.14] focus:border-accent focus:bg-surface-elevated focus:ring-1 focus:ring-accent/40",
      glass:
        "backdrop-blur-md bg-white/[0.04] border border-white/[0.1] text-zinc-100 hover:border-white/[0.16] focus:border-accent focus:bg-white/[0.08] focus:ring-1 focus:ring-accent/40",
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

          <select
            ref={ref}
            disabled={disabled}
            className={cn(
              "w-full appearance-none transition-all duration-150 ease-snappy outline-none disabled:opacity-40 disabled:pointer-events-none cursor-pointer",
              sizeClasses,
              variantClasses,
              startIcon && "pl-9",
              hasError &&
                "border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/30",
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled className="bg-surface-base text-zinc-500">
                {placeholder}
              </option>
            )}

            {options.length > 0
              ? options.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.disabled}
                    className="bg-surface-base text-zinc-100 py-1"
                  >
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <div className="pointer-events-none absolute right-3 flex items-center text-zinc-400">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>

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

Select.displayName = "Select";
