"use client";

import { useCallback } from "react";
import { useServerQuery } from "@/lib/state/query-client";
import { serverCache } from "@/lib/state/server-cache";

export interface XpProgressionState {
  currentXp: number;
  fanLevel: number;
  tierName: string;
  nextLevelXp: number;
  currentLevelBaseXp: number;
  progressPercent: number;
  badge: string;
}

export function useXpProgressionState(fanId?: string, creatorId?: string) {
  const queryKey = ["xp", fanId || "none", creatorId || "none"];

  const fetcher = useCallback(async (): Promise<XpProgressionState> => {
    if (!fanId || !creatorId) {
      return {
        currentXp: 0,
        fanLevel: 1,
        tierName: "Explorer",
        nextLevelXp: 100,
        currentLevelBaseXp: 0,
        progressPercent: 0,
        badge: "⭐ Fan Lv.1",
      };
    }

    const res = await fetch(
      `/api/creators/${encodeURIComponent(creatorId)}/relationship?fanId=${encodeURIComponent(
        fanId
      )}`
    );

    if (!res.ok) {
      return {
        currentXp: 0,
        fanLevel: 1,
        tierName: "Explorer",
        nextLevelXp: 100,
        currentLevelBaseXp: 0,
        progressPercent: 0,
        badge: "⭐ Fan Lv.1",
      };
    }

    const json = await res.json();
    const data = json.data || json;

    const totalXp = data.xp || data.totalTokensContributed || 0;
    const fanLevel = data.fanLevel || Math.max(1, Math.floor(Math.sqrt(totalXp / 40)) + 1);
    const nextLevelXp = Math.pow(fanLevel, 2) * 40;
    const currentLevelBaseXp = Math.pow(fanLevel - 1, 2) * 40;
    const range = nextLevelXp - currentLevelBaseXp || 1;
    const progress = Math.min(100, Math.max(0, Math.round(((totalXp - currentLevelBaseXp) / range) * 100)));

    return {
      currentXp: totalXp,
      fanLevel,
      tierName: data.tier || data.relationshipTier || "Explorer",
      nextLevelXp,
      currentLevelBaseXp,
      progressPercent: progress,
      badge: data.badge || `⭐ Fan Lv.${fanLevel}`,
    };
  }, [fanId, creatorId]);

  const query = useServerQuery<XpProgressionState>(queryKey, fetcher, {
    enabled: Boolean(fanId && creatorId),
    staleTime: 15000,
    tags: ["xp", `xp:${fanId}`, `xp:${fanId}:${creatorId}`],
  });

  /**
   * Optimistically updates XP when user triggers an interactive action (e.g. tip or watch duration).
   */
  const awardXpOptimistic = useCallback(
    (xpGained: number) => {
      serverCache.mutate<XpProgressionState>(queryKey, (current) => {
        const base = current || {
          currentXp: 0,
          fanLevel: 1,
          tierName: "Explorer",
          nextLevelXp: 100,
          currentLevelBaseXp: 0,
          progressPercent: 0,
          badge: "⭐ Fan Lv.1",
        };
        const newXp = base.currentXp + xpGained;
        const newLevel = Math.max(1, Math.floor(Math.sqrt(newXp / 40)) + 1);
        const nextXp = Math.pow(newLevel, 2) * 40;
        const baseXp = Math.pow(newLevel - 1, 2) * 40;
        const range = nextXp - baseXp || 1;
        const progress = Math.min(100, Math.max(0, Math.round(((newXp - baseXp) / range) * 100)));

        return {
          ...base,
          currentXp: newXp,
          fanLevel: newLevel,
          nextLevelXp: nextXp,
          currentLevelBaseXp: baseXp,
          progressPercent: progress,
          badge: `⭐ Fan Lv.${newLevel}`,
        };
      });
    },
    [queryKey]
  );

  return {
    xp: query.data?.currentXp ?? 0,
    fanLevel: query.data?.fanLevel ?? 1,
    tierName: query.data?.tierName ?? "Explorer",
    progressPercent: query.data?.progressPercent ?? 0,
    badge: query.data?.badge ?? "⭐ Fan Lv.1",
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    awardXpOptimistic,
    refetch: query.refetch,
    invalidate: query.invalidate,
  };
}
