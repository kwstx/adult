"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  Clock,
  Coins,
  Copy,
  Check,
  XCircle,
  HelpCircle,
  ArrowRight,
} from "lucide-react";
import { ParsedProductError } from "@/lib/errors/client-error";

export interface ProductErrorStateProps {
  error: ParsedProductError | null;
  onRetry?: () => void;
  onTopUp?: () => void;
  onDismiss?: () => void;
  className?: string;
  compact?: boolean;
}

export function ProductErrorState({
  error,
  onRetry,
  onTopUp,
  onDismiss,
  className = "",
  compact = false,
}: ProductErrorStateProps) {
  const [copied, setCopied] = useState(false);

  if (!error) return null;

  const isPending = error.code === "PAYMENT_PENDING";
  const isInsufficient = error.code === "INSUFFICIENT_FUNDS";
  const isFinancial = error.category === "FINANCIAL";

  const handleCopyRef = () => {
    if (error.requestId) {
      navigator.clipboard.writeText(error.requestId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Compact Mode (inline card inside drawers/modals)
  if (compact) {
    return (
      <div
        className={`rounded-2xl border p-4 text-xs select-none animate-fade-in ${
          isPending
            ? "border-amber-500/40 bg-amber-950/30 text-amber-300"
            : error.walletCharged
            ? "border-rose-500/50 bg-rose-950/40 text-rose-300"
            : "border-zinc-800 bg-zinc-900/90 text-zinc-200"
        } ${className}`}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            {isPending ? (
              <Clock className="h-5 w-5 text-amber-400 animate-pulse" />
            ) : error.walletCharged ? (
              <AlertTriangle className="h-5 w-5 text-rose-400" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="font-bold text-white flex items-center justify-between gap-2">
              <span>{error.userTitle}</span>
              {!error.walletCharged && !isPending && (
                <span className="shrink-0 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  Wallet not charged
                </span>
              )}
            </div>

            <p className="text-zinc-400 text-[11px] leading-relaxed">
              {error.userMessage}
            </p>

            {/* Compact Action CTAs */}
            <div className="pt-2 flex flex-wrap items-center gap-2">
              {error.isRetryable && onRetry && (
                <button
                  onClick={onRetry}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 px-3 py-1.5 font-bold text-white text-[11px] transition-all active:scale-95 shadow-md shadow-pink-600/20"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Try again</span>
                </button>
              )}

              {isInsufficient && onTopUp && (
                <button
                  onClick={onTopUp}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-3 py-1.5 font-bold text-zinc-950 text-[11px] transition-all active:scale-95 shadow-md shadow-amber-500/20"
                >
                  <Coins className="h-3 w-3" />
                  <span>Top Up Credits</span>
                </button>
              )}

              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="rounded-xl bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1.5 text-zinc-400 hover:text-white text-[11px] transition-colors"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full Rich Product State Card
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-zinc-800/90 bg-zinc-950/95 p-6 sm:p-8 shadow-2xl text-center backdrop-blur-xl animate-fade-in ${className}`}
    >
      {/* Background glow */}
      <div
        className={`absolute -top-20 -left-20 h-44 w-44 rounded-full blur-3xl pointer-events-none ${
          isPending
            ? "bg-amber-500/10"
            : error.walletCharged
            ? "bg-rose-600/10"
            : "bg-pink-600/10"
        }`}
      />

      {/* Main Illustration Icon */}
      <div className="relative mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-3xl border shadow-xl">
        {isPending ? (
          <div className="h-full w-full flex items-center justify-center bg-amber-500/10 border-amber-500/30 text-amber-400 rounded-3xl">
            <Clock className="h-8 w-8 animate-pulse text-amber-400" />
          </div>
        ) : error.walletCharged ? (
          <div className="h-full w-full flex items-center justify-center bg-rose-500/10 border-rose-500/30 text-rose-400 rounded-3xl">
            <AlertTriangle className="h-8 w-8 text-rose-400" />
          </div>
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-zinc-900 border-zinc-800 text-pink-400 rounded-3xl">
            <ShieldCheck className="h-8 w-8 text-emerald-400" />
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2">
        {error.userTitle}
      </h3>

      {/* Reassurance Badge */}
      <div className="mb-4 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold tracking-wide">
        {isPending ? (
          <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-full px-3 py-1 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 animate-spin" />
            <span>Processing with payment provider</span>
          </span>
        ) : !error.walletCharged ? (
          <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-full px-3 py-1 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Your credits were not charged</span>
          </span>
        ) : (
          <span className="bg-rose-500/15 text-rose-300 border border-rose-500/30 rounded-full px-3 py-1 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
            <span>Transaction flagged for audit</span>
          </span>
        )}
      </div>

      {/* Helpful Subtitle */}
      <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed mb-6">
        {error.userMessage}
      </p>

      {/* Primary Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-sm mx-auto">
        {error.isRetryable && onRetry && (
          <button
            onClick={onRetry}
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-pink-500 py-3 px-6 font-bold text-white shadow-xl shadow-pink-600/25 hover:from-pink-500 hover:to-rose-500 transition-all active:scale-95"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Try again</span>
          </button>
        )}

        {isInsufficient && onTopUp && (
          <button
            onClick={onTopUp}
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 px-6 font-bold text-zinc-950 shadow-xl shadow-amber-500/25 hover:from-amber-400 hover:to-orange-400 transition-all active:scale-95"
          >
            <Coins className="h-4 w-4" />
            <span>Top Up Credits</span>
          </button>
        )}

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="w-full sm:w-auto rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 py-3 px-5 font-semibold text-zinc-300 hover:text-white transition-colors"
          >
            Dismiss
          </button>
        )}
      </div>

      {/* Support Reference Footer */}
      {error.requestId && (
        <div className="mt-6 pt-4 border-t border-zinc-900 flex items-center justify-center gap-2 text-[11px] text-zinc-500">
          <span>Support Reference:</span>
          <button
            onClick={handleCopyRef}
            className="font-mono text-zinc-400 hover:text-white inline-flex items-center gap-1 bg-zinc-900/80 px-2 py-0.5 rounded border border-zinc-800 transition-colors"
            title="Click to copy support reference"
          >
            <span>{error.requestId}</span>
            {copied ? (
              <Check className="h-3 w-3 text-emerald-400" />
            ) : (
              <Copy className="h-3 w-3 text-zinc-500" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
