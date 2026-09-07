"use client";

import React, { forwardRef } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: React.ReactNode;
  description?: React.ReactNode;
  size?: "sm" | "md";
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
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
    const boxSizes = {
      sm: "h-4 w-4 rounded-xs",
      md: "h-5 w-5 rounded-xs",
    }[size];

    const iconSizes = {
      sm: "h-3 w-3 stroke-[3]",
      md: "h-3.5 w-3.5 stroke-[3]",
    }[size];

    return (
      <label
        className={cn(
          "inline-flex items-start gap-2.5 cursor-pointer select-none group",
          disabled && "opacity-40 cursor-not-allowed pointer-events-none",
          className
        )}
      >
        <div className="relative flex items-center justify-center pt-0.5">
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
              "flex items-center justify-center border transition-all duration-150 ease-snappy",
              boxSizes,
              "bg-surface-base border-white/[0.14] text-white",
              "group-hover:border-white/30",
              "peer-checked:bg-accent peer-checked:border-accent peer-checked:shadow-sm peer-checked:shadow-accent/40",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-black"
            )}
          >
            <Check
              className={cn(
                iconSizes,
                "text-white transition-transform duration-150 ease-snappy",
                checked ? "scale-100 opacity-100" : "scale-0 opacity-0"
              )}
            />
          </div>
        </div>

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
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";
