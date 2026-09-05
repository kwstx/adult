"use client";

import React, { useState, useEffect } from "react";
import { Coins, Sparkles, Flame, Star } from "lucide-react";
import { TipEventPayload } from "@/modules/realtime/types";

interface TipAlertOverlayProps {
  creatorId: string;
}

export function TipAlertOverlay({ creatorId }: TipAlertOverlayProps) {
  const [activeAlert, setActiveAlert] = useState<TipEventPayload | null>(null);

  useEffect(() => {
    const eventSource = new EventSource(`/api/realtime/${creatorId}/sse`);

    eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === "TIP_EVENT") {
          setActiveAlert(event.payload);

          // Auto-hide alert after 4 seconds
          setTimeout(() => {
            setActiveAlert((current) => (current?.tipId === event.payload.tipId ? null : current));
          }, 4500);
        }
      } catch {
        // SSE parsing
      }
    };

    return () => {
      eventSource.close();
    };
  }, [creatorId]);

  if (!activeAlert) return null;

  return (
    <div className="pointer-events-none fixed top-20 right-6 z-50 animate-tip-pop">
      <div className="flex items-center gap-3 rounded-2xl bg-zinc-950/90 border border-pink-500/50 p-4 shadow-2xl shadow-pink-500/20 backdrop-blur-xl max-w-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-pink-600 via-rose-500 to-amber-400 text-white shadow-lg shadow-pink-500/30 shrink-0">
          <Coins className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black text-amber-300 truncate">
              {activeAlert.senderName}
            </span>
            <span className="text-[10px] text-zinc-400 font-semibold">tipped</span>
          </div>
          <p className="text-base font-extrabold text-white">
            {activeAlert.credits} Tokens
            {activeAlert.actionTitle && (
              <span className="ml-1.5 text-xs text-pink-400 font-semibold">
                [{activeAlert.actionTitle}]
              </span>
            )}
          </p>
          {activeAlert.customMessage && (
            <p className="text-xs text-zinc-300 italic truncate mt-0.5">
              &ldquo;{activeAlert.customMessage}&rdquo;
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
