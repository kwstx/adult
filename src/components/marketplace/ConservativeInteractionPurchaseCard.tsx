"use client";

import React, { useState } from "react";
import {
  Coins,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  Lock,
} from "lucide-react";
import { useConservativeFinancialPurchase } from "@/hooks/state/useConservativeFinancialPurchase";
import { useWalletBalance } from "@/hooks/state/useWalletBalance";
import type { PurchaseInteractionReceipt } from "@/modules/interaction/interaction-purchase.service";

export interface ConservativeInteractionPurchaseCardProps {
  creatorId: string;
  creatorDisplayName?: string;
  fanUserId: string;
  fanDisplayName?: string;
  interaction?: {
    id: string;
    title: string;
    description: string;
    creditCost: number;
    actionType?: string;
    icon?: string;
  };
  onSuccess?: (receipt: PurchaseInteractionReceipt) => void;
  onTopUpClick?: () => void;
}

/**
 * ConservativeInteractionPurchaseCard
 *
 * Implements Conservative Financial UI State Management:
 * - When purchasing a 1,000-credit interaction, immediately shows a loading/processing state.
 * - Prevents double-submissions with in-flight protection.
 * - Strictly avoids permanently marking or displaying the purchase as successful until the authoritative
 *   backend response (HTTP 200/201 + Receipt) confirms it.
 * - Leaves wallet balance clean without phantom client debits if the transaction fails.
 */
