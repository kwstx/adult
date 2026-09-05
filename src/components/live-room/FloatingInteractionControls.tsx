"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Gift,
  Heart,
  Volume2,
  VolumeX,
  Coins,
  ShieldAlert,
  Target,
  Zap,
} from "lucide-react";

interface FloatingInteractionControlsProps {
  walletBalance: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenMarketplace: () => void;
  onOpenGoalTab: () => void;
  onOpenWalletModal: () => void;
  onOpenReportModal: () => void;
  onSendHeart: () => void;
}

export function FloatingInteractionControls({
  walletBalance,
  isMuted,
  onToggleMute,
  onOpenMarketplace,
  onOpenGoalTab,
  onOpenWalletModal,
  onOpenReportModal,
  onSendHeart,
}: FloatingInteractionControlsProps) {
  const [likeCount, setLikeCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);

  const handleHeartClick = () => {
    setLikeCount((prev) => prev + 1);
    setIsLiking(true);
    onSendHeart();
    setTimeout(() => setIsLiking(false), 300);
  };

  return (
    <div className="absolute right-4 bottom-20 sm:bottom-6 z-30 flex flex-col items-center gap-3">
      {/* 1. Wallet Balance Badge (Clickable Top-Up) */}
      <button
        onClick={onOpenWalletModal}
        className="group flex flex-col items-center gap-0.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-amber-500/40 px-2.5 py-2 shadow-2xl transition-all hover:scale-105 hover:bg-black/80 hover:border-amber-400"
        title="Wallet Balance - Click to Top Up"
      >
        <Coins className="h-5 w-5 text-amber-400 group-hover:rotate-12 transition-transform" />
        <span className="text-[10px] font-black text-amber-300">
          {walletBalance.toLocaleString()}
        </span>
      </button>

      {/* 2. Primary Floating Button: Interaction Marketplace Drawer */}
      <button
        onClick={onOpenMarketplace}
        className="relative flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-600 via-rose-600 to-amber-500 text-white shadow-2xl shadow-pink-600/50 hover:scale-110 active:scale-95 transition-all group"
        title="Open Interaction Marketplace"
      >
        <Zap className="h-6 w-6 group-hover:animate-bounce" />
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-black text-[9px] font-black">
          ★
        </span>
      </button>

      {/* 3. Stream Goal Milestone Button */}
      <button
        onClick={onOpenGoalTab}
        className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black/60 backdrop-blur-xl border border-white/15 text-amber-400 shadow-xl hover:scale-105 hover:bg-black/80 hover:border-amber-400/60 transition-all"
        title="Stream Milestone Goal"
      >
        <Target className="h-5 w-5" />
      </button>

      {/* 4. Floating Like / Heart Burst Button */}
      <button
        onClick={handleHeartClick}
        className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-black/60 backdrop-blur-xl border border-white/15 text-rose-400 shadow-xl hover:scale-105 hover:bg-black/80 hover:border-rose-400/60 transition-all ${
          isLiking ? "scale-125 text-rose-500" : ""
        }`}
        title="Send Heart"
      >
        <Heart className={`h-5 w-5 ${isLiking ? "fill-current" : ""}`} />
      </button>

      {/* 5. Audio Mute / Unmute Toggle */}
      <button
        onClick={onToggleMute}
        className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black/60 backdrop-blur-xl border border-white/15 text-white shadow-xl hover:scale-105 hover:bg-black/80 transition-all"
        title={isMuted ? "Unmute Audio" : "Mute Audio"}
      >
        {isMuted ? (
          <VolumeX className="h-4 w-4 text-rose-400" />
        ) : (
          <Volume2 className="h-4 w-4 text-emerald-400" />
        )}
      </button>

      {/* 6. Trust & Safety / Report Button */}
      <button
        onClick={onOpenReportModal}
        className="flex h-9 w-9 items-center justify-center rounded-2xl bg-black/50 backdrop-blur-xl border border-white/10 text-zinc-400 hover:text-rose-400 hover:border-rose-500/40 hover:bg-black/80 transition-all"
        title="Report Broadcast / Safety"
      >
        <ShieldAlert className="h-4 w-4" />
      </button>
    </div>
  );
}
