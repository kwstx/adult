"use client";

import React from "react";

interface VerifiedBadgeProps {
  className?: string;
  size?: number;
}

export function VerifiedBadge({ className = "h-3.5 w-3.5", size = 14 }: VerifiedBadgeProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${className}`}
    >
      {/* Blue circular verified seal */}
      <path
        d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z"
        fill="#00a2f8"
      />
      {/* Crisp white checkmark */}
      <path
        d="M9.5 16.2L5.8 12.5L7.2 11.1L9.5 13.4L16.8 6.1L18.2 7.5L9.5 16.2Z"
        fill="white"
      />
    </svg>
  );
}
