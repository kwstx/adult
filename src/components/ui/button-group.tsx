"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  attached?: boolean;
}

export function ButtonGroup({
  attached = true,
  className,
  children,
  ...props
}: ButtonGroupProps) {
  return (
    <div
      role="group"
      className={cn(
        "inline-flex items-center",
        attached
          ? "isolate -space-x-px [&>button:first-child]:rounded-r-none [&>button:last-child]:rounded-l-none [&>button:not(:first-child):not(:last-child)]:rounded-none"
          : "gap-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
