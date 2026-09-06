"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Flame,
  Coins,
  Radio,
  ShieldCheck,
  Wallet as WalletIcon,
  ChevronDown,
  Sparkles,
  Tv,
} from "lucide-react";
import { useUser, PRESET_USERS } from "@/lib/user-context";
import { WalletModal } from "@/components/wallet/WalletModal";

export function Navbar() {
  const pathname = usePathname();
  const { currentUser, switchUser } = useUser();
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const isDiscoveryHome = pathname === "/";

  // If we are on the Live Discovery Machine (Home), show a sleek floating desktop badge/HUD or minimal bar
  if (isDiscoveryHome) {
    return (
      <>
        {/* Floating Desktop HUD Portal for Creator Studio & Persona Switching */}
        <div className="hidden lg:flex fixed top-4 right-6 z-40 items-center gap-3 bg-black/40 backdrop-blur-xl px-3 py-1.5 rounded-2xl border border-white/10 shadow-2xl">
          <Link
            href="/creator/studio"
            className="flex items-center gap-1.5 rounded-xl bg-zinc-900/80 px-3 py-1.5 text-xs font-bold text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors"
          >
            <Radio className="h-3.5 w-3.5" />
            <span>Creator OS</span>
          </Link>

          <Link
            href="/creator/private-sessions"
            className="flex items-center gap-1.5 rounded-xl bg-zinc-900/80 px-2.5 py-1.5 text-xs font-bold text-pink-400 border border-pink-500/20 hover:bg-pink-500/20 transition-colors"
          >
            <Video className="h-3.5 w-3.5" />
            <span>Private Shows</span>
          </Link>

          <Link
            href="/trust/mod-queue"
            className="flex items-center gap-1.5 rounded-xl bg-zinc-900/80 px-2.5 py-1.5 text-xs font-bold text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>2257 Vault</span>
          </Link>

          {/* User Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              className="flex items-center gap-2 rounded-xl bg-zinc-900/90 p-1 pr-2 border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.displayName}
                className="h-6 w-6 rounded-lg object-cover ring-1 ring-zinc-700"
              />
              <span className="text-[11px] font-semibold text-zinc-200">
                {currentUser.displayName}
              </span>
              <ChevronDown className="h-3 w-3 text-zinc-400" />
            </button>

            {isUserDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-zinc-800 bg-zinc-950/95 p-2 shadow-2xl backdrop-blur-xl z-50">
                <div className="px-3 py-2 border-b border-zinc-800/80 mb-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Switch Active Persona
                  </p>
                </div>
                {PRESET_USERS.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => {
                      switchUser(user);
                      setIsUserDropdownOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                      currentUser.id === user.id
                        ? "bg-pink-500/15 text-pink-300 font-semibold"
                        : "text-zinc-300 hover:bg-zinc-800/60"
                    }`}
                  >
                    <img
                      src={user.avatarUrl}
                      alt={user.displayName}
                      className="h-7 w-7 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-white">{user.displayName}</p>
                      <p className="text-[10px] text-zinc-400">
                        Role: <span className="text-zinc-200">{user.role}</span>
                      </p>
                    </div>
                    {currentUser.id === user.id && (
                      <span className="h-2 w-2 rounded-full bg-pink-500"></span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <WalletModal isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} />
      </>
    );
  }

  // Standard Header for Back-office / Studio / Moderation / Ledger pages
  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-pink-600 via-rose-500 to-amber-400 text-white shadow-lg shadow-pink-500/20">
                <Flame className="h-5 w-5" />
              </span>
              <span className="bg-gradient-to-r from-white via-zinc-200 to-pink-400 bg-clip-text text-transparent font-extrabold">
                AuraLive
              </span>
              <span className="rounded-full bg-pink-500/10 px-2 py-0.5 text-[10px] font-semibold text-pink-400 border border-pink-500/20">
                18+
              </span>
            </Link>

            {/* Main Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
              <Link
                href="/"
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 transition-colors ${
                  pathname === "/"
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
                }`}
              >
                <Tv className="h-4 w-4 text-pink-400" />
                Live Discovery
              </Link>
              <Link
                href="/creator/studio"
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 transition-colors ${
                  pathname.startsWith("/creator")
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
                }`}
              >
                <Radio className="h-4 w-4 text-rose-400" />
                Creator OS
              </Link>
              <Link
                href="/creator/private-sessions"
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 transition-colors ${
                  pathname === "/creator/private-sessions"
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
                }`}
              >
                <Video className="h-4 w-4 text-pink-400" />
                Private Sessions
              </Link>
              <Link
                href="/wallet"
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 transition-colors ${
                  pathname === "/wallet"
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
                }`}
              >
                <WalletIcon className="h-4 w-4 text-amber-400" />
                Ledger & Wallet
              </Link>
              <Link
                href="/trust/mod-queue"
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 transition-colors ${
                  pathname.startsWith("/trust")
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
                }`}
              >
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Trust & Safety
              </Link>
            </nav>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-3">
            {/* Wallet Token Balance Button */}
            <button
              onClick={() => setIsWalletOpen(true)}
              className="group flex items-center gap-2 rounded-xl bg-zinc-900 px-3.5 py-1.5 border border-amber-500/30 hover:border-amber-400/70 transition-all shadow-sm hover:shadow-amber-500/10"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
                <Coins className="h-3.5 w-3.5" />
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-amber-400">
                  {currentUser.walletBalance.toLocaleString()}
                </span>
                <span className="hidden sm:inline text-[10px] text-zinc-400 ml-1 font-medium">
                  Tokens
                </span>
              </div>
              <span className="hidden sm:inline-block rounded bg-pink-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-pink-300 ml-1">
                + Get Tokens
              </span>
            </button>

            {/* User Role Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center gap-2 rounded-xl bg-zinc-900 p-1.5 pr-2.5 border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.displayName}
                  className="h-7 w-7 rounded-lg object-cover ring-1 ring-zinc-700"
                />
                <span className="hidden sm:inline text-xs font-semibold text-zinc-200">
                  {currentUser.displayName}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
              </button>

              {isUserDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-zinc-800 bg-zinc-900/95 p-2 shadow-2xl backdrop-blur-xl z-50">
                  <div className="px-3 py-2 border-b border-zinc-800/80 mb-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      Switch Active Persona
                    </p>
                  </div>
                  {PRESET_USERS.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        switchUser(user);
                        setIsUserDropdownOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                        currentUser.id === user.id
                          ? "bg-pink-500/15 text-pink-300 font-semibold"
                          : "text-zinc-300 hover:bg-zinc-800/60"
                      }`}
                    >
                      <img
                        src={user.avatarUrl}
                        alt={user.displayName}
                        className="h-7 w-7 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium text-white">{user.displayName}</p>
                        <p className="text-[10px] text-zinc-400">
                          Role: <span className="text-zinc-200">{user.role}</span>
                        </p>
                      </div>
                      {currentUser.id === user.id && (
                        <span className="h-2 w-2 rounded-full bg-pink-500"></span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <WalletModal isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} />
    </>
  );
}
