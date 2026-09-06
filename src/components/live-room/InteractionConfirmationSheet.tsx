"use client";

import React, { useState } from "react";
import {
  X,
  Sparkles,
  Coins,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  HelpCircle,
  Flame,
} from "lucide-react";
import type { PurchaseInteractionReceipt } from "@/modules/interaction/interaction-purchase.service";

interface InteractionItemSummary {
  id: string;
  title: string;
  description?: string | null;
  creditCost: number;
  actionType?: string;
  duration?: number;
  icon?: string;
  remainingQuantity?: number | null;
}

interface InteractionConfirmationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  item: InteractionItemSummary | null;
  creatorId: string;
  creatorName: string;
  fanUserId: string;
  fanDisplayName: string;
  fanAvatarUrl?: string;
  walletBalance: number;
  onSuccess?: (receipt: PurchaseInteractionReceipt) => void;
  onOpenWalletModal: () => void;
}

export function InteractionConfirmationSheet({
  isOpen,
  onClose,
  item,
  creatorId,
  creatorName,
  fanUserId,
  fanDisplayName,
  fanAvatarUrl,
  walletBalance,
  onSuccess,
  onOpenWalletModal,
}: InteractionConfirmationSheetProps) {
  const [customQuestion, setCustomQuestion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successReceipt, setSuccessReceipt] = useState<PurchaseInteractionReceipt | null>(null);

  if (!isOpen || !item) return null;

  const priceCredits = item.creditCost;
  const hasSufficientBalance = walletBalance >= priceCredits;
  const balanceAfter = walletBalance - priceCredits;

  const handleConfirmPurchase = async () => {
    if (!hasSufficientBalance) {
      onOpenWalletModal();
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/creators/${creatorId}/interactions/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interactionId: item.id,
          expectedPrice: priceCredits,
          fanUserId,
          fanDisplayName,
          fanAvatarUrl,
          customMessage: customQuestion.trim() || undefined,
          idempotencyKey: `ip_${fanUserId}_${item.id}_${Date.now()}`,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to confirm interaction purchase.");
      }

      setSuccessReceipt(data.receipt);
      if (onSuccess) {
        onSuccess(data.receipt);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred during purchase.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setSuccessReceipt(null);
    setErrorMessage(null);
    setCustomQuestion("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-md sm:items-center p-0 sm:p-4 animate-fade-in select-none">
      {/* Tap backdrop to close */}
      <div className="absolute inset-0" onClick={handleResetAndClose} />

      <div className="relative z-10 flex max-h-[90vh] sm:max-h-[620px] w-full max-w-md flex-col rounded-t-3xl sm:rounded-3xl border border-zinc-800/90 bg-zinc-950/95 shadow-2xl backdrop-blur-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-4 bg-zinc-900/40">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-600 to-amber-500 text-lg text-white shadow-md">
              {item.icon || "💬"}
            </span>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                {successReceipt ? "Purchase Confirmed" : "Confirm Interaction"}
              </h3>
              <p className="text-[11px] text-zinc-400">Live Attention Marketplace • {creatorName}</p>
            </div>
          </div>

          <button
            onClick={handleResetAndClose}
            className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* VIEW A: SUCCESS RECEIPT & QUEUE POSITION DISPLAY             */}
        {/* ------------------------------------------------------------- */}
        {successReceipt ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-5 text-center">
            {/* Celebration Icon */}
            <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border-2 border-emerald-400 shadow-xl shadow-emerald-500/20 animate-bounce">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400">
                Authoritative Queue Confirmation
              </span>
              <h4 className="text-xl font-black text-white">{successReceipt.title}</h4>
            </div>

            {/* Prominent Fan Queue Position Badge */}
            <div className="rounded-3xl bg-gradient-to-br from-amber-500/20 via-zinc-900 to-zinc-900 border-2 border-amber-400 p-5 shadow-2xl space-y-2">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
                The fan sees:
              </span>
              <div className="text-3xl font-black text-amber-400 tracking-tight">
                Position #{successReceipt.queuePosition}
              </div>
              <p className="text-xs text-zinc-300 font-medium">
                You are now <strong className="text-white">#{successReceipt.queuePosition}</strong> in {creatorName}&apos;s live stream queue!
              </p>
            </div>

            {/* Creator View Card Notice */}
            <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-3.5 text-left text-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400 block">
                The creator sees:
              </span>
              <div className="font-extrabold text-white flex items-center gap-2">
                <span>{fanDisplayName.split(" ")[0] || "Alex"}</span>
                <span className="text-zinc-500">—</span>
                <span>{successReceipt.title}</span>
                <span className="text-zinc-500">—</span>
                <span className="text-amber-400">{successReceipt.priceCredits} credits</span>
              </div>
              {successReceipt.customMessage && (
                <p className="text-[11px] text-zinc-400 italic pt-1 border-t border-zinc-800 mt-1">
                  &ldquo;{successReceipt.customMessage}&rdquo;
                </p>
              )}
            </div>

            {/* Updated Wallet Balance Summary */}
            <div className="flex items-center justify-between rounded-2xl bg-zinc-900/40 border border-zinc-800 px-4 py-2.5 text-xs text-zinc-400">
              <span>Your Remaining Balance:</span>
              <span className="font-black text-white flex items-center gap-1">
                <Coins className="h-3.5 w-3.5 text-amber-400" />
                {successReceipt.fanRemainingBalance.toLocaleString()} credits
              </span>
            </div>

            <button
              onClick={handleResetAndClose}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 py-3 font-black text-white shadow-xl shadow-emerald-600/30 hover:opacity-95 active:scale-95 transition-all"
            >
              <span>Done (View Live Stream)</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          /* ------------------------------------------------------------- */
          /* VIEW B: INITIAL CONFIRMATION SHEET FORM                      */
          /* ------------------------------------------------------------- */
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Interaction Title & Description */}
            <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-white">{item.title}</h4>
                <span className="rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 text-[9px] font-black uppercase">
                  {item.actionType || "Priority Ask"}
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {item.description || "Live prioritized on-camera creator response"}
              </p>
            </div>

            {/* Pricing & Balance Box (Prompt specification: "100 credits", "Your balance: 1,250") */}
            <div className="rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-950 border-2 border-pink-500/30 p-4 space-y-3 shadow-inner">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <span className="text-xs font-bold text-zinc-300">Interaction Price</span>
                <div className="flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-sm font-black text-amber-400 border border-amber-500/40">
                  <Coins className="h-4 w-4" />
                  <span>{priceCredits} credits</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-400">Your balance:</span>
                <span className="font-black text-white text-sm">
                  {walletBalance.toLocaleString()} credits
                </span>
              </div>

              {hasSufficientBalance ? (
                <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-800/80">
                  <span>Balance after purchase:</span>
                  <span className="font-bold text-zinc-300">
                    {balanceAfter.toLocaleString()} credits
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between text-xs text-rose-400 pt-1 border-t border-rose-500/20 font-bold">
                  <span>Insufficient balance:</span>
                  <button
                    onClick={onOpenWalletModal}
                    className="text-amber-400 underline hover:text-amber-300 font-black"
                  >
                    + Top Up Needed ({priceCredits - walletBalance} credits)
                  </button>
                </div>
              )}
            </div>

            {/* Custom Question / Note Input */}
            <div>
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                Your Live Question / Prompt (Optional)
              </label>
              <textarea
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="e.g., What advice would you give to your 20-year-old self?"
                rows={2}
                className="w-full rounded-2xl bg-zinc-900/80 border border-zinc-800 px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-pink-500 transition-colors resize-none"
              />
            </div>

            {/* Error Feedback Message */}
            {errorMessage && (
              <div className="flex items-center gap-2 rounded-2xl bg-rose-950/60 border border-rose-500/50 p-3 text-xs text-rose-300 animate-fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Authoritative Security Note */}
            <div className="flex items-center gap-2 text-[10px] text-zinc-500">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>
                Backend verifies price, eligibility, capacity, balance, and idempotency before queueing.
              </span>
            </div>

            {/* Confirm Action CTA Button */}
            <button
              onClick={handleConfirmPurchase}
              disabled={isSubmitting || !hasSufficientBalance}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-amber-500 py-3.5 font-black text-white shadow-xl shadow-pink-600/30 hover:opacity-95 active:scale-95 disabled:opacity-40 transition-all"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Verifying & Recording Purchase...</span>
                </>
              ) : hasSufficientBalance ? (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Confirm ({priceCredits} credits)</span>
                </>
              ) : (
                <>
                  <Coins className="h-4 w-4" />
                  <span>Top Up Wallet ({priceCredits} credits)</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
