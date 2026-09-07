"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "type"> {
  label?: React.ReactNode;
  description?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  (
    {
      label,
      description,
      size = "md",
      checked,
      disabled,
      className,
      onChange,
      ...props
    },
    ref
  ) => {
    const trackSizes = {
      sm: "h-4 w-7",
      md: "h-5 w-9",
      lg: "h-6 w-11",
    }[size];

    const thumbSizes = {
      sm: "h-3 w-3",
      md: "h-4 w-4",
      lg: "h-5 w-5",
    }[size];

    const translateChecked = {
      sm: "translate-x-3.5",
      md: "translate-x-4",
      lg: "translate-x-5",
    }[size];

    return (
      <label
        className={cn(
          "inline-flex items-center justify-between gap-3 cursor-pointer select-none group",
          disabled && "opacity-40 cursor-not-allowed pointer-events-none",
          className
        )}
      >
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <span className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
                {label}
              </span>
            )}
            {description && (
              <span className="text-xs text-zinc-400 mt-0.5">
                {description}
              </span>
            )}
          </div>
        )}

        <div className="relative inline-flex items-center">
          <input
            ref={ref}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className="peer sr-only"
            {...props}
          />
          <div
            className={cn(
              "rounded-full transition-colors duration-200 ease-snappy flex items-center p-0.5 border border-white/[0.08]",
              trackSizes,
              checked ? "bg-accent border-accent shadow-sm shadow-accent/30" : "bg-zinc-800",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-black"
            )}
          >
            <div
              className={cn(
                "rounded-full bg-white shadow-md transform transition-transform duration-200 ease-snappy",
                thumbSizes,
                checked ? translateChecked : "translate-x-0"
              )}
            />
          </div>
        </div>
      </label>
    );
  }
);

Switch.displayName = "Switch";
