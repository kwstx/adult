"use client";

import React, { useState } from "react";
import {
  X,
  Zap,
  Target,
  Image as ImageIcon,
  Crown,
  Coins,
  Sparkles,
  Lock,
  CheckCircle2,
  Trophy,
  AlertCircle,
  Flame,
} from "lucide-react";
import type {
  InteractionCatalogueItem,
  StreamGoalData,
  PPVVaultItem,
  ViewerRelationship,
} from "@/modules/livestream/room-session.service";

interface InteractionMarketplaceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "interactions" | "goal" | "ppv" | "vip";
  creatorId: string;
  creatorName: string;
  walletBalance: number;
  interactions: InteractionCatalogueItem[];
  goal: StreamGoalData;
  ppvVault: PPVVaultItem[];
  relationship: ViewerRelationship;
  isTriggeringInteraction: string | null;
  onTriggerInteraction: (item: InteractionCatalogueItem) => Promise<boolean>;
  onChipInGoal: (credits: number) => Promise<boolean>;
  onUnlockPPV: (ppvId: string) => Promise<boolean>;
  onOpenWalletModal: () => void;
}

export function InteractionMarketplaceDrawer({
  isOpen,
  onClose,
  initialTab = "interactions",
  creatorId,
  creatorName,
  walletBalance,
  interactions,
  goal,
  ppvVault,
  relationship,
  isTriggeringInteraction,
  onTriggerInteraction,
  onChipInGoal,
  onUnlockPPV,
  onOpenWalletModal,
}: InteractionMarketplaceDrawerProps) {
  const [activeTab, setActiveTab] = useState<"interactions" | "goal" | "ppv" | "vip">(initialTab);
  const [selectedChipAmount, setSelectedChipAmount] = useState<number>(50);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  if (!isOpen) return null;

  const showFeedback = (text: string, type: "success" | "error") => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleInteractionClick = async (item: InteractionCatalogueItem) => {
    if (walletBalance < item.creditCost) {
      showFeedback(`You need ${item.creditCost} tokens. Please top up your wallet.`, "error");
      onOpenWalletModal();
      return;
    }

    setIsProcessing(true);
    const success = await onTriggerInteraction(item);
    setIsProcessing(false);

    if (success) {
      showFeedback(`Triggered "${item.title}"! 🎉`, "success");
    }
  };

  const handleChipIn = async () => {
    if (walletBalance < selectedChipAmount) {
      showFeedback(`You need ${selectedChipAmount} tokens. Please top up your wallet.`, "error");
      onOpenWalletModal();
      return;
    }

    setIsProcessing(true);
    const success = await onChipInGoal(selectedChipAmount);
    setIsProcessing(false);

    if (success) {
      showFeedback(`Contributed ${selectedChipAmount} tokens to ${goal.title}! 🎯`, "success");
    }
  };

  const handlePPVUnlock = async (item: PPVVaultItem) => {
    if (walletBalance < item.creditPrice) {
      showFeedback(`You need ${item.creditPrice} tokens to unlock this item.`, "error");
      onOpenWalletModal();
      return;
    }

    setIsProcessing(true);
    const success = await onUnlockPPV(item.id);
    setIsProcessing(false);

    if (success) {
      showFeedback(`Unlocked "${item.title}"! 💎`, "success");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 backdrop-blur-md sm:items-center p-0 sm:p-4 animate-fade-in">
      {/* Backdrop tap to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 flex max-h-[85vh] sm:max-h-[640px] w-full max-w-lg flex-col rounded-t-3xl sm:rounded-3xl border border-zinc-800/90 bg-zinc-950/95 shadow-2xl backdrop-blur-2xl overflow-hidden animate-slide-up">
        {/* 1. Header Bar */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-4 bg-zinc-900/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-600 to-amber-500 text-white shadow-md">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">
                Interaction Marketplace
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

        {/* 2. Drawer Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-zinc-800/80 bg-zinc-900/20 px-4 py-2">
          {[
            { id: "interactions", label: "Interactions", icon: Zap, badge: interactions.length },
            { id: "goal", label: "Stream Goal", icon: Target, badge: `${goal.percentage}%` },
            { id: "ppv", label: "PPV Vault", icon: ImageIcon, badge: ppvVault.length },
            { id: "vip", label: "VIP Club", icon: Crown, badge: null },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all ${
                  isActive
                    ? "bg-pink-600 text-white shadow-md shadow-pink-600/30"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[9px] font-black ${
                      isActive ? "bg-white/20 text-white" : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 3. Feedback Banner */}
        {feedbackMsg && (
          <div
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold animate-fade-in ${
              feedbackMsg.type === "success"
                ? "bg-emerald-950/80 border-b border-emerald-500/40 text-emerald-300"
                : "bg-rose-950/80 border-b border-rose-500/40 text-rose-300"
            }`}
          >
            {feedbackMsg.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            <span className="flex-1">{feedbackMsg.text}</span>
          </div>
        )}

        {/* 4. Drawer Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 1: INTERACTIONS CATALOGUE */}
          {activeTab === "interactions" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Live Interaction Menu
                </span>
                <span className="text-[11px] text-zinc-500">Instant Execution</span>
              </div>

              {interactions.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs">
                  No custom interactions configured by creator.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {interactions.map((item) => {
                    const isBusy = isTriggeringInteraction === item.id || isProcessing;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleInteractionClick(item)}
                        disabled={isBusy}
                        className="flex flex-col text-left rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-3.5 hover:border-pink-500/50 hover:bg-zinc-900/80 active:scale-[0.98] transition-all group disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-extrabold text-xs text-white group-hover:text-pink-400 transition-colors">
                            {item.title}
                          </span>
                          <span className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-black text-amber-400">
                            <Coins className="h-3 w-3" />
                            {item.creditCost}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: STREAM GOAL & LEADERBOARD */}
          {activeTab === "goal" && (
            <div className="space-y-4">
              {/* Main Goal Card */}
              <div className="rounded-3xl bg-zinc-900/80 border border-zinc-800 p-5 shadow-inner">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white">{goal.title}</span>
                  <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-black text-amber-400">
                    {goal.percentage}% Completed
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="h-3.5 w-full rounded-full bg-zinc-950 overflow-hidden p-0.5 border border-zinc-800 mb-3">
                  <div
                    className="h-full bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 rounded-full transition-all duration-500 shadow-md shadow-pink-500/20"
                    style={{ width: `${goal.percentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <div className="flex items-center gap-1">
                    <Coins className="h-3.5 w-3.5 text-amber-400" />
                    <span className="font-extrabold text-white">
                      {goal.progress.toLocaleString()}
                    </span>
                    <span>/ {goal.target.toLocaleString()} Tokens</span>
                  </div>
                  <span>
                    {goal.remaining > 0
                      ? `${goal.remaining.toLocaleString()} left`
                      : "Goal Achieved! 🎉"}
                  </span>
                </div>
              </div>

              {/* Quick Chip In Buttons */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2 block">
                  Chip In Instant Tokens
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[25, 50, 100, 250].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setSelectedChipAmount(amt)}
                      className={`rounded-2xl py-2.5 text-xs font-black transition-all ${
                        selectedChipAmount === amt
                          ? "bg-amber-500 text-black shadow-lg shadow-amber-500/30"
                          : "bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-850"
                      }`}
                    >
                      +{amt} 🪙
                    </button>
                  ))}
                </div>
              </div>

              {/* Top Room Contributors */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="h-4 w-4 text-amber-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Top Room Patrons
                  </h4>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-zinc-300 font-medium">
                      <span className="text-amber-400 font-bold">#1</span> Alex Patron 💎
                    </span>
                    <span className="font-black text-amber-400">500 🪙</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-zinc-300 font-medium">
                      <span className="text-zinc-400 font-bold">#2</span> Neon Rider ⚡
                    </span>
                    <span className="font-black text-amber-400">180 🪙</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleChipIn}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-amber-500 py-3 font-bold text-white shadow-xl shadow-pink-600/30 hover:opacity-95 active:scale-95 disabled:opacity-40 transition-all"
              >
                <Sparkles className="h-4 w-4" />
                <span>Chip In {selectedChipAmount} Tokens</span>
              </button>
            </div>
          )}

          {/* TAB 3: PPV MEDIA VAULT */}
          {activeTab === "ppv" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Exclusive PPV Vault ({ppvVault.length})
                </span>
                <span className="text-[10px] text-zinc-500">Pay-Per-View</span>
              </div>

              {ppvVault.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs">
                  No pay-per-view media available.
                </div>
              ) : (
                ppvVault.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3 hover:border-zinc-700 transition-all"
                  >
                    {/* Thumbnail with Blur Lock */}
                    <div className="relative h-28 sm:h-20 w-full sm:w-28 shrink-0 rounded-xl overflow-hidden bg-zinc-950">
                      <img
                        src={item.previewUrl}
                        alt={item.title}
                        className={`h-full w-full object-cover ${
                          !item.isUnlocked ? "filter blur-sm scale-110" : ""
                        }`}
                      />
                      {!item.isUnlocked && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-500/80 text-white shadow-lg">
                            <Lock className="h-4 w-4" />
                          </span>
                        </div>
                      )}
                    </div>

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

                        {item.isUnlocked ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Unlocked
                          </span>
                        ) : (
                          <button
                            onClick={() => handlePPVUnlock(item)}
                            disabled={isProcessing}
                            className="rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-pink-600/20 hover:from-pink-500 hover:to-rose-500 disabled:opacity-50 transition-all"
                          >
                            Unlock Media
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: VIP FAN CLUB */}
          {activeTab === "vip" && (
            <div className="space-y-4">
              <div className="rounded-3xl border border-pink-500/40 bg-gradient-to-br from-pink-950/60 via-zinc-900 to-zinc-950 p-5 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-black text-pink-400">
                    <Crown className="h-4 w-4" />
                    VIP ALL-ACCESS MEMBERSHIP
                  </span>
                  <span className="rounded-full bg-pink-500/20 px-2 py-0.5 text-[10px] font-bold text-pink-300">
                    Monthly Pass
                  </span>
                </div>

                <p className="text-xs text-zinc-300 mb-4 leading-relaxed">
                  Join {creatorName}&apos;s VIP Circle for badge recognition, access to private shows, direct stream replays, and highlighted chat.
                </p>

                <div className="space-y-2 mb-5 text-xs text-zinc-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>Access to all Private Shows</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>Exclusive VIP Badge in Live Chat</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>Direct stream archive viewing</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                  <span className="text-sm font-black text-amber-400">200 Tokens / month</span>
                  <button
                    onClick={() => {
                      if (walletBalance < 200) {
                        onOpenWalletModal();
                      } else {
                        showFeedback(`Subscribed to ${creatorName}'s VIP Club! ✨`, "success");
                      }
                    }}
                    className="rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-xl shadow-pink-600/30 hover:from-pink-500 hover:to-rose-500 transition-all"
                  >
                    {relationship.isSubscribed ? "Active Member ✓" : "Join VIP Club"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 5. Footer Quick Wallet Bar */}
        <div className="border-t border-zinc-800/80 p-3.5 bg-zinc-900/60 flex items-center justify-between">
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
