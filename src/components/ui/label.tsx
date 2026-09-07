"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  optional?: boolean;
  subText?: string;
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ required, optional, subText, className, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "block text-xs font-semibold uppercase tracking-wider text-zinc-300 select-none",
          className
        )}
        {...props}
      >
        <span className="flex items-center justify-between">
          <span>
            {children}
            {required && <span className="ml-1 text-accent">*</span>}
          </span>
          {optional && (
            <span className="text-[10px] font-normal lowercase tracking-normal text-zinc-500">
              optional
            </span>
          )}
        </span>
        {subText && (
          <span className="mt-0.5 block text-[11px] font-normal normal-case tracking-normal text-zinc-400">
            {subText}
          </span>
        )}
      </label>
    );
  }
);

Label.displayName = "Label";
