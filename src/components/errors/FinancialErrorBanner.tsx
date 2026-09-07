"use client";

import React from "react";
import { ShieldCheck, Clock, AlertTriangle, RefreshCw, X } from "lucide-react";

export type FinancialBannerVariant =
  | "PAYMENT_PENDING"
  | "PAYMENT_FAILED_NO_CHARGE"
  | "GENERIC_ERROR_NO_CHARGE"
  | "INSUFFICIENT_CREDITS";

export interface FinancialErrorBannerProps {
  variant?: FinancialBannerVariant;
  title?: string;
  message?: string;
  onRetry?: () => void;
  onClose?: () => void;
  className?: string;
}

export function FinancialErrorBanner({
  variant = "GENERIC_ERROR_NO_CHARGE",
  title,
  message,
  onRetry,
  onClose,
  className = "",
}: FinancialErrorBannerProps) {
  // Variant configurations
  const config = {
    PAYMENT_PENDING: {
      defaultTitle: "Payment pending",
      defaultMessage: "Your payment is being confirmed. Credits will appear once finalized.",
      icon: Clock,
      borderStyle: "border-amber-500/40 bg-amber-950/30 text-amber-200",
      iconStyle: "text-amber-400",
      badgeText: "Awaiting confirmation",
      badgeStyle: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    },
    PAYMENT_FAILED_NO_CHARGE: {
      defaultTitle: "Payment failed — your wallet was not charged.",
      defaultMessage: "The transaction could not be completed. Your funds are safe.",
      icon: ShieldCheck,
      borderStyle: "border-rose-500/40 bg-rose-950/30 text-rose-200",
      iconStyle: "text-emerald-400",
      badgeText: "Wallet not charged",
      badgeStyle: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    },
    GENERIC_ERROR_NO_CHARGE: {
      defaultTitle: "Something went wrong",
      defaultMessage: "Your credits were not charged. Try again.",
      icon: ShieldCheck,
      borderStyle: "border-zinc-800 bg-zinc-900/90 text-zinc-300",
      iconStyle: "text-emerald-400",
      badgeText: "Credits not charged",
      badgeStyle: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    },
    INSUFFICIENT_CREDITS: {
      defaultTitle: "Insufficient credits",
      defaultMessage: "Your wallet balance is lower than the required amount. Your wallet was not charged.",
      icon: AlertTriangle,
      borderStyle: "border-amber-500/30 bg-zinc-900/90 text-amber-200",
      iconStyle: "text-amber-400",
      badgeText: "Top Up Needed",
      badgeStyle: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    },
  }[variant];

  const Icon = config.icon;
  const displayTitle = title || config.defaultTitle;
  const displayMessage = message || config.defaultMessage;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-4 shadow-lg backdrop-blur-md transition-all select-none animate-fade-in ${config.borderStyle} ${className}`}
    >
      <div className="flex items-start gap-3">
        {/* Leading icon */}
        <div className="mt-0.5 shrink-0">
          <Icon className={`h-5 w-5 ${config.iconStyle}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-extrabold text-sm text-white tracking-tight">
              {displayTitle}
            </h4>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${config.badgeStyle}`}
            >
              {config.badgeText}
            </span>
          </div>

          <p className="text-xs opacity-90 leading-relaxed">
            {displayMessage}
          </p>

          {/* Action Row */}
          {onRetry && (
            <div className="pt-2">
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 px-3 py-1.5 font-bold text-white text-xs transition-all active:scale-95 shadow-md shadow-pink-600/25"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Try again</span>
              </button>
            </div>
          )}
        </div>

        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-full p-1 opacity-60 hover:opacity-100 hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
