"use client";

import React, { useState } from "react";
import {
  X,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  Lock,
  ArrowRight,
  Coins,
  Gift,
  RefreshCw,
  Server,
  Database,
  Check,
  AlertTriangle,
} from "lucide-react";
import { useUser } from "@/lib/user-context";
import { CREDIT_PACKAGES } from "@/modules/economic/payment.adapter";

interface PurchaseCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (creditsAdded: number, newBalance: number) => void;
}

type PurchaseFlowStep =
  | "SELECTION"
  | "CREATING_ORDER"
  | "PROVIDER_PROCESSING"
  | "AWAITING_WEBHOOK"
  | "SUCCESS"
  | "ERROR";

export function PurchaseCreditsModal({ isOpen, onClose, onSuccess }: PurchaseCreditsModalProps) {
  const { currentUser, updateBalance, refreshWallet } = useUser();
  const [selectedPkgId, setSelectedPkgId] = useState<string>("pkg_1100"); // Default to €10 / 1,100 credits
  const [flowStep, setFlowStep] = useState<PurchaseFlowStep>("SELECTION");
  const [stepDetails, setStepDetails] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Settlement Result Information
  const [settlementInfo, setSettlementInfo] = useState<{
    purchaseId?: string;
    transactionId?: string;
    creditsGranted?: number;
    newBalance?: number;
    pricePaid?: number;
    currency?: string;
  } | null>(null);

  if (!isOpen) return null;

  const selectedPackage =
    CREDIT_PACKAGES.find((p) => p.id === selectedPkgId) || CREDIT_PACKAGES[1];

  /**
   * Executes the Authoritative 11-Step Purchase Flow:
   * 1. User selects tier
   * 2. Browser asks backend to create purchase (Step 4)
   * 3. Backend creates internal purchase record (Step 5)
   * 4. Payment provider handles payment (Step 6)
   * 5. Provider sends server-side webhook to backend (Step 7)
   * 6. Backend verifies webhook HMAC signature (Step 8)
   * 7. Backend marks payment successful (Step 9)
   * 8. Wallet ledger receives credit transaction (Step 10)
   * 9. Frontend receives updated wallet state (Step 11)
   */
  const handleStartPurchase = async () => {
    setErrorMessage(null);
    setFlowStep("CREATING_ORDER");
    setStepDetails("Asking backend to create internal purchase record...");

    try {
      // ----------------------------------------------------------------------
      // STEP 4 & 5: Browser asks backend to create internal purchase record
      // ----------------------------------------------------------------------
      const createRes = await fetch("/api/economic/purchase/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          packageId: selectedPackage.id,
          paymentMethod: "CARD",
        }),
      });

      const createData = await createRes.json();
      if (!createRes.ok || !createData.success) {
        throw new Error(createData.error || "Failed to initialize purchase with backend.");
      }

      const purchaseId = createData.purchaseId;
      setStepDetails("Internal purchase record initialized with status: PENDING_WEBHOOK");

      // ----------------------------------------------------------------------
      // STEP 6: Payment provider handles payment
      // ----------------------------------------------------------------------
      setFlowStep("PROVIDER_PROCESSING");
      setStepDetails("Payment provider (Stripe/High-Risk Gateway) authorizing transaction...");

      // Simulate provider processing latency
      await new Promise((r) => setTimeout(r, 700));

      const providerRes = await fetch("/api/economic/checkout/mock-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseId,
          userId: currentUser.id,
          packageId: selectedPackage.id,
        }),
      });

      const providerData = await providerRes.json();
      if (!providerRes.ok || !providerData.success) {
        throw new Error(providerData.error || "Payment provider failed to authorize payment.");
      }

      // ----------------------------------------------------------------------
      // STEP 7, 8, 9, 10: Provider sends signed webhook -> Backend verifies & updates ledger
      // ----------------------------------------------------------------------
      setFlowStep("AWAITING_WEBHOOK");
      setStepDetails("Backend verifying server-side HMAC signature & crediting wallet ledger...");

      await new Promise((r) => setTimeout(r, 500));

      // ----------------------------------------------------------------------
      // STEP 11: Frontend receives authoritative updated wallet state
      // ----------------------------------------------------------------------
      const statusRes = await fetch(`/api/economic/purchase/${purchaseId}/status`);
      const statusData = await statusRes.json();

      if (!statusRes.ok || !statusData.purchase) {
        throw new Error("Failed to fetch authoritative wallet state from backend.");
      }

      const purchase = statusData.purchase;
      const totalCredited = purchase.totalCredits;
      const newWalletBalance = purchase.updatedWalletBalance;

      // Update client user context with server-authoritative balance
      updateBalance(newWalletBalance);
      await refreshWallet();

      setSettlementInfo({
        purchaseId,
        transactionId: providerData.transactionId || purchase.gatewayTransactionId,
        creditsGranted: totalCredited,
        newBalance: newWalletBalance,
        pricePaid: selectedPackage.priceFiat,
        currency: selectedPackage.currency,
      });

      setFlowStep("SUCCESS");

      if (onSuccess) {
        onSuccess(totalCredited, newWalletBalance);
      }
    } catch (err: any) {
      console.error("Purchase flow error:", err);
      setErrorMessage(err.message || "An error occurred during the purchase flow.");
      setFlowStep("ERROR");
    }
  };

  const handleReset = () => {
    setFlowStep("SELECTION");
    setErrorMessage(null);
    setSettlementInfo(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-pink-600/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-amber-600/15 blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors z-10"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-500/20 to-amber-500/20 text-amber-400 mb-3 ring-1 ring-amber-500/30">
            <Coins className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Buy Platform Credits</h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-md mx-auto">
            Server-authoritative double-entry ledger. Credits are minted only upon verified provider confirmation.
          </p>
        </div>

        {/* ================================================================= */}
        {/* STEP 1: PACKAGE SELECTION */}
        {/* ================================================================= */}
        {flowStep === "SELECTION" && (
          <div>
            <div className="grid grid-cols-1 gap-3 mb-6">
              {CREDIT_PACKAGES.map((pkg) => {
                const isSelected = selectedPkgId === pkg.id;
                const totalCredits = pkg.credits + pkg.bonusCredits;

                return (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPkgId(pkg.id)}
                    className={`relative cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
                      isSelected
                        ? "border-pink-500 bg-pink-500/10 shadow-lg shadow-pink-500/10 ring-1 ring-pink-500"
                        : "border-zinc-800/90 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900/80"
                    }`}
                  >
                    {/* Badge */}
                    {pkg.popular && (
                      <span className="absolute top-3 right-3 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider shadow-sm">
                        Most Popular
                      </span>
                    )}
                    {pkg.bestValue && (
                      <span className="absolute top-3 right-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider shadow-sm">
                        Best Value
                      </span>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Radio indicator */}
                        <div
                          className={`h-5 w-5 rounded-full border flex items-center justify-center transition-colors ${
                            isSelected
                              ? "border-pink-500 bg-pink-500"
                              : "border-zinc-600 bg-transparent"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 text-white stroke-[3]" />}
                        </div>

                        <div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-extrabold text-white">
                              {totalCredits.toLocaleString()}
                            </span>
                            <span className="text-xs font-semibold text-amber-400">credits</span>
                          </div>

                          {pkg.bonusCredits > 0 ? (
                            <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1 mt-0.5">
                              <Gift className="h-3 w-3" />
                              {pkg.credits.toLocaleString()} base + {pkg.bonusCredits.toLocaleString()} bonus
                            </span>
                          ) : (
                            <span className="text-[11px] text-zinc-400 mt-0.5 block">
                              Standard Tier
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Pricing */}
                      <div className="text-right">
                        <div className="text-xl font-extrabold text-white">
                          €{pkg.priceFiat.toFixed(0)}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-medium">EUR</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Architecture Assurance Banner */}
            <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-3.5 mb-6 text-xs text-zinc-300">
              <div className="flex items-center gap-2 font-semibold text-emerald-400 mb-1">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>Backend Authority Guarantee</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                The frontend never declares payment success. The wallet ledger credits funds only when the payment provider issues a cryptographically verified server-side webhook.
              </p>
            </div>

            {/* Action Button */}
            <button
              onClick={handleStartPurchase}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-pink-500 py-3.5 px-6 font-bold text-white shadow-xl shadow-pink-600/25 hover:from-pink-500 hover:to-rose-500 transition-all active:scale-[0.99]"
            >
              <span>Buy {(selectedPackage.credits + selectedPackage.bonusCredits).toLocaleString()} credits for €{selectedPackage.priceFiat.toFixed(0)}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* STEP 2, 3, 4: LIVE PROCESSING PIPELINE */}
        {/* ================================================================= */}
        {(flowStep === "CREATING_ORDER" ||
          flowStep === "PROVIDER_PROCESSING" ||
          flowStep === "AWAITING_WEBHOOK") && (
          <div className="py-6 text-center">
            {/* Animated Spinner */}
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-pink-500/10 border border-pink-500/30 text-pink-400 mb-6">
              <RefreshCw className="h-8 w-8 animate-spin text-pink-500" />
            </div>

            <h3 className="text-lg font-bold text-white mb-2">
              Processing Authoritative Purchase Flow
            </h3>
            <p className="text-xs text-zinc-400 mb-8 max-w-sm mx-auto">{stepDetails}</p>

            {/* Multi-step pipeline tracker */}
            <div className="space-y-3 text-left max-w-md mx-auto bg-zinc-900/50 rounded-2xl border border-zinc-800/80 p-4">
              {/* Step A: Backend purchase record */}
              <div className="flex items-center gap-3 text-xs">
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                    flowStep === "CREATING_ORDER"
                      ? "bg-pink-500/20 text-pink-400 border border-pink-500 animate-pulse"
                      : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  }`}
                >
                  {flowStep === "CREATING_ORDER" ? "1" : <Check className="h-3.5 w-3.5" />}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-zinc-200">1. Internal Purchase Record</div>
                  <div className="text-[10px] text-zinc-500">Backend creates pending transaction</div>
                </div>
              </div>

              {/* Step B: Provider handles payment */}
              <div className="flex items-center gap-3 text-xs">
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                    flowStep === "PROVIDER_PROCESSING"
                      ? "bg-pink-500/20 text-pink-400 border border-pink-500 animate-pulse"
                      : flowStep === "AWAITING_WEBHOOK" || flowStep === "SUCCESS"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {flowStep === "AWAITING_WEBHOOK" || flowStep === "SUCCESS" ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    "2"
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-zinc-200">2. Provider Authorization</div>
                  <div className="text-[10px] text-zinc-500">Stripe / High-Risk Gateway charge</div>
                </div>
              </div>

              {/* Step C: Server Webhook Verification & Ledger Mint */}
              <div className="flex items-center gap-3 text-xs">
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                    flowStep === "AWAITING_WEBHOOK"
                      ? "bg-pink-500/20 text-pink-400 border border-pink-500 animate-pulse"
                      : flowStep === "SUCCESS"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {flowStep === "SUCCESS" ? <Check className="h-3.5 w-3.5" /> : "3"}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-zinc-200">3. HMAC Webhook & Ledger Credit</div>
                  <div className="text-[10px] text-zinc-500">Backend verifies signature & mints tokens</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* STEP 5: SUCCESS STATE & RECEIPT */}
        {/* ================================================================= */}
        {flowStep === "SUCCESS" && settlementInfo && (
          <div className="text-center py-4">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mb-4 animate-bounce">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>

            <h3 className="text-2xl font-extrabold text-white mb-1">
              +{settlementInfo.creditsGranted?.toLocaleString()} Credits Added!
            </h3>
            <p className="text-xs text-zinc-400 mb-6">
              Verified by backend authority and credited to your immutable wallet ledger.
            </p>

            {/* Authoritative Ledger Receipt Card */}
            <div className="bg-zinc-900/80 rounded-2xl border border-zinc-800 p-4 mb-6 text-left text-xs space-y-2.5">
              <div className="flex justify-between items-center text-zinc-400">
                <span>Payment Amount</span>
                <span className="font-bold text-white">€{settlementInfo.pricePaid?.toFixed(2)} EUR</span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>Credits Credited</span>
                <span className="font-bold text-amber-400">+{settlementInfo.creditsGranted?.toLocaleString()} credits</span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>New Wallet Balance</span>
                <span className="font-bold text-emerald-400">{currentUser.walletBalance.toLocaleString()} credits</span>
              </div>
              <div className="border-t border-zinc-800/80 pt-2 flex justify-between items-center text-zinc-500 text-[10px]">
                <span>Ledger Transaction Ref</span>
                <span className="font-mono text-zinc-400">{settlementInfo.transactionId}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full rounded-2xl bg-zinc-800 hover:bg-zinc-700 py-3.5 px-6 font-bold text-white transition-all"
            >
              Done
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* ERROR STATE */}
        {/* ================================================================= */}
        {flowStep === "ERROR" && (
          <div className="text-center py-4">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-500/20 text-rose-400 border border-rose-500/40 mb-4">
              <AlertTriangle className="h-8 w-8 text-rose-400" />
            </div>

            <h3 className="text-xl font-bold text-white mb-2">Purchase Verification Failed</h3>
            <p className="text-xs text-rose-300 mb-6 bg-rose-950/40 border border-rose-800/50 rounded-xl p-3 max-w-md mx-auto">
              {errorMessage || "Payment could not be confirmed by backend authority."}
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 rounded-2xl bg-pink-600 hover:bg-pink-500 py-3 px-4 font-bold text-white transition-all text-xs"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="flex-1 rounded-2xl bg-zinc-800 hover:bg-zinc-700 py-3 px-4 font-bold text-zinc-300 transition-all text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
