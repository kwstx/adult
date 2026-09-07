"use client";

import { useCallback } from "react";
import { useServerQuery } from "@/lib/state/query-client";

export interface SubscriptionState {
  isSubscribed: boolean;
  tier: "FREE" | "TIER_1" | "TIER_2" | "TIER_3" | "VIP" | null;
  status: "ACTIVE" | "PAUSED" | "EXPIRED" | "CANCELLED" | "NONE";
  expiresAt: string | null;
  hasVipEntitlement: boolean;
  canAccessPpvDiscount: boolean;
  canAccessVipChat: boolean;
}

export function useSubscriptionState(fanId?: string, creatorProfileId?: string) {
  const queryKey = ["subscription", fanId || "none", creatorProfileId || "none"];

  const fetcher = useCallback(async (): Promise<SubscriptionState> => {
    if (!fanId || !creatorProfileId) {
      return {
        isSubscribed: false,
        tier: null,
        status: "NONE",
        expiresAt: null,
        hasVipEntitlement: false,
        canAccessPpvDiscount: false,
        canAccessVipChat: false,
      };
    }

    const res = await fetch(
      `/api/subscriptions/entitlements?fanId=${encodeURIComponent(
        fanId
      )}&creatorProfileId=${encodeURIComponent(creatorProfileId)}`
    );

    if (!res.ok) {
      throw new Error(`Failed to check subscription entitlements: ${res.statusText}`);
    }

    const json = await res.json();
    const summary = json.summary || json;

    return {
      isSubscribed: Boolean(summary.isSubscribed || summary.hasActiveSubscription),
      tier: summary.tier || summary.subscriptionTier || (summary.isSubscribed ? "VIP" : null),
      status: summary.status || (summary.isSubscribed ? "ACTIVE" : "NONE"),
      expiresAt: summary.expiresAt || null,
      hasVipEntitlement: Boolean(summary.hasVipEntitlement || summary.isVip),
      canAccessPpvDiscount: Boolean(summary.canAccessPpvDiscount),
      canAccessVipChat: Boolean(summary.canAccessVipChat || summary.isVip),
    };
  }, [fanId, creatorProfileId]);

  const query = useServerQuery<SubscriptionState>(queryKey, fetcher, {
    enabled: Boolean(fanId && creatorProfileId),
    staleTime: 30000,
    tags: [
      "subscription",
      `subscription:${fanId}`,
      `subscription:${fanId}:${creatorProfileId}`,
    ],
  });

  return {
    subscription: query.data,
    isSubscribed: query.data?.isSubscribed ?? false,
    hasVipEntitlement: query.data?.hasVipEntitlement ?? false,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    invalidate: query.invalidate,
  };
}
