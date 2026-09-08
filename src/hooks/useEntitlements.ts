"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@/lib/user-context";
import { UserEntitlementsSummary, EntitlementKey } from "@/modules/entitlements/types";

export interface UseEntitlementsOptions {
  creatorProfileId?: string;
  livestreamId?: string;
  contentId?: string;
  autoFetch?: boolean;
}

export interface UseEntitlementsReturn {
  summary: UserEntitlementsSummary | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  
  // Instant Authoritative Helpers
  hasEntitlement: (key: EntitlementKey, resourceId?: string) => boolean;
  isSubscriber: boolean;
  isVip: boolean;
  isDiamond: boolean;
  subscriptionTierLevel: number;
  hasContentAccess: (contentId: string) => boolean;
  hasPremiumSeat: boolean;
  hasPrivateSession: boolean;
  hasPriorityQueue: boolean;
  hasDirectMessageAccess: boolean;
}

/**
 * Universal Client Hook for Authoritative Entitlements
 *
 * Eliminates dozens of independent permission checks in UI components:
 * Components ask: "What does this user have access to?"
 * and render interface controls / gates accordingly.
 */
export function useEntitlements(options: UseEntitlementsOptions = {}): UseEntitlementsReturn {
  const { creatorProfileId, livestreamId, contentId, autoFetch = true } = options;
  const { currentUser } = useUser();
  
  const [summary, setSummary] = useState<UserEntitlementsSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntitlements = useCallback(async () => {
    if (!currentUser?.id) {
      setSummary(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (creatorProfileId) params.append("creatorProfileId", creatorProfileId);
      if (livestreamId) params.append("livestreamId", livestreamId);
      if (contentId) params.append("contentId", contentId);

      const res = await fetch(`/api/entitlements?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch entitlements (Status ${res.status})`);
      }

      const json = await res.json();
      if (json.success && json.data) {
        setSummary(json.data);
      } else {
        throw new Error(json.message || "Failed to parse entitlements");
      }
    } catch (err: any) {
      setError(err?.message || "Error checking access permissions");
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id, creatorProfileId, livestreamId, contentId]);

  useEffect(() => {
    if (autoFetch) {
      fetchEntitlements();
    }
  }, [fetchEntitlements, autoFetch]);

  // Helper check method
  const hasEntitlement = useCallback(
    (key: EntitlementKey, resourceId?: string): boolean => {
      if (!summary) return false;
      if (key === "SUBSCRIBER") return summary.isSubscriber;
      if (key === "VIP_ACCESS") return summary.isVip;
      if (key === "DIAMOND_ACCESS") return summary.isDiamond;
      if (key === "PREMIUM_SEAT") return summary.hasPremiumSeat;
      if (key === "PRIVATE_SESSION_ACCESS") return summary.hasPrivateSession;
      if (key === "PRIORITY_INTERACTION") return summary.hasPriorityQueue;
      if (key === "CONTENT_ACCESS" && resourceId) {
        return summary.unlockedContentIds.includes(resourceId);
      }

      return summary.activeEntitlements.some(
        (e) => e.key === key && (!resourceId || e.resourceId === resourceId)
      );
    },
    [summary]
  );

  const hasContentAccess = useCallback(
    (targetContentId: string): boolean => {
      if (!summary) return false;
      return summary.unlockedContentIds.includes(targetContentId);
    },
    [summary]
  );

  return {
    summary,
    isLoading,
    error,
    refetch: fetchEntitlements,
    hasEntitlement,
    isSubscriber: summary?.isSubscriber ?? false,
    isVip: summary?.isVip ?? false,
    isDiamond: summary?.isDiamond ?? false,
    subscriptionTierLevel: summary?.subscriptionTierLevel ?? 0,
    hasContentAccess,
    hasPremiumSeat: summary?.hasPremiumSeat ?? false,
    hasPrivateSession: summary?.hasPrivateSession ?? false,
    hasPriorityQueue: summary?.hasPriorityQueue ?? false,
    hasDirectMessageAccess: summary?.hasDirectMessageAccess ?? false,
  };
}
