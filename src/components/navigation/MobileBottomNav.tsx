"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Radio,
  Sparkles,
  Compass,
  MessageSquare,
  User,
  Sliders,
  Wallet,
  Coins,
} from "lucide-react";
import { useUser } from "@/lib/user-context";

interface MobileNavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string | number;
}

const MOBILE_NAV_ITEMS: MobileNavItem[] = [
  { name: "Home", href: "/", icon: Home },
  { name: "Match", href: "/matchmaking", icon: Sparkles, badge: "AI" },
  { name: "Live", href: "/live", icon: Radio, badge: "LIVE" },
  { name: "Discover", href: "/discover", icon: Compass },
  { name: "Messages", href: "/messages", icon: MessageSquare, badge: 2 },
  { name: "Profile", href: "/profile", icon: User },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { currentUser } = useUser();

  const isCreatorArea = pathname.startsWith("/creator");

  if (isCreatorArea) {
    // Mobile Creator OS Navigation
    return (
      <nav
        aria-label="Mobile Creator Navigation Bar"
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden flex items-center justify-around border-t border-rose-500/20 bg-zinc-950/90 px-2 py-2 backdrop-blur-2xl"
      >
        <Link
          href="/creator/studio"
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
            pathname === "/creator/studio" ? "text-rose-400" : "text-zinc-500"
          }`}
        >
          <Radio className="h-5 w-5" />
          <span>Studio</span>
        </Link>
        <Link
          href="/creator/menu"
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
            pathname === "/creator/menu" ? "text-rose-400" : "text-zinc-500"
          }`}
        >
          <Sliders className="h-5 w-5" />
          <span>Menu</span>
        </Link>
        <Link
          href="/wallet"
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
            pathname === "/wallet" ? "text-amber-400" : "text-zinc-500"
          }`}
        >
          <Wallet className="h-5 w-5" />
          <span>Earnings</span>
        </Link>
        <Link
          href="/"
          className="flex flex-col items-center gap-1 text-[10px] font-bold text-pink-400"
        >
          <Home className="h-5 w-5" />
          <span>Fan Feed</span>
        </Link>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Mobile Consumer Navigation Bar"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden flex items-center justify-around border-t border-white/5 bg-black/70 px-2 py-1.5 backdrop-blur-2xl select-none"
    >
      {MOBILE_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || (item.href === "/live" && pathname.startsWith("/live"));

        return (
          <Link
            key={item.name}
            href={item.href}
            className={`group relative flex flex-1 flex-col items-center justify-center py-1 transition-colors ${
              isActive ? "text-white font-black" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <div className="relative flex items-center justify-center">
              <Icon
                className={`h-5 w-5 transition-transform group-active:scale-90 ${
                  isActive ? "text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.6)]" : "text-zinc-400"
                }`}
              />
              {item.badge && (
                <span
                  className={`absolute -top-1 -right-2 flex items-center justify-center rounded-full px-1 text-[7px] font-black uppercase ${
                    item.badge === "LIVE"
                      ? "bg-rose-600 text-white animate-pulse"
                      : "bg-pink-600 text-white"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </div>

            <span
              className={`mt-1 text-[10px] tracking-tight ${
                isActive ? "text-white font-bold" : "text-zinc-500"
              }`}
            >
              {item.name}
            </span>

            {/* Active Indicator Underline */}
            {isActive && (
              <span className="absolute -bottom-1 h-0.5 w-4 rounded-full bg-pink-500 shadow-[0_0_6px_#ec4899]" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
