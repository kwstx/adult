"use client";

import { useState, useEffect, useCallback } from "react";
import { LevelUpEventPayload, XpAwardedEventPayload } from "@/modules/xp/types";

interface FloatingXpToastItem {
  id: string;
  xpAwarded: number;
  sourceText: string;
  newTotalXp: number;
  streakDays?: number;
  createdAt: number;
}

interface UseXpProgressionListenerOptions {
  creatorProfileId?: string;
  fanId?: string;
  onLevelUp?: (payload: LevelUpEventPayload) => void;
  onXpAwarded?: (payload: XpAwardedEventPayload) => void;
}

/**
 * useXpProgressionListener
 * 
 * Subscribes to real-time backend progression events.
 * Manages active Level-Up Celebration modal state and floating XP toasts.
 */
export function useXpProgressionListener({
  creatorProfileId,
  fanId,
  onLevelUp,
  onXpAwarded,
}: UseXpProgressionListenerOptions) {
  const [activeLevelUp, setActiveLevelUp] = useState<LevelUpEventPayload | null>(null);
  const [xpToasts, setXpToasts] = useState<FloatingXpToastItem[]>([]);

  // Dismiss level-up modal
  const dismissLevelUp = useCallback(() => {
    setActiveLevelUp(null);
  }, []);

  // Dismiss specific toast
  const dismissToast = useCallback((id: string) => {
    setXpToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Handle Level-Up payload from backend
  const handleLevelUpPayload = useCallback(
    (payload: LevelUpEventPayload) => {
      // Filter if fanId is specified and doesn't match
      if (fanId && payload.fanId !== fanId) return;

      setActiveLevelUp(payload);
      if (onLevelUp) onLevelUp(payload);
    },
    [fanId, onLevelUp]
  );

  // Handle XP Awarded payload from backend
  const handleXpAwardedPayload = useCallback(
    (payload: XpAwardedEventPayload) => {
      if (fanId && payload.fanId !== fanId) return;

      const sourceLabels: Record<string, string> = {
        STREAM_WATCH_TIME: "Live Watch Time",
        LIVE_TIP: "Tip Sent",
        CHAT_MESSAGE: "Chat Active",
        SUBSCRIPTION_RENEWAL: "Subscriber Tier",
        PPV_PURCHASE: "Vault Unlock",
        GOAL_CONTRIBUTION: "Goal Support",
        CUSTOM_BONUS: "Creator Bonus",
      };

      const sourceText = sourceLabels[payload.sourceEventType] || "Engagement";

      const toastItem: FloatingXpToastItem = {
        id: `toast_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        xpAwarded: payload.xpAwarded,
        sourceText,
        newTotalXp: payload.newTotalXp,
        streakDays: payload.streakDays,
        createdAt: Date.now(),
      };

      setXpToasts((prev) => [...prev.slice(-4), toastItem]); // Keep at most 5 floating toasts

      if (onXpAwarded) onXpAwarded(payload);
    },
    [fanId, onXpAwarded]
  );

  // SSE Real-time Subscription
  useEffect(() => {
    if (!creatorProfileId) return;

    let eventSource: EventSource | null = null;
    try {
      const url = `/api/realtime/${creatorProfileId}/sse?userId=${fanId || ""}`;
      eventSource = new EventSource(url);

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === "LEVEL_UP") {
            handleLevelUpPayload(parsed.payload);
          } else if (parsed.type === "XP_AWARDED") {
            handleXpAwardedPayload(parsed.payload);
          }
        } catch {}
      };

      eventSource.onerror = () => {
        // SSE reconnect handles automatically
      };
    } catch {}

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [creatorProfileId, fanId, handleLevelUpPayload, handleXpAwardedPayload]);

  return {
    activeLevelUp,
    dismissLevelUp,
    xpToasts,
    dismissToast,
    triggerManualLevelUp: handleLevelUpPayload,
    triggerManualXpAward: handleXpAwardedPayload,
  };
}
