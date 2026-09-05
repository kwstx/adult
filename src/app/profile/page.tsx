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
} from "lucide-react";
import { useUser, PRESET_USERS } from "@/lib/user-context";
import { WalletModal } from "@/components/wallet/WalletModal";

export default function ProfilePage() {
  const { currentUser, switchUser } = useUser();
  const [isWalletOpen, setIsWalletOpen] = useState(false);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Profile Card */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 shadow-2xl mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.displayName}
                className="h-20 w-20 rounded-3xl object-cover ring-2 ring-pink-500/50 shadow-xl"
              />
              <span className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-zinc-950" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white">
                  {currentUser.displayName}
                </h1>
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {currentUser.kycStatus === "COMPLIANCE_2257_APPROVED"
                    ? "2257 Verified"
                    : "18+ Age Verified"}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                @{currentUser.username} • <span className="text-pink-400 font-semibold">{currentUser.role}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {currentUser.role === "CREATOR" && (
              <Link
                href="/creator/studio"
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-600/30"
              >
                <Radio className="h-4 w-4" />
                <span>Creator Studio</span>
              </Link>
            )}
            <button
              onClick={() => setIsWalletOpen(true)}
              className="flex items-center gap-2 rounded-2xl bg-zinc-900 border border-amber-500/30 px-4 py-2.5 text-xs font-bold text-amber-400 hover:bg-zinc-850 transition-colors"
            >
              <Coins className="h-4 w-4" />
              <span>{currentUser.walletBalance.toLocaleString()} Tokens</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Quick Actions & Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Wallet & Ledger Card */}
        <Link
          href="/wallet"
          className="group flex items-center justify-between rounded-3xl border border-zinc-800/80 bg-zinc-950 p-5 hover:border-amber-500/40 transition-all shadow-xl"
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
          className="group flex items-center justify-between rounded-3xl border border-zinc-800/80 bg-zinc-950 p-5 hover:border-emerald-500/40 transition-all shadow-xl"
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

      {/* Switch Persona (Demo Testing Selector) */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
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
                  ? "border-pink-500 bg-pink-500/10 ring-1 ring-pink-500 shadow-md"
                  : "border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900"
              }`}
            >
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                className="h-10 w-10 rounded-xl object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-bold text-white">{user.displayName}</p>
                <p className="text-[10px] text-zinc-400">Role: {user.role}</p>
              </div>
              {currentUser.id === user.id && (
                <CheckCircle2 className="h-4 w-4 text-pink-500 shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      <WalletModal isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} />
    </div>
  );
}
