"use client";

import React from "react";
import { Sparkles, Zap, ArrowRight, X, Coins, Clock } from "lucide-react";
import { InteractionConfig } from "@/types/interaction";

interface LiveInteractionAlertBannerProps {
  interaction: InteractionConfig | null;
  onDismiss: () => void;
  onOpenInteraction: (item: InteractionConfig) => void;
}

export function LiveInteractionAlertBanner({
  interaction,
  onDismiss,
  onOpenInteraction,
}: LiveInteractionAlertBannerProps) {
  if (!interaction) return null;

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md animate-slide-down">
      <div className="relative flex items-center justify-between gap-3 rounded-2xl border border-pink-500/50 bg-zinc-950/90 p-3 shadow-2xl backdrop-blur-2xl text-white">
        {/* Glowing pulse ring */}
        <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-amber-500 opacity-40 blur-sm animate-pulse -z-10" />

        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-pink-600 to-amber-500 text-xl shadow-md">
            {interaction.icon || "✨"}
          </span>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="rounded-full bg-pink-500/20 px-2 py-0.2 text-[9px] font-black uppercase text-pink-400 border border-pink-500/30">
                New Interaction Available
              </span>
              <span className="rounded bg-zinc-800 px-1 py-0.2 text-[9px] font-mono text-zinc-400">
                {interaction.type.replace("_", " ")}
              </span>
            </div>
            <h4 className="truncate text-xs font-black text-white mt-0.5">
              {interaction.name}
            </h4>
            <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
              <span className="flex items-center gap-0.5 font-bold text-amber-400">
                <Coins className="h-3 w-3" />
                {interaction.price} Tokens
              </span>
              <span>•</span>
              <span className="flex items-center gap-0.5 text-zinc-400">
                <Clock className="h-3 w-3" />
                {interaction.duration}s
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => {
              onOpenInteraction(interaction);
              onDismiss();
            }}
            className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 px-3 py-2 text-[11px] font-extrabold text-white shadow-md shadow-pink-600/30 hover:from-pink-500 hover:to-rose-500 transition-all active:scale-95"
          >
            <span>View</span>
            <ArrowRight className="h-3 w-3" />
          </button>
          <button
            onClick={onDismiss}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
