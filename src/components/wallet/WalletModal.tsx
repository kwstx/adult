"use client";

import React, { useState } from "react";
import { X, Sparkles, CheckCircle2, ShieldCheck, CreditCard, Lock, ArrowRight, Coins, Gift } from "lucide-react";
import { useUser } from "@/lib/user-context";
import { CREDIT_PACKAGES } from "@/modules/economic/payment.adapter";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { currentUser, updateBalance } = useUser();
  const [selectedPkgId, setSelectedPkgId] = useState<string>("pkg_popular");
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCheckout = async () => {
    setIsProcessing(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/economic/checkout/mock-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          packageId: selectedPkgId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Checkout failed");
      }

      // Update local wallet balance state
      const grantedCredits = data.session?.creditsToGrant || 0;
      updateBalance(currentUser.walletBalance + grantedCredits);
      setSuccessMessage(data.message || `Added ${grantedCredits.toLocaleString()} credits to your wallet!`);
    } catch (err: any) {
      setErrorMessage(err.message || "Payment processing encountered an error.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 mb-3 ring-1 ring-amber-500/40">
            <Coins className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold text-white">Buy Platform Credits</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Authoritative double-entry ledger with discrete billing and non-expiring purchased funds.
          </p>
        </div>

        {/* Success or Error Feedback */}
        {successMessage && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 p-4 text-emerald-300 text-sm">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl bg-rose-950/60 border border-rose-500/40 p-4 text-rose-300 text-sm">
            <X className="h-5 w-5 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Package Selector Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {CREDIT_PACKAGES.map((pkg) => {
            const isSelected = selectedPkgId === pkg.id;
            const totalCredits = pkg.credits + pkg.bonusCredits;

            return (
              <button
                key={pkg.id}
                onClick={() => setSelectedPkgId(pkg.id)}
                type="button"
                className={`relative flex flex-col items-start p-4 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? "border-pink-500 bg-pink-500/10 shadow-lg shadow-pink-500/10 ring-1 ring-pink-500"
                    : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900"
                }`}
              >
                {pkg.popular && (
                  <span className="absolute top-3 right-3 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                    Most Popular
                  </span>
                )}
                <span className="text-xs font-semibold text-zinc-400">{pkg.name}</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-extrabold text-white">
                    {totalCredits.toLocaleString()}
                  </span>
                  <span className="text-xs font-semibold text-amber-400">credits</span>
                </div>
                {pkg.bonusCredits > 0 && (
                  <span className="text-[11px] font-medium text-emerald-400 mt-0.5 flex items-center gap-1">
                    <Gift className="h-3 w-3" />
                    +{pkg.bonusCredits} Bonus Included
                  </span>
                )}
                <div className="mt-3 text-sm font-bold text-zinc-200">
                  {pkg.currency === "EUR" ? "€" : "$"}{pkg.priceFiat.toFixed(2)} {pkg.currency}
                </div>
              </button>
            );
          })}
        </div>

        {/* Trust & Underwriting Notice */}
        <div className="rounded-xl bg-zinc-900/40 border border-zinc-800/80 p-3 mb-6 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-emerald-400" />
            <span>256-bit Encrypted SSL High-Risk Underwriting</span>
          </div>
          <span className="text-[10px] text-zinc-500">Billed discretely</span>
        </div>

        {/* Action Button */}
        <button
          onClick={handleCheckout}
          disabled={isProcessing}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-pink-500 py-3.5 px-6 font-bold text-white shadow-xl shadow-pink-600/25 hover:from-pink-500 hover:to-rose-500 transition-all disabled:opacity-50"
        >
          {isProcessing ? (
            <span className="animate-pulse">Authorizing High-Risk Gateway...</span>
          ) : (
            <>
              <span>Load Credits Now</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
