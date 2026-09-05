"use client";

import React, { useState } from "react";
import { X, Sparkles, Coins, Send, CheckCircle2, AlertCircle, Plus, Zap, Heart, Gift } from "lucide-react";
import { useUser } from "@/lib/user-context";

export interface MenuItem {
  id: string;
  title: string;
  description: string | null;
  creditCost: number;
  actionType: string;
}

interface GiftingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  creatorId: string;
  creatorName: string;
  menuItems: MenuItem[];
  onOpenWalletModal: () => void;
  onTipSent?: (amount: number) => void;
}

const DEFAULT_ITEMS: MenuItem[] = [
  {
    id: "tip_heart",
    title: "Love Spark ❤️",
    description: "Send a flurry of neon hearts on stream",
    creditCost: 25,
    actionType: "ALERT_SOUND",
  },
  {
    id: "tip_dance",
    title: "Mini Dance (30s) 💃",
    description: "Dedicated freestyle dance performance",
    creditCost: 50,
    actionType: "DANCE",
  },
  {
    id: "tip_wheel",
    title: "Spin the Wheel 🎡",
    description: "Live spin with dares, cards & shoutouts",
    creditCost: 100,
    actionType: "WHEEL_SPIN",
  },
  {
    id: "tip_confetti",
    title: "Neon Confetti Pop 🎊",
    description: "Room-wide celebration effect with physical popper",
    creditCost: 250,
    actionType: "ALERT_SOUND",
  },
  {
    id: "tip_spotlight",
    title: "VIP Highlight Spotlight ⭐",
    description: "Pinned spotlight chat message with golden badge for 5 mins",
    creditCost: 500,
    actionType: "CHAT_HIGHLIGHT",
  },
  {
    id: "tip_crown",
    title: "Royal Queen Crown 👑",
    description: "Massive screen takeover animation & top tipper status",
    creditCost: 1000,
    actionType: "CUSTOM",
  },
];

export function GiftingDrawer({
  isOpen,
  onClose,
  creatorId,
  creatorName,
  menuItems = [],
  onOpenWalletModal,
  onTipSent,
}: GiftingDrawerProps) {
  const { currentUser, updateBalance } = useUser();
  const itemsToRender = menuItems.length > 0 ? menuItems : DEFAULT_ITEMS;

  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(itemsToRender[0] || null);
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
          menuItemId: selectedItem?.id.startsWith("tip_") ? undefined : selectedItem?.id,
          customMessage: customMessage || selectedItem?.title || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process gift.");
      }

      updateBalance(data.fanRemainingBalance);
      if (onTipSent) onTipSent(cost);

      setSuccessMsg(`Sent ${cost} tokens to ${creatorName}! 🎉`);
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center p-0 sm:p-4 animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 flex max-h-[85vh] sm:max-h-[640px] w-full max-w-lg flex-col rounded-t-3xl sm:rounded-3xl border border-zinc-800/90 bg-zinc-950/95 shadow-2xl backdrop-blur-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-4 bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-600 to-amber-500 text-white shadow-md shadow-pink-600/30">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">Send Gifts & Actions</h3>
              <p className="text-[11px] text-zinc-400">Trigger live sound & animations for {creatorName}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Status Feedback */}
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-2xl bg-rose-950/60 border border-rose-500/40 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <div className="flex-1">{errorMsg}</div>
              {!hasEnoughTokens && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenWalletModal();
                  }}
                  className="font-bold underline text-amber-400 ml-1"
                >
                  Buy Tokens
                </button>
              )}
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 p-3 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <div>{successMsg}</div>
            </div>
          )}

          {/* User Balance Bar */}
          <div className="flex items-center justify-between rounded-2xl bg-zinc-900/70 p-3 border border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
                <Coins className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-zinc-400">Your Wallet Balance</p>
                <p className="text-sm font-extrabold text-amber-300">
                  {currentUser.walletBalance.toLocaleString()} Tokens
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
                onOpenWalletModal();
              }}
              className="flex items-center gap-1 rounded-xl bg-pink-600/20 px-3 py-1.5 text-xs font-bold text-pink-300 border border-pink-500/40 hover:bg-pink-600/30 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Get Tokens</span>
            </button>
          </div>

          {/* Action Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Live Interactive Gifts
              </span>
              <span className="text-[10px] text-zinc-500">Instant Execution</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {itemsToRender.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    type="button"
                    className={`relative flex flex-col items-start p-3 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? "border-pink-500 bg-pink-500/15 shadow-lg shadow-pink-500/15 ring-1 ring-pink-500"
                        : "border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 hover:border-zinc-700"
                    }`}
                  >
                    <span className="text-xs font-bold text-white">{item.title}</span>
                    <span className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">
                      {item.description || "Live stream effect"}
                    </span>
                    <div className="mt-2.5 flex items-center gap-1 text-xs font-black text-amber-400">
                      <Coins className="h-3.5 w-3.5" />
                      <span>{item.creditCost} Tokens</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Message */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
              Cheer Message (Shown on Stream)
            </label>
            <input
              type="text"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder={`Send cheer to ${creatorName}...`}
              maxLength={100}
              className="w-full rounded-2xl bg-zinc-900/80 px-4 py-2.5 text-xs text-white placeholder-zinc-500 border border-zinc-800 focus:border-pink-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Footer Action */}
        <div className="border-t border-zinc-800/80 p-4 bg-zinc-900/70 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] text-zinc-400 uppercase font-semibold">Total Price</p>
            <p className="text-base font-extrabold text-amber-400">{cost} Tokens</p>
          </div>

          <button
            onClick={handleSendTip}
            disabled={isSending || cost <= 0}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-amber-500 py-3 px-6 font-bold text-white shadow-xl shadow-pink-600/30 hover:opacity-95 active:scale-95 disabled:opacity-40 transition-all"
          >
            {isSending ? (
              <span className="animate-pulse">Authorizing Ledger...</span>
            ) : (
              <>
                <span>Send Gift Now</span>
                <Send className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
