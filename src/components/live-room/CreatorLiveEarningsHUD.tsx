"use client";

import React, { useState } from "react";
import { DollarSign, Coins, TrendingUp, CheckCircle, Clock } from "lucide-react";
import type { InteractionPurchasedPayload } from "@/modules/realtime/types";

interface CreatorLiveEarningsHUDProps {
  grossTokens: number;
  netUsd: number;
  interactionQueue: InteractionPurchasedPayload[];
  onAcceptInteraction?: (queueId: string) => void;
}

export function CreatorLiveEarningsHUD({
  grossTokens,
  netUsd,
  interactionQueue,
  onAcceptInteraction,
}: CreatorLiveEarningsHUDProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="fixed top-20 left-4 z-40 flex flex-col gap-2 max-w-xs select-none">
      {/* Earnings Ticker Pill */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-3 rounded-2xl bg-zinc-950/90 border border-amber-500/50 p-2.5 shadow-xl shadow-amber-500/10 backdrop-blur-xl cursor-pointer hover:border-amber-400 transition-all"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-black font-black text-sm shadow-md">
          <Coins className="h-5 w-5" />
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-xs font-black text-white">{grossTokens.toLocaleString()} Tokens</span>
            <span className="text-[10px] text-zinc-400">gross</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-black text-emerald-400">
            <TrendingUp className="h-3 w-3" />
            <span>${netUsd.toFixed(2)} USD Net</span>
          </div>
        </div>

        {interactionQueue.length > 0 && (
          <span className="ml-auto rounded-full bg-pink-500 px-2 py-0.5 text-[10px] font-black text-white animate-pulse">
            {interactionQueue.length}
          </span>
        )}
      </div>

      {/* Expanded Interaction Queue */}
      {isExpanded && interactionQueue.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-2xl bg-zinc-950/95 border border-zinc-800 p-3 shadow-2xl backdrop-blur-2xl animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-zinc-850">
            <span className="text-[11px] font-bold text-zinc-300 flex items-center gap-1">
              <Clock className="h-3 w-3 text-pink-400" />
              Interaction Requests
            </span>
            <span className="text-[10px] text-zinc-500">{interactionQueue.length} pending</span>
          </div>

          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
            {interactionQueue.map((item) => (
              <div
                key={item.queueId}
                className="flex items-center justify-between rounded-xl bg-zinc-900/60 p-2 border border-zinc-800"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-white truncate">
                    {item.actionItem.title}
                  </span>
                  <span className="text-[10px] text-zinc-400 truncate">
                    From {item.senderName} ({item.actionItem.creditCost} tokens)
                  </span>
                </div>

                {onAcceptInteraction && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAcceptInteraction(item.queueId);
                    }}
                    className="flex items-center gap-1 rounded-lg bg-pink-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-pink-500 transition-colors shrink-0"
                  >
                    <CheckCircle className="h-3 w-3" />
                    Accept
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
