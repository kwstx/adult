"use client";

import { useCallback } from "react";
import { useServerQuery } from "@/lib/state/query-client";
import { serverCache } from "@/lib/state/server-cache";

export interface WalletState {
  userId: string;
  balance: number;
  currency: string;
  isFrozen: boolean;
  lastUpdated: string;
}

export function useWalletBalance(userId?: string) {
  const queryKey = ["wallet", userId || "anonymous"];

  const fetcher = useCallback(async (): Promise<WalletState> => {
    if (!userId) {
      return {
        userId: "anonymous",
        balance: 0,
        currency: "CREDITS",
        isFrozen: false,
        lastUpdated: new Date().toISOString(),
      };
    }

    const res = await fetch(`/api/economic/wallet?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch wallet balance: ${res.statusText}`);
    }
    const data = await res.json();
    return {
      userId,
      balance: data.wallet?.balance ?? data.balance ?? 0,
      currency: data.wallet?.currency ?? "CREDITS",
      isFrozen: Boolean(data.wallet?.isFrozen),
      lastUpdated: new Date().toISOString(),
    };
  }, [userId]);

  const query = useServerQuery<WalletState>(queryKey, fetcher, {
    enabled: Boolean(userId),
    staleTime: 15000, // 15s TTL
    tags: ["wallet", `wallet:${userId}`],
  });

  /**
   * Optimistically deducts credits for an action (e.g. gift or interaction),
   * rolling back automatically if the backend mutation rejects.
   */
  const optimisticSpend = useCallback(
    async <T>(
      amount: number,
      backendAction: () => Promise<T>
    ): Promise<T> => {
      if (!userId) throw new Error("User not authenticated");
      const currentBalance = query.data?.balance ?? 0;

      if (currentBalance < amount) {
        throw new Error(`Insufficient wallet balance (${currentBalance} < ${amount})`);
      }

      // Optimistically deduct
      const previousSnapshot = query.data;
      serverCache.set(queryKey, {
        ...previousSnapshot,
        userId,
        balance: currentBalance - amount,
        currency: previousSnapshot?.currency || "CREDITS",
        isFrozen: false,
        lastUpdated: new Date().toISOString(),
      });

      try {
        const result = await backendAction();
        // Trigger background revalidation to ensure server consistency
        query.refetch().catch(() => {});
        return result;
      } catch (err) {
        // Rollback to previous state
        if (previousSnapshot) {
          serverCache.set(queryKey, previousSnapshot);
        }
        throw err;
      }
    },
    [userId, query, queryKey]
  );

  return {
    balance: query.data?.balance ?? 0,
    wallet: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    invalidate: query.invalidate,
    optimisticSpend,
  };
}
