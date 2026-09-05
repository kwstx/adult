"use client";

import React, { useState, useEffect } from "react";
import { X, Lock, CheckCircle2, Coins, Sparkles, Image as ImageIcon, Video, AlertCircle, Play, Eye } from "lucide-react";
import { useUser } from "@/lib/user-context";

export interface PPVItem {
  id: string;
  title: string;
  description: string | null;
  previewUrl: string;
  creditPrice: number;
  mediaType: string;
}

interface MarketplaceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  creatorId: string;
  creatorName: string;
  ppvItems: PPVItem[];
  onOpenWalletModal: () => void;
}

export function MarketplaceDrawer({
  isOpen,
  onClose,
  creatorId,
  creatorName,
  ppvItems = [],
  onOpenWalletModal,
}: MarketplaceDrawerProps) {
  const { currentUser, updateBalance } = useUser();
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewMedia, setPreviewMedia] = useState<PPVItem | null>(null);

  if (!isOpen) return null;

  const handleUnlock = async (item: PPVItem) => {
    if (currentUser.walletBalance < item.creditPrice) {
      setErrorMsg(`You need ${item.creditPrice} tokens. Please top up your wallet.`);
      return;
    }

    setUnlockingId(item.id);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/economic/ppv/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fanUserId: currentUser.id,
          ppvContentId: item.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to unlock media.");
      }

      updateBalance(data.fanRemainingBalance);
      setUnlockedIds((prev) => new Set(prev).add(item.id));
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setUnlockingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center p-0 sm:p-4 animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 flex max-h-[85vh] sm:max-h-[640px] w-full max-w-lg flex-col rounded-t-3xl sm:rounded-3xl border border-zinc-800/90 bg-zinc-950/95 shadow-2xl backdrop-blur-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-4 bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white shadow-md shadow-amber-500/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">
                💎 PPV Media Vault & Store
              </h3>
              <p className="text-[11px] text-zinc-400">Exclusive 4K galleries & videos by {creatorName}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-2xl bg-rose-950/60 border border-rose-500/40 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <div className="flex-1">{errorMsg}</div>
              <button
                onClick={() => {
                  onClose();
                  onOpenWalletModal();
                }}
                className="font-bold underline text-amber-400 ml-1"
              >
                Top Up
              </button>
            </div>
          )}

          {/* VIP Subscription Card */}
          <div className="rounded-2xl border border-pink-500/30 bg-gradient-to-r from-pink-950/40 via-zinc-900 to-zinc-950 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-xs font-black text-pink-400">
                <Sparkles className="h-4 w-4" />
                VIP ALL-ACCESS CLUB
              </span>
              <span className="rounded-full bg-pink-500/20 px-2 py-0.5 text-[10px] font-bold text-pink-300">
                Monthly Pass
              </span>
            </div>
            <p className="text-xs text-zinc-300 mb-3 leading-relaxed">
              Get unlimited access to all stream archives, badge in live chat & private DMs.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400">200 Tokens / month</span>
              <button
                onClick={() => {
                  if (currentUser.walletBalance < 200) {
                    onClose();
                    onOpenWalletModal();
                  } else {
                    updateBalance(currentUser.walletBalance - 200);
                    alert(`Subscribed to ${creatorName}'s VIP Club!`);
                  }
                }}
                className="rounded-xl bg-pink-600 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-pink-600/30 hover:bg-pink-500 transition-all"
              >
                Join VIP Club
              </button>
            </div>
          </div>

          {/* Media Items List */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Pay-Per-View Content ({ppvItems.length})
            </h4>

            {ppvItems.length === 0 ? (
              <div className="py-12 text-center text-zinc-500">
                <Lock className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p className="text-xs">No media available at this moment.</p>
              </div>
            ) : (
              ppvItems.map((item) => {
                const isUnlocked = unlockedIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3 hover:border-zinc-700 transition-all"
                  >
                    {/* Thumbnail */}
                    <div className="relative h-28 sm:h-20 w-full sm:w-28 shrink-0 rounded-xl overflow-hidden bg-zinc-950">
                      <img
                        src={item.previewUrl}
                        alt={item.title}
                        className={`h-full w-full object-cover ${!isUnlocked ? "filter blur-sm scale-110" : ""}`}
                      />
                      {!isUnlocked ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-500/80 text-white shadow-lg">
                            <Lock className="h-4 w-4" />
                          </span>
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/80 text-white shadow-lg">
                            <Eye className="h-4 w-4" />
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-bold text-zinc-300 uppercase">
                          {item.mediaType}
                        </span>
                        <h5 className="truncate text-xs font-bold text-white">{item.title}</h5>
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-1">
                        {item.description || "Exclusive direct creator content"}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs font-black text-amber-400">
                          <Coins className="h-3.5 w-3.5" />
                          <span>{item.creditPrice} Tokens</span>
                        </div>

                        {isUnlocked ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Unlocked
                          </span>
                        ) : (
                          <button
                            onClick={() => handleUnlock(item)}
                            disabled={unlockingId === item.id}
                            className="rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-pink-600/20 hover:from-pink-500 hover:to-rose-500 disabled:opacity-50 transition-all"
                          >
                            {unlockingId === item.id ? "Unlocking..." : "Unlock Media"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
