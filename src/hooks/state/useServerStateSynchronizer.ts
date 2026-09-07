"use client";

import { useEffect, useRef, useState } from "react";
import { serverCache } from "@/lib/state/server-cache";
import type {
  ChatMessagePayload,
  GiftSentPayload,
  GoalUpdatedPayload,
} from "@/modules/realtime/types";
import type { LiveStatusState } from "./useLiveStatus";
import type { QueueItem } from "./useInteractionQueueState";

export type SSEConnectionStatus =
  | "INITIALIZING"
  | "CONNECTING"
  | "CONNECTED"
  | "RECONNECTING"
  | "DISCONNECTED"
  | "ERROR";

export interface UseServerStateSynchronizerOptions {
  creatorId?: string;
  userId?: string;
  displayName?: string;
  enabled?: boolean;
}

/**
 * Realtime Event to Server State Synchronizer
 * Subscribes to backend SSE stream and reconciles incoming domain events directly
 * with the authoritative ServerStateCache, invalidating or patching state accurately.
 */
export function useServerStateSynchronizer({
  creatorId,
  userId,
  displayName,
  enabled = true,
}: UseServerStateSynchronizerOptions) {
  const [connectionStatus, setConnectionStatus] =
    useState<SSEConnectionStatus>("INITIALIZING");
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled || !creatorId) {
      setConnectionStatus("DISCONNECTED");
      return;
    }

    setConnectionStatus("CONNECTING");

    const params = new URLSearchParams();
    if (userId) params.set("userId", userId);
    if (displayName) params.set("displayName", displayName);

    const sseUrl = `/api/realtime/${encodeURIComponent(creatorId)}/sse?${params.toString()}`;
    const eventSource = new EventSource(sseUrl);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnectionStatus("CONNECTED");
    };

    eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        const { type, payload } = event;

        switch (type) {
          // -------------------------------------------------------------
          // 1. PRESENCE & VIEWER COUNT
          // -------------------------------------------------------------
          case "CONNECTED":
          case "HEARTBEAT":
          case "PRESENCE_COUNT":
          case "VIEWER_JOINED":
          case "VIEWER_LEFT": {
            const count = typeof payload.viewerCount === "number" ? payload.viewerCount : undefined;
            if (count !== undefined) {
              serverCache.mutate<LiveStatusState>(
                ["live-status", creatorId],
                (current) => ({
                  creatorId,
                  isLive: current?.isLive ?? false,
                  streamTitle: current?.streamTitle ?? "Live Stream",
                  viewerCount: count,
                  streamHealth: current?.streamHealth ?? "EXCELLENT",
                  posterUrl: current?.posterUrl,
                  playbackUrl: current?.playbackUrl,
                  goal: current?.goal,
                }),
                { rollbackOnError: false }
              );
            }
            break;
          }

          // -------------------------------------------------------------
          // 2. BROADCAST ROOM STATUS
          // -------------------------------------------------------------
          case "ROOM_STATUS": {
            if (payload.isLive !== undefined) {
              serverCache.mutate<LiveStatusState>(
                ["live-status", creatorId],
                (current) => ({
                  creatorId,
                  isLive: payload.isLive,
                  streamTitle: current?.streamTitle ?? "Live Stream",
                  viewerCount: current?.viewerCount ?? 0,
                  streamHealth: payload.isLive ? "EXCELLENT" : "OFFLINE",
                  posterUrl: current?.posterUrl,
                  playbackUrl: current?.playbackUrl,
                  goal: current?.goal,
                }),
                { rollbackOnError: false }
              );
            }
            break;
          }

          // -------------------------------------------------------------
          // 3. CHAT MESSAGES
          // -------------------------------------------------------------
          case "NEW_MESSAGE":
          case "CHAT_MESSAGE": {
            const msg = payload as ChatMessagePayload;
            serverCache.mutate<ChatMessagePayload[]>(
              ["messages", creatorId],
              (current) => {
                const list = current || [];
                if (list.some((m) => m.id === msg.id)) return list;
                return [...list.slice(-99), msg];
              },
              { rollbackOnError: false }
            );
            break;
          }

          // -------------------------------------------------------------
          // 4. GIFT SENT & MILESTONE GOALS
          // -------------------------------------------------------------
          case "GIFT_SENT": {
            const gift = payload as GiftSentPayload;

            // A. Update live goal in cache
            if (gift.updatedGoal) {
              serverCache.mutate<LiveStatusState>(
                ["live-status", creatorId],
                (current) => ({
                  creatorId,
                  isLive: current?.isLive ?? true,
                  streamTitle: current?.streamTitle ?? "Live Stream",
                  viewerCount: current?.viewerCount ?? 0,
                  streamHealth: current?.streamHealth ?? "EXCELLENT",
                  posterUrl: current?.posterUrl,
                  playbackUrl: current?.playbackUrl,
                  goal: {
                    title: gift.updatedGoal.title,
                    target: gift.updatedGoal.target,
                    progress: gift.updatedGoal.progress,
                    percentage: gift.updatedGoal.percentage,
                    isCompleted: gift.updatedGoal.isCompleted,
                  },
                }),
                { rollbackOnError: false }
              );
            }

            // B. If current user sent the gift, invalidate their wallet & progression
            if (userId && gift.sender?.userId === userId) {
              serverCache.invalidate(["wallet", userId]);
              serverCache.invalidate(["xp", userId, creatorId]);
              serverCache.invalidate(["relationship", userId, creatorId]);
            }
            break;
          }

          // -------------------------------------------------------------
          // 5. GOAL UPDATES
          // -------------------------------------------------------------
          case "GOAL_UPDATED": {
            const goal = payload as GoalUpdatedPayload;
            serverCache.mutate<LiveStatusState>(
              ["live-status", creatorId],
              (current) => ({
                creatorId,
                isLive: current?.isLive ?? true,
                streamTitle: current?.streamTitle ?? "Live Stream",
                viewerCount: current?.viewerCount ?? 0,
                streamHealth: current?.streamHealth ?? "EXCELLENT",
                posterUrl: current?.posterUrl,
                playbackUrl: current?.playbackUrl,
                goal: {
                  title: goal.title,
                  target: goal.target,
                  progress: goal.progress,
                  percentage: goal.percentage,
                  isCompleted: goal.isCompleted,
                },
              }),
              { rollbackOnError: false }
            );
            break;
          }

          // -------------------------------------------------------------
          // 6. INTERACTION QUEUE EVENTS
          // -------------------------------------------------------------
          case "INTERACTION_PURCHASED":
          case "INTERACTION_ACCEPTED":
          case "INTERACTION_STARTED":
          case "INTERACTION_COMPLETED":
          case "INTERACTION_REJECTED":
          case "INTERACTION_CANCELLED":
          case "INTERACTION_REFUNDED":
          case "QUEUE_STATE_CHANGED": {
            // Invalidate queue query to fetch authoritative sequence
            serverCache.invalidate(["interaction-queue", creatorId]);

            // If fan received a refund, invalidate wallet
            if (payload?.senderId && userId && payload.senderId === userId) {
              serverCache.invalidate(["wallet", userId]);
            }
            break;
          }

          // -------------------------------------------------------------
          // 7. XP & RELATIONSHIP ADVANCEMENT
          // -------------------------------------------------------------
          case "XP_AWARDED":
          case "RELATIONSHIP_LEVEL_UP": {
            if (userId && (payload?.fanId === userId || payload?.userId === userId)) {
              serverCache.invalidate(["xp", userId, creatorId]);
              serverCache.invalidate(["relationship", userId, creatorId]);
            }
            break;
          }

          default:
            break;
        }
      } catch (err) {
        console.error("SSE sync parsing error:", err);
      }
    };

    eventSource.onerror = () => {
      setConnectionStatus("RECONNECTING");
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
      setConnectionStatus("DISCONNECTED");
    };
  }, [creatorId, userId, displayName, enabled]);

  return {
    connectionStatus,
    disconnect: () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        setConnectionStatus("DISCONNECTED");
      }
    },
  };
}
