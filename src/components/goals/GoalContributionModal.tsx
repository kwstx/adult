"use client";

import React, { useState } from "react";
import { Coins, Flame, Sparkles, X, MessageSquare, ShieldCheck, Heart } from "lucide-react";
import { useUser } from "@/lib/user-context";

interface GoalContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContribute: (amount: number, message?: string, isAnonymous?: boolean) => Promise<boolean>;
  goalTitle: string;
  targetCredits: number;
  currentCredits: number;
}

const PRESET_AMOUNTS = [100, 500, 1000, 2500, 5000, 10000];

export function GoalContributionModal({
  isOpen,
  onClose,
  onContribute,
  goalTitle,
  targetCredits,
  currentCredits,
}: GoalContributionModalProps) {
  const { currentUser } = useUser();
  const [selectedAmount, setSelectedAmount] = useState<number>(500);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const activeAmount = customAmount ? parseInt(customAmount, 10) || 0 : selectedAmount;
  const remainingToGoal = Math.max(0, targetCredits - currentCredits);
  const hasSufficientBalance = currentUser.walletBalance >= activeAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeAmount <= 0 || !hasSufficientBalance || isSubmitting) return;

    setIsSubmitting(true);
    const success = await onContribute(activeAmount, message.trim() || undefined, isAnonymous);
    setIsSubmitting(false);

    if (success) {
      onClose();
      setMessage("");
      setCustomAmount("");
      setSelectedAmount(500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-7 shadow-2xl ring-1 ring-white/10">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500/20 to-pink-500/20 border border-amber-500/30 text-amber-400">
            <Flame className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-black uppercase text-white tracking-wide">
              Contribute to {goalTitle}
            </h3>
            <p className="text-xs text-zinc-400">
              {remainingToGoal.toLocaleString()} tokens remaining to unlock!
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Preset Contribution Chips */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 block">
              Select Token Amount
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_AMOUNTS.map((amt) => {
                const isSelected = !customAmount && selectedAmount === amt;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setCustomAmount("");
                      setSelectedAmount(amt);
                    }}
                    className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-3 text-xs font-bold transition-all ${
                      isSelected
                        ? "border border-amber-500/80 bg-gradient-to-r from-amber-500/20 to-pink-500/20 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                        : "border border-zinc-800 bg-zinc-900/70 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <Coins className="h-3.5 w-3.5 text-amber-400" />
                    <span>+{amt.toLocaleString()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Amount Field */}
          <div>
            <div className="relative">
              <input
                type="number"
                min="1"
                placeholder="Or enter custom token amount..."
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 py-3 pl-4 pr-16 text-sm font-semibold text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-extrabold text-amber-400">
                TOKENS
              </span>
            </div>
          </div>

          {/* Cheer Message Field */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-pink-400" />
              <span>Cheer Message (Optional)</span>
            </label>
            <input
              type="text"
              maxLength={100}
              placeholder="e.g. Let's unlock the midnight show! 🔥"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 py-2.5 px-3.5 text-xs text-white placeholder-zinc-500 focus:border-pink-500 focus:outline-none"
            />
          </div>

          {/* Anonymous Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-zinc-400" />
              <span className="text-xs text-zinc-300 font-medium">Contribute Anonymously</span>
            </div>
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-amber-500 focus:ring-0 focus:ring-offset-0"
            />
          </div>

          {/* Wallet Balance Check */}
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-zinc-400">Your Wallet Balance:</span>
            <span
              className={hasSufficientBalance ? "text-emerald-400" : "text-rose-400 font-bold"}
            >
              {currentUser.walletBalance.toLocaleString()} tokens
            </span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={activeAmount <= 0 || !hasSufficientBalance || isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-pink-600 py-3.5 text-sm font-black uppercase tracking-wider text-white shadow-[0_0_25px_rgba(245,158,11,0.35)] hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? (
              <Sparkles className="h-4 w-4 animate-spin" />
            ) : (
              <Heart className="h-4 w-4 fill-white text-white" />
            )}
            <span>
              Chip In {activeAmount > 0 ? activeAmount.toLocaleString() : 0} Tokens
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
