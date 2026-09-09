"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Radio,
  Users,
  Search,
  Mail,
  Wallet,
  User,
  Sliders,
  Sparkles,
  Coins,
  Bell,
} from "lucide-react";
import { useUser, PRESET_USERS } from "@/lib/user-context";
import { FanslyHeartLogo } from "@/components/common/FanslyHeartLogo";
import { WalletModal } from "@/components/wallet/WalletModal";
import { CreatorOnboardingModal } from "@/components/creator-onboarding/CreatorOnboardingModal";
import { FanOnboardingModal } from "@/components/fan-onboarding/FanOnboardingModal";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string | number;
  matchPrefix?: boolean;
}

const PRIMARY_NAV_ITEMS: NavItem[] = [
  { name: "Home", href: "/", icon: Home },
  { name: "Explore", href: "/discover", icon: Search },
  { name: "Live", href: "/live", icon: Radio, badge: "LIVE" },
  { name: "Following", href: "/following", icon: Users },
  { name: "Messages", href: "/messages", icon: Mail, badge: 2 },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Wallet", href: "/wallet", icon: Wallet },
  { name: "Profile", href: "/profile", icon: User },
];

export function DesktopNavRail() {
  const pathname = usePathname();
  const { currentUser, switchUser } = useUser();
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isPersonaOpen, setIsPersonaOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isFanOnboardingOpen, setIsFanOnboardingOpen] = useState(false);

  return (
    <>
      <aside
        aria-label="Desktop Navigation Rail"
        className="fixed top-0 bottom-0 left-0 z-40 hidden lg:flex w-[72px] flex-col items-center justify-between border-r border-white/5 bg-[#101216]/95 py-4 backdrop-blur-2xl select-none"
      >
        {/* Top: Fansly Heart Logo */}
        <div className="flex flex-col items-center">
          <Link
            href="/"
            className="group relative flex h-11 w-11 items-center justify-center rounded-2xl bg-[#16181f] border border-white/10 hover:border-[#00a2f8]/40 hover:scale-105 transition-all shadow-sm"
            title="Fansly Home"
          >
            <FanslyHeartLogo className="h-6 w-6 transition-transform group-hover:scale-110" />
          </Link>
        </div>

        {/* Middle: Navigation Items */}
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
                    ? "bg-[#00a2f8]/15 text-white font-bold shadow-[0_0_15px_rgba(0,162,248,0.15)]"
                    : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
                }`}
                title={item.name}
              >
                {/* Active Indicator Bar */}
                {isActive && (
                  <span className="absolute -left-3 h-5 w-1 rounded-r-full bg-[#00a2f8] shadow-[0_0_8px_#00a2f8]" />
                )}

                <div className="relative">
                  <Icon
                    className={`h-5 w-5 transition-transform group-hover:scale-110 ${
                      isActive ? "text-[#00a2f8]" : "text-zinc-400 group-hover:text-zinc-100"
                    }`}
                  />
                  {/* Item Badges */}
                  {item.badge && (
                    <span
                      className={`absolute -top-1.5 -right-2.5 flex items-center justify-center rounded-full px-1 text-[8px] font-black uppercase ${
                        item.badge === "LIVE"
                          ? "bg-rose-600 text-white animate-pulse"
                          : "bg-[#00a2f8] text-white"
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
          {/* Become a Creator CTA */}
          {currentUser.role === "FAN" ? (
            <button
              onClick={() => setIsOnboardingOpen(true)}
              className="group relative flex h-11 w-11 flex-col items-center justify-center rounded-2xl bg-gradient-to-tr from-[#00a2f8] to-blue-700 text-white border border-blue-400/40 hover:scale-105 hover:shadow-lg hover:shadow-blue-600/30 transition-all shadow-md"
              title="Become a Creator"
            >
              <Sparkles className="h-4 w-4 text-white" />
              <span className="mt-0.5 text-[7px] font-black uppercase tracking-tighter">Apply</span>
            </button>
          ) : (
            <Link
              href="/creator/studio"
              className="group relative flex h-11 w-11 flex-col items-center justify-center rounded-2xl bg-zinc-900/90 text-zinc-400 border border-zinc-800 hover:border-[#00a2f8]/40 hover:text-[#00a2f8] transition-all shadow-md"
              title="Creator Studio"
            >
              <Sliders className="h-4 w-4 transition-transform group-hover:scale-110 text-[#00a2f8]" />
              <span className="mt-0.5 text-[8px] font-bold text-blue-300">Studio</span>
            </Link>
          )}

          {/* Active Persona Switcher */}
          <div className="relative">
            <button
              onClick={() => setIsPersonaOpen(!isPersonaOpen)}
              className="group relative flex h-10 w-10 items-center justify-center rounded-2xl p-0.5 ring-1 ring-white/10 hover:ring-[#00a2f8]/50 transition-all overflow-hidden"
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
              <div className="absolute bottom-2 left-16 z-50 w-64 rounded-3xl border border-zinc-800 bg-[#101216]/95 p-3 shadow-2xl backdrop-blur-2xl animate-fade-in">
                <div className="px-3 py-2 border-b border-zinc-800/80 mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Switch Persona
                  </span>
                  <span className="text-[10px] font-extrabold text-[#00a2f8]">
                    ${currentUser.walletBalance.toLocaleString()}
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
                          ? "bg-[#00a2f8]/15 text-blue-300 font-semibold ring-1 ring-[#00a2f8]/30"
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
                        <span className="h-2 w-2 rounded-full bg-[#00a2f8] shadow-[0_0_6px_#00a2f8]" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="mt-2 pt-2 border-t border-zinc-800/80 space-y-1.5">
                  <button
                    onClick={() => {
                      setIsPersonaOpen(false);
                      setIsWalletOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#00a2f8] py-1.5 text-xs font-bold text-white hover:bg-[#0091ea] transition-colors"
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
      <CreatorOnboardingModal isOpen={isOnboardingOpen} onClose={() => setIsOnboardingOpen(false)} />
      <FanOnboardingModal isOpen={isFanOnboardingOpen} onClose={() => setIsFanOnboardingOpen(false)} />
    </>
  );
}
