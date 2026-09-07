"use client";

import { useCallback } from "react";
import { useServerQuery } from "@/lib/state/query-client";

export interface RelationshipLevelState {
  creatorId: string;
  fanId: string;
  fanLevel: number;
  relationshipTier: string;
  fanTitle: string;
  fanBadge: string;
  totalTokensContributed: number;
  watchMinutes: number;
  messagesSent: number;
  streakDays: number;
  isFollowing: boolean;
  isSubscribed: boolean;
  isVip: boolean;
  topContributorRank: number | null;
}

export function useRelationshipLevelState(fanId?: string, creatorId?: string) {
  const queryKey = ["relationship", fanId || "none", creatorId || "none"];

  const fetcher = useCallback(async (): Promise<RelationshipLevelState> => {
    if (!fanId || !creatorId) {
      return {
        creatorId: creatorId || "none",
        fanId: fanId || "none",
        fanLevel: 1,
        relationshipTier: "EXPLORER",
        fanTitle: "Explorer",
        fanBadge: "⭐ Fan Lv.1",
        totalTokensContributed: 0,
        watchMinutes: 0,
        messagesSent: 0,
        streakDays: 0,
        isFollowing: false,
        isSubscribed: false,
        isVip: false,
        topContributorRank: null,
      };
    }

    const res = await fetch(
      `/api/creators/${encodeURIComponent(creatorId)}/relationship?fanId=${encodeURIComponent(
        fanId
      )}`
    );

    if (!res.ok) {
      return {
        creatorId,
        fanId,
        fanLevel: 1,
        relationshipTier: "EXPLORER",
        fanTitle: "Explorer",
        fanBadge: "⭐ Fan Lv.1",
        totalTokensContributed: 0,
        watchMinutes: 0,
        messagesSent: 0,
        streakDays: 0,
        isFollowing: false,
        isSubscribed: false,
        isVip: false,
        topContributorRank: null,
      };
    }

    const json = await res.json();
    const data = json.data || json;

    return {
      creatorId,
      fanId,
      fanLevel: data.fanLevel || 1,
      relationshipTier: data.tier || data.relationshipTier || "EXPLORER",
      fanTitle: data.fanTitle || "Explorer",
      fanBadge: data.badge || `⭐ Fan Lv.${data.fanLevel || 1}`,
      totalTokensContributed: data.totalTokensContributed || 0,
      watchMinutes: data.watchMinutes || 0,
      messagesSent: data.messagesSent || 0,
      streakDays: data.streakDays || 0,
      isFollowing: Boolean(data.isFollowing),
      isSubscribed: Boolean(data.isSubscribed),
      isVip: Boolean(data.isVip),
      topContributorRank: data.topContributorRank || null,
    };
  }, [fanId, creatorId]);

  const query = useServerQuery<RelationshipLevelState>(queryKey, fetcher, {
    enabled: Boolean(fanId && creatorId),
    staleTime: 20000,
    tags: [
      "relationship",
      `relationship:${fanId}`,
      `relationship:${fanId}:${creatorId}`,
      `creator:${creatorId}`,
    ],
  });

  return {
    relationship: query.data,
    fanLevel: query.data?.fanLevel ?? 1,
    relationshipTier: query.data?.relationshipTier ?? "EXPLORER",
    fanBadge: query.data?.fanBadge ?? "⭐ Fan Lv.1",
    totalTokensContributed: query.data?.totalTokensContributed ?? 0,
    streakDays: query.data?.streakDays ?? 0,
    isFollowing: query.data?.isFollowing ?? false,
    isSubscribed: query.data?.isSubscribed ?? false,
    isVip: query.data?.isVip ?? false,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    invalidate: query.invalidate,
  };
}
