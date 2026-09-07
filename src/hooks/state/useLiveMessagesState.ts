"use client";

import { useCallback } from "react";
import { useServerQuery } from "@/lib/state/query-client";
import { serverCache } from "@/lib/state/server-cache";
import type { ChatMessagePayload } from "@/modules/realtime/types";

export function useLiveMessagesState(creatorId?: string) {
  const queryKey = ["messages", creatorId || "none"];

  const fetcher = useCallback(async (): Promise<ChatMessagePayload[]> => {
    if (!creatorId) return [];

    const res = await fetch(`/api/realtime/${encodeURIComponent(creatorId)}/chat`);
    if (!res.ok) return [];

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }, [creatorId]);

  const query = useServerQuery<ChatMessagePayload[]>(queryKey, fetcher, {
    enabled: Boolean(creatorId),
    staleTime: 5000,
    tags: ["chat", `chat:${creatorId}`],
  });

  /**
   * Appends an incoming message to the cached messages list.
   */
  const appendMessage = useCallback(
    (message: ChatMessagePayload) => {
      serverCache.mutate<ChatMessagePayload[]>(queryKey, (current) => {
        const list = current || [];
        // Deduplicate by id
        if (list.some((m) => m.id === message.id)) {
          return list;
        }
        return [...list.slice(-99), message];
      });
    },
    [queryKey]
  );

  /**
   * Sends a chat message optimistically, posting to backend and rolling back if rejected.
   */
  const sendMessage = useCallback(
    async (params: {
      senderId: string;
      senderDisplayName: string;
      text: string;
      fanLevel?: number;
      badge?: string;
    }): Promise<boolean> => {
      if (!creatorId || !params.text.trim()) return false;

      const optimisticMsg: ChatMessagePayload = {
        id: `msg_opt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        creatorId,
        senderId: params.senderId,
        senderName: params.senderDisplayName,
        senderRole: "FAN",
        senderBadge: params.badge || "",
        senderFanLevel: params.fanLevel || 1,
        text: params.text.trim(),
        createdAt: new Date().toISOString(),
      };

      // Optimistic append
      appendMessage(optimisticMsg);

      try {
        const res = await fetch(`/api/realtime/${creatorId}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            senderId: params.senderId,
            text: params.text.trim(),
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to send message");
        }
        return true;
      } catch (err) {
        // Rollback optimistic message
        serverCache.mutate<ChatMessagePayload[]>(queryKey, (current) => {
          return (current || []).filter((m) => m.id !== optimisticMsg.id);
        });
        throw err;
      }
    },
    [creatorId, appendMessage, queryKey]
  );

  return {
    messages: query.data || [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    sendMessage,
    appendMessage,
    refetch: query.refetch,
    invalidate: query.invalidate,
  };
}
