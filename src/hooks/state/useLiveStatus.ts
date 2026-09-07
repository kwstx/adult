"use client";

import { useCallback } from "react";
import { useServerQuery } from "@/lib/state/query-client";

export interface LiveStatusState {
  creatorId: string;
  isLive: boolean;
  streamTitle: string;
  viewerCount: number;
  peakViewers?: number;
  streamHealth: "EXCELLENT" | "GOOD" | "POOR" | "OFFLINE";
  posterUrl?: string;
  playbackUrl?: string;
  goal?: {
    title: string;
    target: number;
    progress: number;
    percentage: number;
    isCompleted: boolean;
  };
}

export function useLiveStatus(creatorId?: string) {
  const queryKey = ["live-status", creatorId || "none"];

  const fetcher = useCallback(async (): Promise<LiveStatusState> => {
    if (!creatorId) {
      return {
        creatorId: "none",
        isLive: false,
        streamTitle: "",
        viewerCount: 0,
        streamHealth: "OFFLINE",
      };
    }

    const res = await fetch(`/api/livestream/${encodeURIComponent(creatorId)}/session`);
    if (!res.ok) {
      // Fallback
      return {
        creatorId,
        isLive: false,
        streamTitle: "Stream Offline",
        viewerCount: 0,
        streamHealth: "OFFLINE",
      };
    }

    const data = await res.json();
    const config = data.roomConfig || {};
    const goal = data.goal;

    return {
      creatorId,
      isLive: Boolean(config.isLive),
      streamTitle: config.streamTitle || "Live Stream",
      viewerCount: config.viewerCount || 0,
      streamHealth: config.isLive ? "EXCELLENT" : "OFFLINE",
      posterUrl: config.bannerUrl || config.avatarUrl,
      playbackUrl: data.playback?.playbackUrl,
      goal: goal
        ? {
            title: goal.title,
            target: goal.target,
            progress: goal.progress,
            percentage: goal.percentage,
            isCompleted: goal.isCompleted,
          }
        : undefined,
    };
  }, [creatorId]);

  const query = useServerQuery<LiveStatusState>(queryKey, fetcher, {
    enabled: Boolean(creatorId),
    staleTime: 10000, // 10s TTL
    tags: ["livestream", `livestream:${creatorId}`],
  });

  return {
    liveStatus: query.data,
    isLive: query.data?.isLive ?? false,
    viewerCount: query.data?.viewerCount ?? 0,
    goal: query.data?.goal,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    invalidate: query.invalidate,
  };
}
