"use client";

import React from "react";
import {
  Zap,
  Coins,
  Sparkles,
  Trophy,
  Users,
  ChevronRight,
  Gift,
} from "lucide-react";
import type {
  InteractionCatalogueItem,
  StreamGoalData,
  PPVVaultItem,
  ViewerRelationship,
} from "@/modules/livestream/room-session.service";
import type { VirtualRoomLayout } from "@/types/seat";
import { InteractionMarketplaceContent } from "./InteractionMarketplaceContent";

export interface DesktopMarketplaceDockProps {
  initialTab?: "gifts" | "interactions" | "goal" | "ppv" | "vip";
  creatorId: string;
  creatorName: string;
  walletBalance: number;
  interactions: InteractionCatalogueItem[];
  goal: StreamGoalData;
  ppvVault: PPVVaultItem[];
  relationship: ViewerRelationship;
  isTriggeringInteraction: string | null;
  onSendGift?: (params: {
    credits: number;
    giftId: string;
    giftName: string;
    giftIcon: string;
    customMessage?: string;
  }) => Promise<boolean>;
  onTriggerInteraction: (item: InteractionCatalogueItem) => Promise<boolean>;
  onChipInGoal: (credits: number) => Promise<boolean>;
  onUnlockPPV: (ppvId: string) => Promise<boolean>;
  onOpenWalletModal: () => void;
  onOpenLeaderboard: () => void;
  onOpenVirtualRoom: () => void;
  roomLayout?: VirtualRoomLayout | null;
  className?: string;
}

export function DesktopMarketplaceDock({
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
  onOpenLeaderboard,
  onOpenVirtualRoom,
  roomLayout,
  className = "",
}: DesktopMarketplaceDockProps) {
  return (
    <div
      className={`flex flex-col h-full bg-zinc-950/95 border-l border-zinc-800/80 select-none overflow-hidden ${className}`}
    >
      {/* 1. Dock Top Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-3 bg-zinc-900/40 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-tr from-pink-600 to-amber-500 text-white shadow-md">
            <Zap className="h-3.5 w-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              Marketplace & Actions
            </h3>
            <p className="text-[10px] text-zinc-400">
              Interactive Room Controls
            </p>
          </div>
        </div>

        {/* Quick Utilities: Leaderboard & Virtual Seats */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenLeaderboard}
            className="flex items-center gap-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-2.5 py-1 text-[11px] font-bold text-amber-300 transition-colors shadow-sm"
            title="Top Supporters Leaderboard"
          >
            <Trophy className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden xl:inline">Top</span>
          </button>

          <button
            onClick={onOpenVirtualRoom}
            className="flex items-center gap-1 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 px-2.5 py-1 text-[11px] font-bold text-purple-200 transition-colors shadow-sm"
            title="Audience Virtual Room Seats"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-ping" />
            <span>Seats</span>
            {roomLayout && (
              <span className="text-[10px] font-mono text-purple-300 font-extrabold">
                ({roomLayout.totalSeatedCount})
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. Dock Body: Shared Marketplace Content */}
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
    </div>
  );
}
