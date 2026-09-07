"use client";

import { useState, useCallback, useRef } from "react";
import { serverCache } from "@/lib/state/server-cache";
import type { CreatorProfileState } from "./useCreatorProfile";

export interface UseOptimisticFollowOptions {
  initialIsFollowing?: boolean;
  initialFollowerCount?: number;
  notificationsEnabled?: boolean;
  onSuccess?: (isFollowing: boolean, followerCount: number) => void;
  onError?: (error: Error, rolledBackState: { isFollowing: boolean; followerCount: number }) => void;
}

export interface UseOptimisticFollowResult {
  isFollowing: boolean;
  followerCount: number;
  isPending: boolean;
  error: Error | null;
  toggleFollow: () => Promise<boolean>;
  setFollowState: (isFollowing: boolean, count?: number) => void;
}

/**
 * useOptimisticFollow Hook
 *
 * Implements the Optimistic UI pattern for social actions:
 * 1. Instantly updates local UI state (e.g., Follow -> Following, count + 1) without waiting for network.
 * 2. Simultaneously dispatches background API request.
 * 3. Automatically rolls back to the previous snapshot if the request fails or times out.
 * 4. Reconciles with server-state cache upon completion.
 */
export function useOptimisticFollow(
  creatorId: string,
  options: UseOptimisticFollowOptions = {}
): UseOptimisticFollowResult {
  const {
    initialIsFollowing = false,
    initialFollowerCount = 0,
    notificationsEnabled = true,
    onSuccess,
    onError,
  } = options;

  // Optimistic UI state
  const [isFollowing, setIsFollowing] = useState<boolean>(initialIsFollowing);
  const [followerCount, setFollowerCount] = useState<number>(initialFollowerCount);
  const [isPending, setIsPending] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Keep references to prevent stale closures
  const stateRef = useRef({ isFollowing, followerCount });
  stateRef.current = { isFollowing, followerCount };

  const setFollowState = useCallback((following: boolean, count?: number) => {
    setIsFollowing(following);
    if (count !== undefined) {
      setFollowerCount(count);
    }
  }, []);

  const toggleFollow = useCallback(async (): Promise<boolean> => {
    if (!creatorId) return stateRef.current.isFollowing;

    // 1. Snapshot previous state for rollback
    const previousSnapshot = {
      isFollowing: stateRef.current.isFollowing,
      followerCount: stateRef.current.followerCount,
    };

    // 2. Compute optimistic next state
    const nextIsFollowing = !previousSnapshot.isFollowing;
    const nextFollowerCount = nextIsFollowing
      ? previousSnapshot.followerCount + 1
      : Math.max(0, previousSnapshot.followerCount - 1);

    // 3. APPLY INSTANT OPTIMISTIC TRANSITION (UI updates immediately: Follow -> Following)
    setIsFollowing(nextIsFollowing);
    setFollowerCount(nextFollowerCount);
    setIsPending(true);
    setError(null);

    // Optimistically update ServerStateCache for creator profile if cached
    const creatorCacheKey = ["creator", creatorId];
    const cachedProfile = serverCache.getData<CreatorProfileState>(creatorCacheKey);
    if (cachedProfile) {
      serverCache.set(creatorCacheKey, {
        ...cachedProfile,
        followerCount: nextFollowerCount,
      });
    }

    try {
      // 4. Background network request
      const res = await fetch(`/api/creators/${encodeURIComponent(creatorId)}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationsEnabled }),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error || `Follow request failed (${res.status})`);
      }

      const responseData = await res.json();
      const authoritativeFollowing =
        responseData.isFollowing !== undefined ? responseData.isFollowing : nextIsFollowing;
      const authoritativeCount =
        responseData.followerCount !== undefined
          ? responseData.followerCount
          : nextFollowerCount;

      // 5. Commit authoritative backend values
      setIsFollowing(authoritativeFollowing);
      setFollowerCount(authoritativeCount);
      setIsPending(false);

      // Revalidate cache in background
      serverCache.invalidate(`creator:${creatorId}`).catch(() => {});

      if (onSuccess) {
        onSuccess(authoritativeFollowing, authoritativeCount);
      }

      return authoritativeFollowing;
    } catch (err: any) {
      const followError = err instanceof Error ? err : new Error(String(err));

      // 6. ROLLBACK TO PREVIOUS SNAPSHOT ON FAILURE
      setIsFollowing(previousSnapshot.isFollowing);
      setFollowerCount(previousSnapshot.followerCount);
      setIsPending(false);
      setError(followError);

      // Rollback ServerStateCache
      if (cachedProfile) {
        serverCache.set(creatorCacheKey, cachedProfile);
      }

      if (onError) {
        onError(followError, previousSnapshot);
      }

      return previousSnapshot.isFollowing;
    }
  }, [creatorId, notificationsEnabled, onSuccess, onError]);

  return {
    isFollowing,
    followerCount,
    isPending,
    error,
    toggleFollow,
    setFollowState,
  };
}
