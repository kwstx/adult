"use client";

import React from "react";
import { X, Zap, Coins } from "lucide-react";
import type {
  InteractionCatalogueItem,
  StreamGoalData,
  PPVVaultItem,
  ViewerRelationship,
} from "@/modules/livestream/room-session.service";
import {
  InteractionMarketplaceContent,
  InteractionMarketplaceContentProps,
} from "./InteractionMarketplaceContent";

export interface InteractionMarketplaceDrawerProps extends InteractionMarketplaceContentProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InteractionMarketplaceDrawer({
  isOpen,
  onClose,
  initialTab = "gifts",
  creatorId,
  creatorName,
  walletBalance,
  interactions,
  goal,
  ppvVault,
  relationship,
  isTriggeringInteraction,
  onSendGift,
  onTriggerInteraction,
  onChipInGoal,
  onUnlockPPV,
  onOpenWalletModal,
}: InteractionMarketplaceDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 backdrop-blur-md sm:items-center p-0 sm:p-4 animate-fade-in">
      {/* Backdrop tap to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 flex max-h-[85vh] sm:max-h-[640px] w-full max-w-lg flex-col rounded-t-3xl sm:rounded-3xl border border-zinc-800/90 bg-zinc-950/95 shadow-2xl backdrop-blur-2xl overflow-hidden animate-slide-up">
        {/* 1. Drawer Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-4 bg-zinc-900/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-600 to-amber-500 text-white shadow-md">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">
                Live Room Marketplace & Gifts
              </h3>
              <p className="text-[11px] text-zinc-400">
                Live with {creatorName} • Available: {walletBalance.toLocaleString()} 🪙
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 2. Shared Marketplace Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <InteractionMarketplaceContent
            initialTab={initialTab}
            creatorId={creatorId}
            creatorName={creatorName}
            walletBalance={walletBalance}
            interactions={interactions}
            goal={goal}
            ppvVault={ppvVault}
            relationship={relationship}
            isTriggeringInteraction={isTriggeringInteraction}
            onSendGift={onSendGift}
            onTriggerInteraction={onTriggerInteraction}
            onChipInGoal={onChipInGoal}
            onUnlockPPV={onUnlockPPV}
            onOpenWalletModal={onOpenWalletModal}
          />
        </div>

        {/* 3. Drawer Bottom Quick Wallet Action */}
        <div className="border-t border-zinc-800/80 p-3.5 bg-zinc-900/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-bold text-zinc-300">
              Wallet Balance: <span className="text-white font-extrabold">{walletBalance.toLocaleString()} 🪙</span>
            </span>
          </div>

          <button
            onClick={() => {
              onClose();
              onOpenWalletModal();
            }}
            className="rounded-xl bg-amber-500/20 border border-amber-500/40 px-3 py-1.5 text-xs font-black text-amber-400 hover:bg-amber-500/30 transition-all"
          >
            + Top Up
          </button>
        </div>
      </div>
    </div>
  );
}
