"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  User,
  ShieldCheck,
  Coins,
  Sparkles,
  Wallet,
  Radio,
  Lock,
  ChevronRight,
  Sliders,
  CheckCircle2,
  Settings,
  Heart,
} from "lucide-react";
import { useUser, PRESET_USERS } from "@/lib/user-context";
import { WalletModal } from "@/components/wallet/WalletModal";

export default function ProfilePage() {
  const { currentUser, switchUser } = useUser();
  const [isWalletOpen, setIsWalletOpen] = useState(false);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8 sm:px-6 space-y-6">
      {/* 1. Profile Hero Card matching reference showcases */}
      <div className="relative overflow-hidden rounded-[32px] border border-zinc-850 bg-zinc-950/90 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl text-center flex flex-col items-center">
        {/* Avatar with Glowing Ring */}
        <div className="relative mb-4">
          <div className="p-1 rounded-full story-ring-coral shadow-[0_0_25px_rgba(249,115,22,0.4)]">
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.displayName}
              className="h-24 w-24 sm:h-28 sm:w-28 rounded-full object-cover ring-2 ring-black"
            />
          </div>
          <span className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-zinc-950" />
        </div>

        {/* Identity */}
        <div className="space-y-1 mb-5">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white">
              {currentUser.displayName}
            </h1>
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="h-3.5 w-3.5" />
              {currentUser.kycStatus === "COMPLIANCE_2257_APPROVED"
                ? "2257 Verified"
                : "18+ Verified"}
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            @{currentUser.username} • <span className="text-orange-400 font-bold">{currentUser.role}</span>
          </p>
        </div>

        {/* 3-Column Stats Row */}
        <div className="flex items-center justify-center gap-8 sm:gap-14 py-3.5 px-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 mb-6 w-full max-w-md">
          <div className="flex flex-col items-center">
            <span className="text-base sm:text-lg font-black text-white">12</span>
            <span className="text-[11px] font-medium text-zinc-400">Posts</span>
          </div>
          <div className="h-7 w-px bg-zinc-800" />
          <div className="flex flex-col items-center">
            <span className="text-base sm:text-lg font-black text-white">1.4K</span>
            <span className="text-[11px] font-medium text-zinc-400">Followers</span>
          </div>
          <div className="h-7 w-px bg-zinc-800" />
          <div className="flex flex-col items-center">
            <span className="text-base sm:text-lg font-black text-white">84</span>
            <span className="text-[11px] font-medium text-zinc-400">Following</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-md">
          <button
            onClick={() => setIsWalletOpen(true)}
            className="flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2.5 px-5 text-xs font-bold rounded-full bg-zinc-900 border border-amber-500/30 text-amber-400 hover:bg-zinc-850 transition-colors shadow-md"
          >
            <Coins className="h-4 w-4" />
            <span>{currentUser.walletBalance.toLocaleString()} Tokens</span>
          </button>

          {currentUser.role === "CREATOR" ? (
            <Link
              href="/creator/studio"
              className="flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2.5 px-5 text-xs font-bold coral-pill-btn"
            >
              <Radio className="h-4 w-4" />
              <span>Studio OS</span>
            </Link>
          ) : (
            <Link
              href="/following"
              className="flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2.5 px-5 text-xs font-bold frosted-pill-btn"
            >
              <Heart className="h-4 w-4 text-rose-400" />
              <span>Following List</span>
            </Link>
          )}
        </div>
      </div>

      {/* 2. Grid: Quick Actions & Financial / Trust Vault Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Wallet & Ledger Card */}
        <Link
          href="/wallet"
          className="group flex items-center justify-between rounded-[28px] border border-zinc-850 bg-zinc-950/80 p-5 hover:border-amber-500/40 transition-all shadow-xl backdrop-blur-xl"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Double-Entry Ledger & Wallet</h3>
              <p className="text-xs text-zinc-400">View transactions, payouts & balances</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-zinc-600 group-hover:text-amber-400 transition-colors" />
        </Link>

        {/* 2257 Compliance & Trust Vault Card */}
        <Link
          href="/trust/mod-queue"
          className="group flex items-center justify-between rounded-[28px] border border-zinc-850 bg-zinc-950/80 p-5 hover:border-emerald-500/40 transition-all shadow-xl backdrop-blur-xl"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Trust & 2257 Vault</h3>
              <p className="text-xs text-zinc-400">Moderation reports & compliance records</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
        </Link>
      </div>

      {/* 3. Switch Persona Selector (Developer Testing) */}
      <div className="rounded-[28px] border border-zinc-850 bg-zinc-950/80 p-6 shadow-2xl backdrop-blur-xl">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
          Platform Persona Selector (Developer Testing)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PRESET_USERS.map((user) => (
            <button
              key={user.id}
              onClick={() => switchUser(user)}
              className={`flex items-center gap-3 rounded-2xl p-3.5 text-left border transition-all ${
                currentUser.id === user.id
                  ? "border-orange-500 bg-orange-500/10 ring-1 ring-orange-500 shadow-md"
                  : "border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900"
              }`}
            >
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                className="h-10 w-10 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-bold text-white">{user.displayName}</p>
                <p className="text-[10px] text-zinc-400">Role: {user.role}</p>
              </div>
              {currentUser.id === user.id && (
                <CheckCircle2 className="h-4 w-4 text-orange-400 shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      <WalletModal isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} />
    </div>
  );
}
