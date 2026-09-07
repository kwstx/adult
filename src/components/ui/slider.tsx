"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface SliderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  variant?: "accent" | "gold";
  showValue?: boolean;
  valueFormatter?: (val: number) => string;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      min = 0,
      max = 100,
      step = 1,
      value,
      onChange,
      variant = "accent",
      showValue = false,
      valueFormatter = (val) => String(val),
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(
      100,
      Math.max(0, ((value - min) / (max - min)) * 100)
    );

    const fillColor =
      variant === "accent"
        ? "bg-accent shadow-[0_0_10px_rgba(244,37,103,0.5)]"
        : "bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]";

    return (
      <div className={cn("w-full flex items-center gap-3 select-none", className)}>
        <div className="relative flex-1 flex items-center h-6">
          {/* Background Track */}
          <div className="absolute w-full h-1.5 rounded-full bg-zinc-800 border border-white/[0.04] overflow-hidden">
            {/* Active Fill Track */}
            <div
              className={cn("h-full transition-all duration-75", fillColor)}
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Actual Input Range (Invisible native overlay for keyboard and touch accessibility) */}
          <input
            ref={ref}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className="absolute w-full h-6 opacity-0 cursor-pointer disabled:cursor-not-allowed"
            {...props}
          />

          {/* Precision Thumb */}
          <div
            className={cn(
              "pointer-events-none absolute h-4 w-4 rounded-full bg-white shadow-md border-2 transition-transform duration-75 ease-out",
              variant === "accent" ? "border-accent" : "border-amber-400"
            )}
            style={{
              left: `calc(${percentage}% - 8px)`,
            }}
          />
        </div>

        {showValue && (
          <span className="font-mono text-xs font-semibold tabular-nums text-zinc-300 min-w-[32px] text-right">
            {valueFormatter(value)}
          </span>
        )}
      </div>
    );
  }
);

Slider.displayName = "Slider";
