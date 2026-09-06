"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Radio,
  Users,
  Compass,
  MessageSquare,
  Wallet,
  User,
  Flame,
  Sliders,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  Coins,
} from "lucide-react";
import { useUser, PRESET_USERS } from "@/lib/user-context";
import { WalletModal } from "@/components/wallet/WalletModal";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string | number;
  matchPrefix?: boolean;
}

const PRIMARY_NAV_ITEMS: NavItem[] = [
  { name: "Home", href: "/", icon: Home },
  { name: "Match", href: "/matchmaking", icon: Sparkles, badge: "AI" },
  { name: "Live", href: "/live", icon: Radio, badge: "LIVE" },
  { name: "Following", href: "/following", icon: Users },
  { name: "Discover", href: "/discover", icon: Compass },
  { name: "Messages", href: "/messages", icon: MessageSquare, badge: 2 },
  { name: "Wallet", href: "/wallet", icon: Wallet },
  { name: "Profile", href: "/profile", icon: User },
];

export function DesktopNavRail() {
  const pathname = usePathname();
  const { currentUser, switchUser } = useUser();
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isPersonaOpen, setIsPersonaOpen] = useState(false);

  return (
    <>
      <aside
        aria-label="Desktop Navigation Rail"
        className="fixed top-0 bottom-0 left-0 z-40 hidden lg:flex w-[72px] flex-col items-center justify-between border-r border-white/5 bg-black/80 py-4 backdrop-blur-2xl select-none"
      >
        {/* Top: Minimal Brand Logo */}
        <div className="flex flex-col items-center">
          <Link
            href="/"
            className="group relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-600/30 via-rose-500/20 to-amber-400/20 text-pink-400 border border-white/10 hover:border-pink-500/40 hover:scale-105 transition-all shadow-sm"
            title="AuraLive Home"
          >
            <Flame className="h-5 w-5 text-pink-500 group-hover:text-pink-400 transition-colors" />
            <span className="absolute -bottom-1 -right-1 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-pink-500" />
            </span>
          </Link>
        </div>

        {/* Middle: Visually Quiet Navigation Items */}
        <nav className="flex flex-col items-center gap-2.5 my-auto">
          {PRIMARY_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : item.matchPrefix
                ? pathname.startsWith(item.href)
                : pathname === item.href || (item.href === "/live" && pathname.startsWith("/live"));

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group relative flex h-12 w-12 flex-col items-center justify-center rounded-2xl transition-all ${
                  isActive
                    ? "bg-white/10 text-white font-bold shadow-[0_0_15px_rgba(255,255,255,0.06)]"
                    : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
                }`}
                title={item.name}
              >
                {/* Active Indicator Bar */}
                {isActive && (
                  <span className="absolute -left-3 h-5 w-1 rounded-r-full bg-pink-500 shadow-[0_0_8px_#ec4899]" />
                )}

                <div className="relative">
                  <Icon
                    className={`h-5 w-5 transition-transform group-hover:scale-110 ${
                      isActive ? "text-pink-400" : "text-zinc-400 group-hover:text-zinc-100"
                    }`}
                  />
                  {/* Item Badges (e.g. unread messages or LIVE indicator) */}
                  {item.badge && (
                    <span
                      className={`absolute -top-1.5 -right-2.5 flex items-center justify-center rounded-full px-1 text-[8px] font-black uppercase ${
                        item.badge === "LIVE"
                          ? "bg-rose-600 text-white animate-pulse"
                          : "bg-pink-600 text-white"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>

                {/* Subdued Compact Label */}
                <span
                  className={`mt-1 text-[9px] font-semibold tracking-tight transition-colors ${
                    isActive ? "text-white" : "text-zinc-500 group-hover:text-zinc-300"
                  }`}
                >
                  {item.name}
                </span>

                {/* Desktop Hover Floating Tooltip */}
                <span className="pointer-events-none absolute left-16 z-50 whitespace-nowrap rounded-xl bg-zinc-900/95 px-2.5 py-1 text-xs font-semibold text-white opacity-0 shadow-xl border border-zinc-800 transition-opacity group-hover:opacity-100">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section: Creator Dashboard Switcher & Persona Switcher */}
        <div className="flex flex-col items-center gap-3">
          {/* Creator Studio Shortcut Pill */}
          <Link
            href="/creator/studio"
            className="group relative flex h-11 w-11 flex-col items-center justify-center rounded-2xl bg-zinc-900/90 text-zinc-400 border border-zinc-800 hover:border-rose-500/40 hover:text-rose-400 hover:bg-rose-500/10 transition-all shadow-md"
            title="Creator OS & Studio"
          >
            <Sliders className="h-4 w-4 transition-transform group-hover:scale-110 text-rose-400" />
            <span className="mt-0.5 text-[8px] font-bold text-rose-300">Studio</span>

            {/* Hover Tooltip */}
            <span className="pointer-events-none absolute left-16 z-50 whitespace-nowrap rounded-xl bg-zinc-900/95 px-2.5 py-1 text-xs font-semibold text-rose-300 opacity-0 shadow-xl border border-rose-500/30 transition-opacity group-hover:opacity-100">
              Creator Operating System
            </span>
          </Link>

          {/* Active Persona Switcher */}
          <div className="relative">
            <button
              onClick={() => setIsPersonaOpen(!isPersonaOpen)}
              className="group relative flex h-10 w-10 items-center justify-center rounded-2xl p-0.5 ring-1 ring-white/10 hover:ring-pink-500/50 transition-all overflow-hidden"
              title={`Active: ${currentUser.displayName} (${currentUser.role})`}
            >
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.displayName}
                className="h-full w-full rounded-[14px] object-cover"
              />
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-black" />
            </button>

            {/* Persona Switcher Dropdown Popover */}
            {isPersonaOpen && (
              <div className="absolute bottom-2 left-16 z-50 w-64 rounded-3xl border border-zinc-800 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur-2xl animate-fade-in">
                <div className="px-3 py-2 border-b border-zinc-800/80 mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Switch Persona
                  </span>
                  <span className="text-[10px] font-extrabold text-amber-400">
                    🪙 {currentUser.walletBalance.toLocaleString()}
                  </span>
                </div>

                <div className="space-y-1">
                  {PRESET_USERS.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        switchUser(user);
                        setIsPersonaOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-2xl p-2 text-left text-xs transition-colors ${
                        currentUser.id === user.id
                          ? "bg-pink-500/15 text-pink-300 font-semibold ring-1 ring-pink-500/30"
                          : "text-zinc-300 hover:bg-zinc-900"
                      }`}
                    >
                      <img
                        src={user.avatarUrl}
                        alt={user.displayName}
                        className="h-8 w-8 rounded-xl object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-semibold text-white">{user.displayName}</p>
                        <p className="text-[10px] text-zinc-400">Role: {user.role}</p>
                      </div>
                      {currentUser.id === user.id && (
                        <span className="h-2 w-2 rounded-full bg-pink-500 shadow-[0_0_6px_#ec4899]" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setIsPersonaOpen(false);
                      setIsWalletOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 py-1.5 text-xs font-bold text-amber-400 hover:bg-zinc-800 transition-colors"
                  >
                    <Coins className="h-3.5 w-3.5" />
                    <span>Top Up Wallet</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      <WalletModal isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} />
    </>
  );
}
