"use client";

import React from "react";

interface FanslyHeartLogoProps {
  className?: string;
  size?: number;
  color?: string;
}

export function FanslyHeartLogo({
  className = "h-7 w-7",
  color = "#00a2f8",
}: FanslyHeartLogoProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Fansly stylized connected heart shape */}
      <path
        d="M24 40.5C23.2 40.5 22.4 40.1 21.8 39.5L10.2 27.9C6.6 24.3 4.8 19.8 5.3 14.8C5.9 9.1 10.5 4.6 16.3 4.3C20.1 4.1 23.8 5.9 25.9 9L24 10.6C22.4 8.2 19.5 6.8 16.5 7C11.9 7.2 8.3 10.7 7.9 15.2C7.5 19.1 8.9 22.6 11.8 25.5L24 37.7L36.2 25.5C39.1 22.6 40.5 19.1 40.1 15.2C39.7 10.7 36.1 7.2 31.5 7C28.5 6.8 25.6 8.2 24 10.6L22.1 9C24.2 5.9 27.9 4.1 31.7 4.3C37.5 4.6 42.1 9.1 42.7 14.8C43.2 19.8 41.4 24.3 37.8 27.9L26.2 39.5C25.6 40.1 24.8 40.5 24 40.5Z"
        fill={color}
      />
      {/* Central circular ring cutout accent */}
      <circle
        cx="24"
        cy="20.5"
        r="5"
        stroke={color}
        strokeWidth="3.5"
        fill="none"
      />
    </svg>
  );
}
