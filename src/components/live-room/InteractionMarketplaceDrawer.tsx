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
  Gift,
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
  initialTab?: "gifts" | "interactions" | "goal" | "ppv" | "vip";
  creatorId: string;
  creatorName: string;
  walletBalance: number;
  interactions: InteractionCatalogueItem[];
  goal: StreamGoalData;
  ppvVault: PPVVaultItem[];
  relationship: ViewerRelationship;
  isTriggeringInteraction: string | null;
  onSendGift?: (params: { credits: number; giftId: string; giftName: string; giftIcon: string; customMessage?: string }) => Promise<boolean>;
  onTriggerInteraction: (item: InteractionCatalogueItem) => Promise<boolean>;
  onChipInGoal: (credits: number) => Promise<boolean>;
  onUnlockPPV: (ppvId: string) => Promise<boolean>;
  onOpenWalletModal: () => void;
}

const PRESET_GIFTS = [
  { id: "gift_rose", name: "Neon Rose", icon: "🌹", credits: 50, tier: "SMALL", desc: "Cute appreciation gesture" },
  { id: "gift_heart", name: "Fire Heart", icon: "🔥", credits: 100, tier: "MEDIUM", desc: "Confetti shower effect" },
  { id: "gift_diamond_500", name: "Diamond Spark", icon: "💎", credits: 500, tier: "LEGENDARY", desc: "Grand 3D particle explosion + screen shake!" },
  { id: "gift_galaxy", name: "Galaxy Crown", icon: "👑", credits: 1000, tier: "LEGENDARY", desc: "Ultimate top-tipper room broadcast!" },
];

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
  const [activeTab, setActiveTab] = useState<"gifts" | "interactions" | "goal" | "ppv" | "vip">(initialTab);
  const [selectedChipAmount, setSelectedChipAmount] = useState<number>(50);
  const [customGiftMsg, setCustomGiftMsg] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  if (!isOpen) return null;

  const showFeedback = (text: string, type: "success" | "error") => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleGiftClick = async (gift: typeof PRESET_GIFTS[0]) => {
    if (walletBalance < gift.credits) {
      showFeedback(`You need ${gift.credits} tokens. Please top up your wallet.`, "error");
      onOpenWalletModal();
      return;
    }

    if (!onSendGift) return;

    setIsProcessing(true);
    const success = await onSendGift({
      credits: gift.credits,
      giftId: gift.id,
      giftName: gift.name,
      giftIcon: gift.icon,
      customMessage: customGiftMsg || undefined,
    });
    setIsProcessing(false);

    if (success) {
      showFeedback(`Sent ${gift.name} (${gift.credits} tokens)! ✨`, "success");
      setCustomGiftMsg("");
    }
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

        {/* 2. Drawer Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-zinc-800/80 bg-zinc-900/20 px-3 py-2 overflow-x-auto">
          {[
            { id: "gifts", label: "Gifts", icon: Gift, badge: null },
            { id: "interactions", label: "Actions", icon: Zap, badge: interactions.length },
            { id: "goal", label: "Goal", icon: Target, badge: `${goal.percentage}%` },
            { id: "ppv", label: "PPV Vault", icon: ImageIcon, badge: ppvVault.length },
            { id: "vip", label: "VIP Club", icon: Crown, badge: null },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs font-bold whitespace-nowrap transition-all ${
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
          {/* TAB 0: LIVE GIFTS (INCLUDING 500-CREDIT LEGENDARY GIFT) */}
          {activeTab === "gifts" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Select a Real-Time Gift
                </span>
                <span className="text-[11px] text-amber-400 font-bold">Authoritative Sync ⚡</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {PRESET_GIFTS.map((g) => {
                  const isLegendary = g.tier === "LEGENDARY";
                  return (
                    <button
                      key={g.id}
                      onClick={() => handleGiftClick(g)}
                      disabled={isProcessing}
                      className={`relative flex flex-col items-center text-center p-4 rounded-2xl border transition-all group disabled:opacity-50 active:scale-95 ${
                        isLegendary
                          ? "bg-gradient-to-b from-amber-950/30 to-zinc-900 border-amber-500/50 hover:border-amber-400 shadow-lg shadow-amber-500/10"
                          : "bg-zinc-900/60 border-zinc-800 hover:border-pink-500/50 hover:bg-zinc-900"
                      }`}
                    >
                      {isLegendary && (
                        <span className="absolute -top-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-pink-500 text-black text-[9px] font-black uppercase">
                          Legendary
                        </span>
                      )}

                      <span className="text-3xl mb-1 group-hover:scale-125 transition-transform duration-200">
                        {g.icon}
                      </span>
                      <span className="text-xs font-extrabold text-white mt-1">{g.name}</span>
                      <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1">{g.desc}</p>

                      <div className="mt-2.5 flex items-center gap-1 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-black text-amber-400 border border-amber-500/30">
                        <Coins className="h-3 w-3" />
                        <span>{g.credits} Tokens</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Optional Custom Message Input */}
              <div className="pt-2">
                <label className="text-[11px] font-bold text-zinc-400 block mb-1.5">
                  Optional Gift Note / Shoutout
                </label>
                <input
                  type="text"
                  value={customGiftMsg}
                  onChange={(e) => setCustomGiftMsg(e.target.value)}
                  placeholder="e.g., Amazing stream! Keep crushing the goals ✨"
                  className="w-full rounded-xl bg-zinc-900/80 border border-zinc-800 px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-pink-500 transition-colors"
                />
              </div>
            </div>
          )}

          {/* TAB 1: INTERACTIONS CATALOGUE */}
          {activeTab === "interactions" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Live Interaction Menu ({interactions.length})
                </span>
                <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Active
                </span>
              </div>

              {interactions.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs">
                  No active interactions currently available.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {interactions.map((item) => {
                    const isBusy = isTriggeringInteraction === item.id || isProcessing;
                    const isOutOfStock = (item as any).remainingQuantity === 0;

                    // Compute category badge style
                    const actionType = item.actionType || "ACTIVITY";
                    let badgeClass = "bg-pink-500/20 text-pink-400 border-pink-500/30";
                    let typeLabel = "Activity";
                    let defaultIcon = "💃";

                    if (actionType === "QUESTION" || actionType === "CHAT_PIN") {
                      badgeClass = "bg-blue-500/20 text-blue-400 border-blue-500/30";
                      typeLabel = "Question";
                      defaultIcon = "💬";
                    } else if (actionType === "CHALLENGE" || actionType === "WHEEL_SPIN") {
                      badgeClass = "bg-amber-500/20 text-amber-400 border-amber-500/30";
                      typeLabel = "Challenge";
                      defaultIcon = "🎯";
                    } else if (actionType === "PRIORITY_INTERACTION" || actionType === "TIP_ALERT") {
                      badgeClass = "bg-purple-500/20 text-purple-400 border-purple-500/30";
                      typeLabel = "Priority";
                      defaultIcon = "⚡";
                    } else if (actionType === "CUSTOM_EXPERIENCE" || actionType === "CUSTOM_ACTION") {
                      badgeClass = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
                      typeLabel = "Custom";
                      defaultIcon = "✨";
                    }

                    return (
                      <div
                        key={item.id}
                        className={`flex flex-col rounded-2xl border p-4 transition-all ${
                          isOutOfStock
                            ? "bg-zinc-950/60 border-zinc-900 opacity-50"
                            : "bg-zinc-900/60 border-zinc-800/90 hover:border-pink-500/50 hover:bg-zinc-900 shadow-sm"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-lg border border-zinc-700/50">
                              {(item as any).icon || defaultIcon}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-extrabold text-xs text-white truncate">
                                  {item.title}
                                </h4>
                                <span className={`rounded-full px-2 py-0.2 text-[9px] font-black border ${badgeClass}`}>
                                  {typeLabel}
                                </span>
                              </div>
                              <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-2">
                                {item.description || "Live creator interaction"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-black text-amber-400 border border-amber-500/30 shrink-0">
                            <Coins className="h-3 w-3" />
                            <span>{item.creditCost}</span>
                          </div>
                        </div>

                        {/* Metadata Tags & Trigger CTA */}
                        <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-zinc-800/80 text-[10px]">
                          <div className="flex items-center gap-2 text-zinc-400 flex-wrap">
                            {(item as any).requiresAcceptance && (
                              <span className="rounded bg-zinc-800/90 px-1.5 py-0.5 text-zinc-300 font-medium">
                                🛡️ Needs Acceptance
                              </span>
                            )}
                            {(item as any).entersQueue && (
                              <span className="rounded bg-zinc-800/90 px-1.5 py-0.5 text-pink-300 font-medium">
                                ⏳ Queued
                              </span>
                            )}
                            {(item as any).remainingQuantity !== null && (
                              <span className="text-amber-400 font-bold">
                                {(item as any).remainingQuantity} slots left
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => handleInteractionClick(item)}
                            disabled={isBusy || isOutOfStock}
                            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 px-4 py-1.5 text-xs font-black text-white shadow-md shadow-pink-600/30 hover:from-pink-500 hover:to-rose-500 disabled:opacity-50 transition-all active:scale-95 shrink-0"
                          >
                            <Sparkles className="h-3 w-3" />
                            <span>{isOutOfStock ? "Sold Out" : "Trigger Live"}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: STREAM GOAL */}
          {activeTab === "goal" && (
            <div className="space-y-4">
              <div className="rounded-3xl bg-zinc-900/80 border border-zinc-800 p-5 shadow-inner">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white">{goal.title}</span>
                  <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-black text-amber-400">
                    {goal.percentage}% Completed
                  </span>
                </div>

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
