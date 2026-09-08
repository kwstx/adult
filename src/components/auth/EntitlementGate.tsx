"use client";

import React from "react";
import { useEntitlements } from "@/hooks/useEntitlements";
import { EntitlementKey } from "@/modules/entitlements/types";

export interface EntitlementGateProps {
  entitlement: EntitlementKey;
  creatorProfileId?: string;
  resourceId?: string;
  minimumTierLevel?: number;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loadingFallback?: React.ReactNode;
}

/**
 * Declarative UI Authorization Gate
 *
 * Renders protected child components (e.g. VIP Video player, Private Chat, Stream Stage)
 * only when the user possesses the authoritative server-verified entitlement.
 *
 * Example:
 * <EntitlementGate entitlement="SUBSCRIBER" creatorProfileId="creator_123" fallback={<SubscribeCard />}>
 *   <SubscriberExclusiveStream />
 * </EntitlementGate>
 */
export function EntitlementGate({
  entitlement,
  creatorProfileId,
  resourceId,
  minimumTierLevel = 1,
  children,
  fallback = null,
  loadingFallback = (
    <div className="flex items-center justify-center p-6 text-sm text-neutral-400 animate-pulse">
      Verifying access permissions...
    </div>
  ),
}: EntitlementGateProps) {
  const { summary, isLoading, hasEntitlement, subscriptionTierLevel } = useEntitlements({
    creatorProfileId,
    contentId: entitlement === "CONTENT_ACCESS" ? resourceId : undefined,
    livestreamId: entitlement === "PREMIUM_SEAT" ? resourceId : undefined,
  });

  if (isLoading) {
    return <>{loadingFallback}</>;
  }

  // Check specific entitlement logic
  let isAuthorized = false;

  if (entitlement === "SUBSCRIBER") {
    isAuthorized = (summary?.isSubscriber ?? false) && (subscriptionTierLevel >= minimumTierLevel);
  } else if (entitlement === "VIP_ACCESS") {
    isAuthorized = (summary?.isVip ?? false) || (subscriptionTierLevel >= 2);
  } else if (entitlement === "DIAMOND_ACCESS") {
    isAuthorized = (summary?.isDiamond ?? false) || (subscriptionTierLevel >= 3);
  } else if (entitlement === "CONTENT_ACCESS" && resourceId) {
    isAuthorized = summary?.unlockedContentIds.includes(resourceId) ?? false;
  } else {
    isAuthorized = hasEntitlement(entitlement, resourceId);
  }

  if (isAuthorized) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
