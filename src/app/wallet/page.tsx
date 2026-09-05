"use client";

import React, { useState, useEffect } from "react";
import {
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  CreditCard,
  Lock,
  Clock,
  Sparkles,
  FileText,
} from "lucide-react";
import { useUser } from "@/lib/user-context";
import { WalletModal } from "@/components/wallet/WalletModal";

interface LedgerItem {
  id: string;
  transactionType: string;
  amount: number;
  platformRakeCredits: number;
  netCreatorCredits: number;
  status: string;
  note: string | null;
  createdAt: string;
}

export default function WalletPage() {
  const { currentUser, refreshWallet } = useUser();
  const [ledgerEntries, setLedgerEntries] = useState<LedgerItem[]>([]);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/economic/wallet?userId=${currentUser.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ledgerEntries) {
          setLedgerEntries(data.ledgerEntries);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [currentUser]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Wallet Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 rounded-3xl bg-gradient-to-r from-zinc-950 via-zinc-900 to-amber-950/40 border border-zinc-800/80 p-8 shadow-2xl">
        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-black shadow-xl shadow-amber-500/20 font-black">
            <Coins className="h-8 w-8" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Double-Entry Wallet Balance
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <h1 className="text-4xl font-black text-white">
                {currentUser.walletBalance.toLocaleString()}
              </h1>
              <span className="text-sm font-bold text-zinc-400">Tokens</span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Account: <span className="text-white font-medium">{currentUser.displayName}</span> (
              {currentUser.role})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsWalletModalOpen(true)}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 px-6 py-3.5 text-xs font-extrabold text-white shadow-xl shadow-pink-600/30 hover:from-pink-500 hover:to-rose-500 transition-all"
          >
            <Coins className="h-4 w-4" />
            Purchase Token Packages
          </button>
        </div>
      </div>

      {/* Ledger Statement Table */}
      <div className="rounded-3xl bg-zinc-950 border border-zinc-800/80 p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-pink-400" />
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              Immutable Economic Ledger History
            </h2>
          </div>
          <span className="rounded-full bg-zinc-900 px-3 py-1 text-[11px] font-semibold text-zinc-400 border border-zinc-800">
            ACID Transaction Log
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-2xl bg-zinc-900/40 animate-pulse" />
            ))}
          </div>
        ) : ledgerEntries.length === 0 ? (
          <div className="py-12 text-center rounded-2xl bg-zinc-900/30 border border-zinc-800/60">
            <Clock className="mx-auto h-10 w-10 text-zinc-600 mb-2" />
            <p className="text-sm font-bold text-white">No ledger transactions yet</p>
            <p className="text-xs text-zinc-400 mt-1">
              Purchases, tips, and unlocks will record here with cryptographic audit trails.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800/80 text-zinc-500 uppercase text-[10px] font-bold tracking-wider">
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Description</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Platform Rake</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {ledgerEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="py-3.5 font-bold text-white">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-2.5 py-1 border border-zinc-800">
                        {entry.transactionType.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3.5 text-zinc-300 max-w-xs truncate">
                      {entry.note || "Standard Ledger Transaction"}
                    </td>
                    <td className="py-3.5 font-extrabold text-amber-400">
                      {entry.amount} Tokens
                    </td>
                    <td className="py-3.5 text-zinc-400">
                      {entry.platformRakeCredits > 0 ? `${entry.platformRakeCredits} Tokens` : "—"}
                    </td>
                    <td className="py-3.5">
                      <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                        {entry.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right text-zinc-400">
                      {new Date(entry.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <WalletModal isOpen={isWalletModalOpen} onClose={() => setIsWalletModalOpen(false)} />
    </div>
  );
}
