"use client";

import React from "react";
import { Sparkles, Coins } from "lucide-react";
import type { TipAlertItem } from "@/hooks/useLiveRoomSession";

interface LiveTipToastProps {
  alerts: TipAlertItem[];
}

export function LiveTipToast({ alerts }: LiveTipToastProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed top-20 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 max-w-sm w-full px-4">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="flex items-center gap-3 rounded-full bg-black/85 backdrop-blur-2xl border border-pink-500/50 px-4 py-2 text-white shadow-2xl shadow-pink-500/30 animate-slide-down"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-pink-600 via-rose-500 to-amber-400 text-white shadow-md">
            <Sparkles className="h-4 w-4" />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-xs text-amber-300 truncate">
                {alert.senderName}
              </span>
              <span className="flex items-center gap-0.5 rounded-full bg-pink-500/30 px-2 py-0.2 text-[10px] font-black text-pink-200">
                <Coins className="h-2.5 w-2.5 text-amber-400" />
                +{alert.credits}
              </span>
            </div>
            {alert.actionTitle && (
              <span className="text-[10px] font-bold text-pink-100 truncate">
                {alert.actionTitle}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
