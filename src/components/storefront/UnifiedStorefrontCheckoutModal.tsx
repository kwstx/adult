"use client";

import React, { useState } from "react";
import {
  X,
  Coins,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Lock,
  ArrowRight,
  AlertCircle,
  Plus,
  Crown,
  Loader2,
} from "lucide-react";
import { CheckoutItemPayload, CreatorIdentity } from "./types";
import { useUser } from "@/lib/user-context";

interface UnifiedStorefrontCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: CheckoutItemPayload | null;
  creator: CreatorIdentity;
  onPurchaseSuccess: (checkoutType: string, result: any) => void;
  onOpenWalletTopup: () => void;
}

export function UnifiedStorefrontCheckoutModal({
  isOpen,
  onClose,
  item,
  creator,
  onPurchaseSuccess,
  onOpenWalletTopup,
}: UnifiedStorefrontCheckoutModalProps) {
  const { currentUser, updateBalance } = useUser();
  const [customNotes, setCustomNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen || !item) return null;

  const userBalance = currentUser?.walletBalance || 0;
  const isInsufficient = userBalance < item.priceCredits;
  const tokensNeeded = Math.max(0, item.priceCredits - userBalance);

  const handleExecutePurchase = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/storefront/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutType: item.checkoutType,
          fanUserId: currentUser.id,
          creatorProfileId: item.creatorProfileId || creator.id,
          productId: item.productId,
          contentId: item.contentId,
          interactionDefinitionId: item.interactionDefinitionId,
          credits: item.priceCredits,
          durationMinutes: item.durationMinutes,
          slotTime: item.slotTime,
          livestreamId: item.livestreamId,
          customNotes: customNotes.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to complete purchase.");
      }

      // Optimistically update wallet balance
      const newBalance = Math.max(0, userBalance - item.priceCredits);
      updateBalance(newBalance);

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onPurchaseSuccess(item.checkoutType, data.result);
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error("Checkout failed:", err);
      setErrorMessage(err.message || "Checkout error. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-md p-0 sm:p-4 animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={isProcessing ? undefined : onClose} />

      {/* Modal Container */}
      <div className="relative z-10 flex w-full max-w-lg flex-col rounded-t-3xl sm:rounded-3xl border border-zinc-800/90 bg-zinc-950 shadow-2xl overflow-hidden animate-slide-up">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-900 bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30 font-black text-xs">
              🛍️
            </span>
            <div>
              <h3 className="text-sm font-black text-white">Unified Storefront Checkout</h3>
              <p className="text-[11px] text-zinc-400">Buying from {creator.displayName}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Success Celebration View */}
          {isSuccess ? (
            <div className="py-8 text-center space-y-3 animate-fade-in">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mx-auto shadow-2xl">
                <CheckCircle2 className="h-9 w-9 animate-bounce" />
              </div>
              <h4 className="text-lg font-black text-white">Purchase Confirmed!</h4>
              <p className="text-xs text-zinc-400">
                Your order has been recorded in the platform ledger. Unlocked instantly!
              </p>
            </div>
          ) : (
            <>
              {/* Item Card Summary */}
              <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800">
                <div className="flex items-start gap-3.5">
                  <img
                    src={creator.avatarUrl}
                    alt={creator.displayName}
                    className="h-12 w-12 rounded-2xl object-cover ring-2 ring-pink-500/40 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <h4 className="text-sm font-black text-white">{item.title}</h4>
                      {item.badge && (
                        <span className="rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/30 px-2 py-0.2 text-[9px] font-black">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 text-base font-black text-amber-400">
                    <Coins className="h-4 w-4" />
                    <span>{item.priceCredits}</span>
                  </div>
                  {item.priceFiatFormatted && (
                    <span className="text-[10px] text-zinc-500 font-semibold">
                      {item.priceFiatFormatted}
                    </span>
                  )}
                </div>
              </div>

              {/* Custom Notes / Instructions Input (if required) */}
              {item.customNotesRequired && (
                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                    {item.customNotesLabel || "Dedication or Custom Request Instructions:"}
                  </label>
                  <textarea
                    rows={2}
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    placeholder="Enter your message or instructions for the creator..."
                    className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 p-3 text-xs text-white placeholder-zinc-500 focus:border-pink-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Wallet Balance Status Bar */}
              <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 font-medium">Your Token Balance:</span>
                  <span className="font-extrabold text-amber-400 flex items-center gap-1">
                    <Coins className="h-3.5 w-3.5" />
                    {userBalance.toLocaleString()} Tokens
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-800/60">
                  <span className="text-zinc-400 font-medium">Total Cost:</span>
                  <span className="font-extrabold text-white flex items-center gap-1">
                    <Coins className="h-3.5 w-3.5 text-pink-400" />
                    {item.priceCredits.toLocaleString()} Tokens
                  </span>
                </div>

                {isInsufficient && (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                      <span>Need {tokensNeeded.toLocaleString()} more tokens</span>
                    </div>

                    <button
                      onClick={() => {
                        onClose();
                        onOpenWalletTopup();
                      }}
                      className="flex items-center gap-1 rounded-xl bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-xs font-black text-black transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Top Up</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/60 text-rose-300 text-xs">
                  {errorMessage}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2">
                {isInsufficient ? (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenWalletTopup();
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-pink-600 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-xl hover:brightness-110 active:scale-95 transition-all"
                  >
                    <Coins className="h-4 w-4" />
                    <span>Top Up Wallet (+{tokensNeeded} Tokens Needed)</span>
                  </button>
                ) : (
                  <button
                    onClick={handleExecutePurchase}
                    disabled={isProcessing}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-amber-500 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-xl shadow-pink-600/30 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Authorizing Double-Entry Ledger...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>Confirm Purchase ({item.priceCredits} Tokens)</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-500 text-center">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>2257 Compliant • 256-Bit Financial Encryption • Instant Delivery</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
