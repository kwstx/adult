"use client";

import React, { useState } from "react";
import { X, Sparkles, Coins, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { useUser } from "@/lib/user-context";

export interface MenuItem {
  id: string;
  title: string;
  description: string | null;
  creditCost: number;
  actionType: string;
}

interface TipMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorId: string;
  creatorName: string;
  menuItems: MenuItem[];
  onOpenWalletModal: () => void;
}

export function TipMenuModal({
  isOpen,
  onClose,
  creatorId,
  creatorName,
  menuItems,
  onOpenWalletModal,
}: TipMenuModalProps) {
  const { currentUser, updateBalance } = useUser();
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [customAmount, setCustomAmount] = useState<string>("50");
  const [customMessage, setCustomMessage] = useState<string>("");
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const cost = selectedItem ? selectedItem.creditCost : Number(customAmount) || 0;
  const hasEnoughTokens = currentUser.walletBalance >= cost;

  const handleSendTip = async () => {
    if (cost <= 0) return;
    if (!hasEnoughTokens) {
      setErrorMsg("Insufficient tokens. Please top up your wallet.");
      return;
    }

    setIsSending(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/economic/tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fanUserId: currentUser.id,
          creatorId,
          credits: cost,
          menuItemId: selectedItem?.id,
          customMessage: customMessage || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process tip.");
      }

      // Update remaining balance locally
      updateBalance(data.fanRemainingBalance);
      setSuccessMsg(`Sent ${cost} tokens to ${creatorName}! 🎉`);
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-7 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-500 text-white shadow-lg shadow-pink-600/30">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Tip & Trigger Interactions</h2>
            <p className="text-xs text-zinc-400">Support {creatorName} and trigger live stream effects</p>
          </div>
        </div>

        {/* Status Messages */}
        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl bg-rose-950/60 border border-rose-500/40 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <div className="flex-1">{errorMsg}</div>
            {!hasEnoughTokens && (
              <button
                onClick={() => {
                  onClose();
                  onOpenWalletModal();
                }}
                className="font-bold underline text-amber-400 ml-2"
              >
                Buy Tokens
              </button>
            )}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 p-3 text-xs text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <div>{successMsg}</div>
          </div>
        )}

        {/* Menu Items Grid */}
        <div className="mb-4">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2 block">
            Select Live Interaction
          </label>
          <div className="grid grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
            {menuItems.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(isSelected ? null : item)}
                  type="button"
                  className={`flex flex-col items-start p-3 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? "border-pink-500 bg-pink-500/15 shadow-md shadow-pink-500/10 ring-1 ring-pink-500"
                      : "border-zinc-800/80 bg-zinc-900/60 hover:bg-zinc-900 hover:border-zinc-700"
                  }`}
                >
                  <span className="text-xs font-bold text-white">{item.title}</span>
                  <span className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">
                    {item.description || "Live performance trigger"}
                  </span>
                  <div className="mt-2 flex items-center gap-1 text-xs font-extrabold text-amber-400">
                    <Coins className="h-3 w-3" />
                    <span>{item.creditCost} Tokens</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Tip Amount if no item selected */}
        {!selectedItem && (
          <div className="mb-4">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5 block">
              Custom Token Amount
            </label>
            <div className="flex items-center gap-2">
              {["25", "50", "100", "250", "500"].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setCustomAmount(amt)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    customAmount === amt
                      ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                      : "bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800"
                  }`}
                >
                  {amt}
                </button>
              ))}
              <input
                type="number"
                min="1"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="w-20 rounded-xl bg-zinc-900 px-2.5 py-1.5 text-xs font-bold text-white border border-zinc-800 focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Custom Message Input */}
        <div className="mb-5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5 block">
            Tip Message (Broadcasts to stream chat)
          </label>
          <input
            type="text"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Add a cheering message or request..."
            maxLength={140}
            className="w-full rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs text-white placeholder-zinc-500 border border-zinc-800 focus:border-pink-500 focus:outline-none"
          />
        </div>

        {/* Balance & Action Bar */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80">
          <div className="text-left">
            <p className="text-[10px] text-zinc-500 uppercase font-semibold">Your Balance</p>
            <p className="text-xs font-extrabold text-amber-400">
              {currentUser.walletBalance.toLocaleString()} Tokens
            </p>
          </div>

          <button
            onClick={handleSendTip}
            disabled={isSending || cost <= 0}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-pink-500 px-6 py-3 font-bold text-white shadow-xl shadow-pink-600/30 hover:from-pink-500 hover:to-rose-500 disabled:opacity-40 transition-all"
          >
            {isSending ? (
              <span className="animate-pulse">Deducting & Broadcasting...</span>
            ) : (
              <>
                <span>Send {cost} Tokens</span>
                <Send className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
