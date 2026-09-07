"use client";

import { useCallback } from "react";
import { useServerQuery } from "@/lib/state/query-client";
import { serverCache } from "@/lib/state/server-cache";

export type QueueItemStatus =
  | "PENDING"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED"
  | "REFUNDED";

export interface QueueItem {
  id: string;
  queueId?: string;
  fanId: string;
  fanName: string;
  fanAvatar?: string;
  fanLevel?: number;
  credits: number;
  actionTitle: string;
  actionType: string;
  customMessage?: string;
  durationSeconds: number;
  timeRemainingSeconds?: number;
  position: number;
  status: QueueItemStatus;
  purchaseTime: string;
}

export function useInteractionQueueState(creatorId?: string) {
  const queryKey = ["interaction-queue", creatorId || "none"];

  const fetcher = useCallback(async (): Promise<QueueItem[]> => {
    if (!creatorId) return [];

    const res = await fetch(`/api/realtime/${encodeURIComponent(creatorId)}/queue`);
    if (!res.ok) return [];

    const data = await res.json();
    const items = data.queue?.activeItems || data.items || [];

    return items.map((item: any, idx: number) => ({
      id: item.id || item.queueId || `q_${idx}`,
      queueId: item.queueId || item.id,
      fanId: item.fan?.id || item.fanId || "fan_anon",
      fanName: item.fan?.displayName || item.fanName || "Supporter",
      fanAvatar: item.fan?.avatarUrl || item.fanAvatar,
      fanLevel: item.fan?.fanLevel || item.fanLevel || 1,
      credits: item.price?.amountCredits || item.credits || 0,
      actionTitle: item.interaction?.title || item.actionTitle || "Interaction",
      actionType: item.interaction?.actionType || item.actionType || "Custom",
      customMessage: item.interaction?.customMessage || item.customMessage,
      durationSeconds: item.interaction?.durationSeconds || item.durationSeconds || 30,
      timeRemainingSeconds: item.timeRemainingSeconds ?? item.durationSeconds ?? 30,
      position: item.position || idx + 1,
      status: (item.status as QueueItemStatus) || "PENDING",
      purchaseTime: item.purchaseTime || new Date().toISOString(),
    }));
  }, [creatorId]);

  const query = useServerQuery<QueueItem[]>(queryKey, fetcher, {
    enabled: Boolean(creatorId),
    staleTime: 5000, // 5s TTL
    tags: ["queue", `queue:${creatorId}`],
  });

  const queue = query.data || [];
  const pendingItems = queue.filter((i) => i.status === "PENDING");
  const activeItem = queue.find((i) => i.status === "IN_PROGRESS" || i.status === "ACCEPTED") || null;

  /**
   * Creator Action: Accept item in queue
   */
  const acceptItem = useCallback(
    async (queueId: string) => {
      if (!creatorId) return;

      // Optimistic update
      serverCache.mutate<QueueItem[]>(queryKey, (current) => {
        if (!current) return [];
        return current.map((i) =>
          (i.id === queueId || i.queueId === queueId) ? { ...i, status: "ACCEPTED" } : i
        );
      });

      try {
        await fetch(`/api/realtime/${creatorId}/interaction`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "ACCEPT", queueId }),
        });
      } catch {
        query.refetch();
      }
    },
    [creatorId, queryKey, query]
  );

  /**
   * Creator Action: Reject / Refund item in queue
   */
  const rejectItem = useCallback(
    async (queueId: string, reason?: string) => {
      if (!creatorId) return;

      // Optimistic remove
      serverCache.mutate<QueueItem[]>(queryKey, (current) => {
        if (!current) return [];
        return current.filter((i) => i.id !== queueId && i.queueId !== queueId);
      });

      try {
        await fetch(`/api/realtime/${creatorId}/interaction`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "REJECT", queueId, reason }),
        });
      } catch {
        query.refetch();
      }
    },
    [creatorId, queryKey, query]
  );

  return {
    queue,
    pendingItems,
    activeItem,
    pendingCount: pendingItems.length,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    acceptItem,
    rejectItem,
    refetch: query.refetch,
    invalidate: query.invalidate,
  };
}
