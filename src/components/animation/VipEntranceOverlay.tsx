"use client";

import React, { useEffect, useState } from "react";
import { Crown, Sparkles, Gem, Star, ShieldCheck, Flame } from "lucide-react";
import { VipEntranceAnimationPayload } from "@/modules/animation/types";

interface VipEntranceOverlayProps {
  payload: VipEntranceAnimationPayload | null;
  onDismiss?: () => void;
}

export function VipEntranceOverlay({
  payload,
  onDismiss,
}: VipEntranceOverlayProps) {
  const [active, setActive] = useState<VipEntranceAnimationPayload | null>(null);

  useEffect(() => {
    if (!payload) {
      setActive(null);
      return;
    }

    setActive(payload);
    const duration = payload.durationMs || 3500;
    const timer = setTimeout(() => {
      setActive(null);
      if (onDismiss) onDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [payload, onDismiss]);

  if (!active) return null;

  const seatTier = active.user.seatTier || "VIP";
  const isInnerCircle = seatTier === "INNER_CIRCLE";
  const isVip = seatTier === "VIP" || active.user.vipTierCode === "VIP";

  return (
    <div className="pointer-events-none fixed top-16 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center select-none animate-in slide-in-from-top-6 fade-in duration-300">
      {/* Ambient Outer Halo */}
      <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-amber-400 via-pink-500 to-purple-600 opacity-60 blur-xl animate-pulse" />

      {/* Main VIP Entrance Banner Ribbon */}
      <div className="relative flex items-center gap-3.5 rounded-full bg-zinc-950/95 border-2 border-amber-400/90 px-6 py-2.5 shadow-[0_0_35px_rgba(245,158,11,0.5)] backdrop-blur-2xl">
        {/* Prestige Symbol Avatar Badge */}
        <div className="relative flex items-center justify-center">
          {active.user.avatarUrl ? (
            <img
              src={active.user.avatarUrl}
              alt={active.user.displayName}
              className="h-10 w-10 rounded-full border-2 border-amber-400 object-cover shadow-lg"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 to-pink-600 text-white shadow-lg text-lg">
              {isInnerCircle ? <Crown className="w-5 h-5 text-amber-200" /> : <Gem className="w-5 h-5 text-amber-200" />}
            </div>
          )}

          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-black text-black border border-zinc-950 shadow">
            {isInnerCircle ? "👑" : "💎"}
          </span>
        </div>

        {/* User Info & Status Recognition */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-amber-300 tracking-tight">
              {active.user.displayName}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-400/20 border border-amber-400/40 px-2 py-0.5 text-[10px] font-black uppercase text-amber-300">
              <Sparkles className="h-2.5 w-2.5 text-amber-400 animate-spin" />
              {isInnerCircle ? "INNER CIRCLE" : "VIP ACCESS"}
            </span>
            {active.user.fanLevel && active.user.fanLevel > 0 && (
              <span className="text-[10px] font-mono font-bold text-zinc-400">
                Lv.{active.user.fanLevel}
              </span>
            )}
          </div>

          <p className="text-[11px] font-bold text-zinc-300">
            {active.entranceTitle || (isInnerCircle ? "Inner Circle VIP entered the room" : "VIP room access acknowledged")}
          </p>
        </div>
      </div>
    </div>
  );
}
