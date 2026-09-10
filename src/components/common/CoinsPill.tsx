"use client";

import React from "react";
import { Plus } from "lucide-react";

interface CoinsPillProps {
  balance?: number;
  onClick?: () => void;
  className?: string;
  size?: "sm" | "md";
}

function formatCoins(num: number | undefined): string {
  if (num === undefined || isNaN(num)) return "2,430";
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function CoinsPill({
  balance = 2430,
  onClick,
  className = "",
  size = "md",
}: CoinsPillProps) {
  const formattedBalance = formatCoins(balance);

  if (size === "sm") {
    return (
      <div
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 rounded-full bg-[#121216] border border-white/10 hover:border-white/25 pl-1 pr-1.5 py-0.5 cursor-pointer shadow-sm active:scale-95 transition-all select-none ${className}`}
      >
        {/* Gold Coin Icon with Dark Gold Badge */}
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#35250f] border border-amber-500/30">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
            <circle cx="12" cy="12" r="9.5" fill="url(#coinGradPillSm)" stroke="#f59e0b" strokeWidth="0.8" />
            <circle cx="12" cy="12" r="7.5" stroke="#b45309" strokeWidth="0.6" strokeDasharray="1.2 1.2" />
            <path d="M12 6.5L7.5 9v1.2h9V9L12 6.5zm-3.5 4.5v3.2h1.3V11H8.5zm2.85 0v3.2h1.3V11h-1.3zm2.85 0v3.2h1.3V11h-1.3zm-6 4v1.2h8.6V15H8.2z" fill="#78350f" />
            <defs>
              <linearGradient id="coinGradPillSm" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
                <stop stopColor="#fde047" />
                <stop offset="0.4" stopColor="#fbbf24" />
                <stop offset="0.8" stopColor="#f59e0b" />
                <stop offset="1" stopColor="#d97706" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Text Block: "Coins" + "✦ balance" */}
        <div className="flex flex-col text-left">
          <span className="text-[9px] text-zinc-400 font-medium leading-none">
            Coins
          </span>
          <div className="flex items-center gap-0.5 leading-none mt-0.5">
            <span className="text-[9px] text-white">✦</span>
            <span
              suppressHydrationWarning
              className="text-[11px] font-bold text-white tracking-tight"
            >
              {formattedBalance}
            </span>
          </div>
        </div>

        {/* Circular Plus Button */}
        <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#24242a] text-zinc-300 ml-0.5">
          <Plus className="h-2.5 w-2.5 stroke-[2.5]" />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 rounded-full bg-[#121216] border border-white/10 hover:border-white/20 pl-1.5 pr-2 py-1 cursor-pointer transition-all hover:bg-[#18181f] shadow-sm select-none active:scale-95 ${className}`}
    >
      {/* Gold Coin Icon with Dark Gold Badge */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#35250f] border border-amber-500/30 shadow-inner">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <circle cx="12" cy="12" r="9.5" fill="url(#coinGradPillMd)" stroke="#f59e0b" strokeWidth="0.8" />
          <circle cx="12" cy="12" r="7.5" stroke="#b45309" strokeWidth="0.6" strokeDasharray="1.2 1.2" />
          <path d="M12 6.5L7.5 9v1.2h9V9L12 6.5zm-3.5 4.5v3.2h1.3V11H8.5zm2.85 0v3.2h1.3V11h-1.3zm2.85 0v3.2h1.3V11h-1.3zm-6 4v1.2h8.6V15H8.2z" fill="#78350f" />
          <defs>
            <linearGradient id="coinGradPillMd" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
              <stop stopColor="#fde047" />
              <stop offset="0.4" stopColor="#fbbf24" />
              <stop offset="0.8" stopColor="#f59e0b" />
              <stop offset="1" stopColor="#d97706" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Text Block: "Coins" + "✦ balance" */}
      <div className="flex flex-col text-left pr-0.5">
        <span className="text-[10px] text-zinc-400 font-medium leading-tight">
          Coins
        </span>
        <div className="flex items-center gap-1 leading-none mt-0.5">
          <span className="text-[11px] text-white">✦</span>
          <span
            suppressHydrationWarning
            className="text-xs sm:text-sm font-bold text-white tracking-tight"
          >
            {formattedBalance}
          </span>
        </div>
      </div>

      {/* Plus Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (onClick) onClick();
        }}
        className="flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-full bg-[#24242a] hover:bg-[#323238] text-zinc-300 hover:text-white transition-colors ml-0.5"
        title="Add Coins"
      >
        <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5 stroke-[2.5]" />
      </button>
    </div>
  );
}
