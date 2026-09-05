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
  ChevronDown,
  ChevronUp,
  Info,
  AlertTriangle,
  Gift,
  Award,
} from "lucide-react";
import { useUser } from "@/lib/user-context";
import { WalletModal } from "@/components/wallet/WalletModal";

interface CreditLotDeduction {
  id: string;
  amountDeducted: number;
  creditType: "PURCHASED" | "PROMOTIONAL" | "BONUS";
}

interface LedgerItem {
  id: string;
  transactionType: string;
  direction: string;
  amountCredits: number;
  primaryCreditType?: "PURCHASED" | "PROMOTIONAL" | "BONUS" | null;
  platformFeeCredits: number;
  creatorNetCredits: number;
  status: string;
  note: string | null;
  createdAt: string;
  creditLotDeductions?: CreditLotDeduction[];
}

interface TypedBalanceData {
  totalCredits: number;
  purchasedCredits: number;
  promotionalCredits: number;
  bonusCredits: number;
  expiringSoon: {
    amount: number;
    expiresAt: string;
    daysRemaining: number;
  } | null;
}

export default function WalletPage() {
  const { currentUser, refreshWallet } = useUser();
  const [ledgerEntries, setLedgerEntries] = useState<LedgerItem[]>([]);
  const [typedBalance, setTypedBalance] = useState<TypedBalanceData | null>(null);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/economic/wallet?userId=${currentUser.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ledgerEntries) {
          setLedgerEntries(data.ledgerEntries);
        }
        if (data.typedBalance) {
          setTypedBalance(data.typedBalance);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [currentUser]);

  const displayBalance = typedBalance?.totalCredits ?? currentUser.walletBalance;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Expiration Alert Banner (Shown only if promotional credits expire soon) */}
      {typedBalance?.expiringSoon && typedBalance.expiringSoon.daysRemaining <= 7 && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 px-5 py-3 text-amber-300 text-xs shadow-lg backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <Clock className="h-4 w-4 text-amber-400 shrink-0" />
            <span>
              <strong className="text-amber-200">
                {typedBalance.expiringSoon.amount.toLocaleString()} promotional credits
              </strong>{" "}
              will expire in {typedBalance.expiringSoon.daysRemaining} day
              {typedBalance.expiringSoon.daysRemaining === 1 ? "" : "s"}! Expiring credits are
              spent first automatically.
            </span>
          </div>
          <button
            onClick={() => setIsWalletModalOpen(true)}
            className="hidden sm:inline-block rounded-xl bg-amber-500/20 px-3 py-1 font-bold text-amber-300 hover:bg-amber-500/30 transition-colors"
          >
            Use Credits
          </button>
        </div>
      )}

      {/* Hero Wallet Card (Extremely Simple User-Facing Interface) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-950 border border-zinc-800/80 p-8 sm:p-10 shadow-2xl mb-8">
        {/* Ambient background glow */}
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-pink-600/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Available Wallet Balance
              </span>
              <button
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="inline-flex items-center gap-1 rounded-full bg-zinc-800/80 hover:bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-300 transition-colors"
                title="View typed credit breakdown"
              >
                <span>Details</span>
                {showBreakdown ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
            </div>

            {/* Simple Primary Figure: e.g. 2,450 credits */}
            <div className="flex items-baseline gap-3">
              <h1 className="text-5xl sm:text-6xl font-black text-white tracking-tight">
                {displayBalance.toLocaleString()}
              </h1>
              <span className="text-lg font-bold text-amber-400">credits</span>
            </div>

            {/* Account Owner */}
            <p className="text-xs text-zinc-500 mt-2">
              Account: <span className="text-zinc-300 font-medium">{currentUser.displayName}</span>
            </p>
          </div>

          {/* Core Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsWalletModalOpen(true)}
              className="flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-pink-500 px-7 py-4 text-sm font-extrabold text-white shadow-xl shadow-pink-600/25 hover:from-pink-500 hover:to-rose-500 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Coins className="h-4 w-4" />
              Buy credits
            </button>
            <a
              href="#history"
              className="flex items-center gap-2 rounded-2xl bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 px-6 py-4 text-sm font-bold text-zinc-200 hover:text-white transition-all"
            >
              <Clock className="h-4 w-4 text-zinc-400" />
              Transaction history
            </a>
          </div>
        </div>

        {/* Expandable Credit Type Breakdown (The Complexity Stays Underneath) */}
        {showBreakdown && typedBalance && (
          <div className="mt-8 pt-6 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Purchased Credits */}
            <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-4">
              <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                <span className="font-semibold flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-pink-400" />
                  Purchased Credits
                </span>
                <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                  Non-expiring
                </span>
              </div>
              <div className="text-2xl font-black text-white">
                {typedBalance.purchasedCredits.toLocaleString()}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                Funded with real currency. Eligible for refunds.
              </p>
            </div>

            {/* Promotional Credits */}
            <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-4">
              <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                <span className="font-semibold flex items-center gap-1.5">
                  <Gift className="h-3.5 w-3.5 text-amber-400" />
                  Promotional Credits
                </span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                  Expiring
                </span>
              </div>
              <div className="text-2xl font-black text-amber-300">
                {typedBalance.promotionalCredits.toLocaleString()}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                From bonuses & promotions. Spent first before purchased.
              </p>
            </div>

            {/* Bonus Credits */}
            <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-4">
              <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                <span className="font-semibold flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-emerald-400" />
                  Bonus Credits
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                  Reward
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-300">
                {typedBalance.bonusCredits.toLocaleString()}
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                Package top-up bonuses & loyalty awards.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Transaction History Section */}
      <div id="history" className="rounded-3xl bg-zinc-950 border border-zinc-800/80 p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-pink-400" />
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              Transaction History
            </h2>
          </div>
          <span className="rounded-full bg-zinc-900 px-3 py-1 text-[11px] font-semibold text-zinc-400 border border-zinc-800">
            Immutable Accounting Ledger
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
            <p className="text-sm font-bold text-white">No transactions yet</p>
            <p className="text-xs text-zinc-400 mt-1">
              Purchases, tips, and unlocks will record here with complete audit trails.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800/80 text-zinc-500 uppercase text-[10px] font-bold tracking-wider">
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Description</th>
                  <th className="pb-3">Credits</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {ledgerEntries.map((entry) => {
                  const isDebit = entry.direction === "DEBIT" || entry.transactionType === "LIVE_TIP" || entry.transactionType === "PPV_PURCHASE" || entry.transactionType === "INTERACTION_FEE";
                  const isCredit = entry.direction === "CREDIT" || entry.transactionType === "DEPOSIT" || entry.transactionType === "PROMOTIONAL_GRANT" || entry.transactionType === "BONUS_GRANT";

                  return (
                    <tr key={entry.id} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="py-3.5 font-bold text-white">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-2.5 py-1 border border-zinc-800">
                          {entry.transactionType.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3.5 text-zinc-300 max-w-xs truncate">
                        <div>{entry.note || "Standard Ledger Transaction"}</div>
                        {entry.creditLotDeductions && entry.creditLotDeductions.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-1">
                            {entry.creditLotDeductions.map((d) => (
                              <span
                                key={d.id}
                                className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                                  d.creditType === "PROMOTIONAL"
                                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                    : d.creditType === "BONUS"
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    : "bg-pink-500/10 text-pink-400 border border-pink-500/20"
                                }`}
                              >
                                {d.amountDeducted} {d.creditType.toLowerCase()}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 font-extrabold">
                        <span
                          className={
                            isCredit
                              ? "text-emerald-400"
                              : isDebit
                              ? "text-rose-400"
                              : "text-amber-400"
                          }
                        >
                          {isCredit ? "+" : isDebit ? "-" : ""}
                          {entry.amountCredits.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3.5">
                        <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                          {entry.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-right text-zinc-400">
                        {new Date(entry.createdAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <WalletModal isOpen={isWalletModalOpen} onClose={() => setIsWalletModalOpen(false)} />
    </div>
  );
}
