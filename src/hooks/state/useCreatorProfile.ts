"use client";

import { useCallback } from "react";
import { useServerQuery } from "@/lib/state/query-client";

export interface CreatorProfileState {
  id: string;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  followerCount: number;
  subscriberCount: number;
  isLive: boolean;
  categories: string[];
  subscriptionTiers: Array<{
    id: string;
    name: string;
    price: number;
    perks: string[];
  }>;
  interactionMenu: Array<{
    id: string;
    title: string;
    creditCost: number;
    actionType: string;
    description?: string;
  }>;
}

export function useCreatorProfile(creatorId?: string, viewerUserId?: string) {
  const queryKey = ["creator", creatorId || "none"];

  const fetcher = useCallback(async (): Promise<CreatorProfileState> => {
    if (!creatorId) {
      throw new Error("creatorId is required");
    }

    const url = `/api/creators/${encodeURIComponent(creatorId)}${
      viewerUserId ? `?viewerId=${encodeURIComponent(viewerUserId)}` : ""
    }`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to load creator profile: ${res.statusText}`);
    }
    const json = await res.json();
    const data = json.data || json;

    return {
      id: data.id || creatorId,
      username: data.username || creatorId,
      displayName: data.displayName || data.stageName || creatorId,
      bio: data.bio || "",
      avatarUrl: data.avatarUrl || "",
      bannerUrl: data.bannerUrl || "",
      followerCount: data.followerCount || data._count?.followers || 0,
      subscriberCount: data.subscriberCount || 0,
      isLive: Boolean(data.isLive),
      categories: data.categories || (data.category ? [data.category] : []),
      subscriptionTiers: data.subscriptionTiers || [],
      interactionMenu: data.interactions || data.interactionMenu || [],
    };
  }, [creatorId, viewerUserId]);

  const query = useServerQuery<CreatorProfileState>(queryKey, fetcher, {
    enabled: Boolean(creatorId),
    staleTime: 60000, // 60s TTL for static profile info
    tags: ["creator", `creator:${creatorId}`],
  });

  return {
    creator: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    invalidate: query.invalidate,
  };
}