export function ConservativeInteractionPurchaseCard({
  creatorId,
  creatorDisplayName = "Maya Velvet",
  fanUserId,
  fanDisplayName = "Alex Patron",
  interaction = {
    id: "int_backstage_song_1000",
    title: "Live Backstage Acoustic Song Request",
    description: "Exclusive live VIP acoustic performance dedicated to you during the stream.",
    creditCost: 1000,
    actionType: "Performance",
    icon: "🎸",
  },
  onSuccess,
  onTopUpClick,
}: ConservativeInteractionPurchaseCardProps) {
  const [customMessage, setCustomMessage] = useState("");

  // Server state: Authoritative wallet balance
  const { balance: walletBalance, refetch: refetchWallet } = useWalletBalance(fanUserId);

  // Conservative financial mutation hook
  const {
    status,
    isPending,
    isSuccess,
    isError,
    error,
    receipt,
    purchase,
    reset,
  } = useConservativeFinancialPurchase({
    onSuccess: (confirmedReceipt) => {
      onSuccess?.(confirmedReceipt);
    },
  });

  const priceCredits = interaction.creditCost;
  const hasSufficientCredits = walletBalance >= priceCredits;
  const projectedBalanceAfter = walletBalance - priceCredits;

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasSufficientCredits || isPending) return;

    try {
      await purchase({
        creatorId,
        interactionId: interaction.id,
        creditCost: priceCredits,
        fanUserId,
        fanDisplayName,
        customMessage: customMessage.trim() || undefined,
      });
    } catch {
      // Error is captured inside hook and rendered via UI state
    }
  };

  return (
    <div className="w-full max-w-md rounded-3xl border border-zinc-800/90 bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
      {/* Header Accent Glow */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-pink-500 to-indigo-500" />

      {/* ------------------------------------------------------------- */}
      {/* VIEW 1: CONFIRMED SUCCESS (Authoritative Backend Verification) */}
      {/* ------------------------------------------------------------- */}
      {isSuccess && receipt ? (
        <div className="space-y-5 text-center animate-fade-in py-2">
          <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-950/60 border-2 border-emerald-400 shadow-xl shadow-emerald-500/20">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 animate-bounce" />
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
              Authoritative Backend Confirmation
            </span>
            <h3 className="text-xl font-black text-white">{receipt.title}</h3>
            <p className="text-xs text-zinc-400">
              Transaction ID: <span className="font-mono text-zinc-300">{receipt.transactionId}</span>
            </p>
          </div>

          {/* Prominent Queue Position Card */}
          <div className="rounded-2xl bg-gradient-to-br from-amber-500/20 via-zinc-900 to-zinc-900 border-2 border-amber-400/80 p-4 space-y-1.5 shadow-xl">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
              Live Queue Ticket
            </span>
            <div className="text-3xl font-black text-amber-400 tracking-tight">
              Position #{receipt.queuePosition}
            </div>
            <p className="text-xs text-zinc-300">
              Secured in <strong className="text-white">{creatorDisplayName}&apos;s</strong> stream queue!
            </p>
          </div>

          {/* Authoritative Financial Receipt */}
          <div className="rounded-2xl bg-zinc-950/80 border border-zinc-800 p-3.5 text-left text-xs space-y-2">
            <div className="flex justify-between items-center text-zinc-400">
              <span>Amount Debited:</span>
              <span className="font-bold text-amber-400 font-mono">-{receipt.priceCredits} credits</span>
            </div>
            <div className="flex justify-between items-center text-zinc-400 border-t border-zinc-800/80 pt-1.5">
              <span>Authoritative Remaining Balance:</span>
              <span className="font-bold text-white font-mono flex items-center gap-1">
                <Coins className="h-3.5 w-3.5 text-amber-400" />
                {receipt.fanRemainingBalance.toLocaleString()} credits
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={reset}
            className="w-full rounded-2xl bg-zinc-800 hover:bg-zinc-700 py-3 text-xs font-bold text-zinc-200 transition-all"
          >
            Order Another Interaction
          </button>
        </div>
      ) : (
        /* ------------------------------------------------------------- */
        /* VIEW 2: PURCHASE FORM (Conservative In-Flight Loading State)   */
        /* ------------------------------------------------------------- */
        <form onSubmit={handlePurchase} className="space-y-4">
          {/* Top Bar: Title & Price */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-pink-600 text-xl shadow-md">
                {interaction.icon || "🎸"}
              </span>
              <div>
                <h3 className="text-base font-black text-white leading-snug">
                  {interaction.title}
                </h3>
                <p className="text-[11px] text-zinc-400">{creatorDisplayName}</p>
              </div>
            </div>

            <div className="flex items-center gap-1 rounded-2xl bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-amber-300 font-black text-xs shrink-0 font-mono">
              <Coins className="h-3.5 w-3.5" />
              <span>{priceCredits.toLocaleString()} credits</span>
            </div>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            {interaction.description}
          </p>

          {/* Balance & Breakdown Card */}
          <div className="rounded-2xl bg-zinc-950/80 border border-zinc-800/90 p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 font-medium">Your Authoritative Balance:</span>
              <span className="font-black text-white font-mono flex items-center gap-1">
                <Coins className="h-3.5 w-3.5 text-amber-400" />
                {walletBalance.toLocaleString()} credits
              </span>
            </div>

            {hasSufficientCredits ? (
              <div className="flex items-center justify-between border-t border-zinc-800/80 pt-1.5 text-[11px] text-zinc-500">
                <span>Balance after purchase:</span>
                <span className="font-bold text-zinc-300 font-mono">
                  {projectedBalanceAfter.toLocaleString()} credits
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between border-t border-rose-500/30 pt-1.5 text-xs text-rose-400 font-bold">
                <span>Insufficient balance:</span>
                <button
                  type="button"
                  onClick={onTopUpClick}
                  className="text-amber-400 underline hover:text-amber-300 font-black"
                >
                  + Top Up ({priceCredits - walletBalance} credits)
                </button>
              </div>
            )}
          </div>

          {/* Custom Message / Request */}
          <div>
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
              Song or Dedication Note (Optional)
            </label>
            <input
              type="text"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="e.g. Wonderwall for my birthday! 🎉"
              disabled={isPending}
              className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 transition-colors disabled:opacity-50"
            />
          </div>

          {/* In-Flight Conservative Loading Feedback */}
          {isPending && (
            <div className="rounded-2xl bg-amber-950/40 border border-amber-500/50 p-3 text-xs text-amber-300 flex items-center gap-2.5 animate-pulse">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400 border-t-transparent shrink-0" />
              <div>
                <p className="font-bold">Authoritative verification in progress...</p>
                <p className="text-[11px] text-amber-400/80">
                  Backend is validating price, debiting wallet ledger, and securing queue position.
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {isError && error && (
            <div className="rounded-2xl bg-rose-950/60 border border-rose-500/50 p-3 text-xs text-rose-300 flex items-center gap-2 animate-fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <div className="flex-1">
                <p className="font-bold">Transaction Rejected</p>
                <p className="text-[11px] text-rose-400/90">{error.message}</p>
              </div>
              <button
                type="button"
                onClick={reset}
                className="text-[11px] font-bold underline hover:text-white"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Architecture Guarantee Note */}
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>
              Conservative financial rule: Purchase is only confirmed after backend ledger confirmation.
            </span>
          </div>

          {/* Main Action Button */}
          <button
            type="submit"
            disabled={!hasSufficientCredits || isPending}
            className={`w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 font-black text-xs uppercase tracking-wider transition-all select-none shadow-lg ${
              isPending
                ? "bg-amber-600/50 text-white cursor-wait"
                : hasSufficientCredits
                ? "bg-gradient-to-r from-amber-500 via-pink-600 to-rose-600 text-white shadow-amber-500/20 hover:opacity-95 active:scale-95"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            }`}
          >
            {isPending ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Verifying & Recording ({priceCredits} credits)...</span>
              </>
            ) : hasSufficientCredits ? (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Confirm Purchase ({priceCredits} credits)</span>
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                <span>Insufficient Credits ({priceCredits} needed)</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
