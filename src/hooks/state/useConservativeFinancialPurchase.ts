"use client";

import { useState, useCallback, useRef } from "react";
import { serverCache } from "@/lib/state/server-cache";
import type { PurchaseInteractionReceipt } from "@/modules/interaction/interaction-purchase.service";

export type FinancialPurchaseStatus = "idle" | "processing" | "confirmed" | "error";

export interface FinancialPurchaseParams {
  creatorId: string;
  interactionId: string;
  creditCost: number;
  fanUserId: string;
  fanDisplayName?: string;
  fanAvatarUrl?: string;
  customMessage?: string;
  idempotencyKey?: string;
}

export interface UseConservativeFinancialPurchaseOptions {
  onSuccess?: (receipt: PurchaseInteractionReceipt) => void;
  onError?: (error: Error, code?: string) => void;
}

export interface UseConservativeFinancialPurchaseResult {
  status: FinancialPurchaseStatus;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  errorCode: string | null;
  receipt: PurchaseInteractionReceipt | null;
  purchase: (params: FinancialPurchaseParams) => Promise<PurchaseInteractionReceipt>;
  reset: () => void;
}

/**
 * useConservativeFinancialPurchase Hook
 *
 * Implements the Conservative UI pattern for financial transactions (e.g., 1,000-credit interaction):
 * 1. Shows an immediate loading/processing state when purchase is initiated.
 * 2. Prevents double-submissions via in-flight protection and idempotency keys.
 * 3. NEVER commits or permanently displays the purchase as successful until the authoritative backend confirms.
 * 4. Zero client-side phantom balance mutations: wallet is only re-synchronized after server confirmation.
 * 5. Handles backend rejections cleanly without corrupting client financial state.
 */
export function useConservativeFinancialPurchase(
  options: UseConservativeFinancialPurchaseOptions = {}
): UseConservativeFinancialPurchaseResult {
  const { onSuccess, onError } = options;

  const [status, setStatus] = useState<FinancialPurchaseStatus>("idle");
  const [error, setError] = useState<Error | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<PurchaseInteractionReceipt | null>(null);

  const isPendingRef = useRef(false);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setErrorCode(null);
    setReceipt(null);
    isPendingRef.current = false;
  }, []);

  const purchase = useCallback(
    async (params: FinancialPurchaseParams): Promise<PurchaseInteractionReceipt> => {
      // Guard against concurrent double-purchasing
      if (isPendingRef.current) {
        throw new Error("A financial transaction is already in progress.");
      }

      const {
        creatorId,
        interactionId,
        creditCost,
        fanUserId,
        fanDisplayName,
        fanAvatarUrl,
        customMessage,
        idempotencyKey = `fp_${fanUserId}_${interactionId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      } = params;

      if (!creatorId || !interactionId) {
        throw new Error("Missing required purchase parameters: creatorId and interactionId");
      }

      // 1. Enter immediate in-flight processing state (Loading state, but NOT success)
      isPendingRef.current = true;
      setStatus("processing");
      setError(null);
      setErrorCode(null);
      setReceipt(null);

      try {
        // 2. Submit authoritative purchase request to backend
        const res = await fetch(`/api/creators/${encodeURIComponent(creatorId)}/interactions/purchase`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            interactionId,
            expectedPrice: creditCost,
            fanUserId,
            fanDisplayName,
            fanAvatarUrl,
            customMessage,
            idempotencyKey,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          const errMsg = data.error || `Purchase rejected with status ${res.status}`;
          const errCode = data.code || `HTTP_${res.status}`;
          const serverError = new Error(errMsg);
          (serverError as any).code = errCode;
          throw serverError;
        }

        const authoritativeReceipt: PurchaseInteractionReceipt = data.receipt;

        // 3. TRANSITION TO CONFIRMED SUCCESS ONLY AFTER AUTHORITATIVE SERVER CONFIRMATION
        setStatus("confirmed");
        setReceipt(authoritativeReceipt);
        setError(null);
        setErrorCode(null);

        // 4. Invalidate authoritative server state caches (Wallet, Queue, XP)
        if (fanUserId) {
          serverCache.invalidate(`wallet:${fanUserId}`).catch(() => {});
          serverCache.invalidate(`xp:${fanUserId}:${creatorId}`).catch(() => {});
        }
        serverCache.invalidate(`interaction-queue:${creatorId}`).catch(() => {});

        if (onSuccess) {
          onSuccess(authoritativeReceipt);
        }

        return authoritativeReceipt;
      } catch (err: any) {
        // 5. On failure, cleanly transition to error state without corrupting financial state
        const financialError = err instanceof Error ? err : new Error(String(err));
        const code = (err as any)?.code || "PURCHASE_FAILED";

        setStatus("error");
        setError(financialError);
        setErrorCode(code);
        setReceipt(null);

        if (onError) {
          onError(financialError, code);
        }

        throw financialError;
      } finally {
        isPendingRef.current = false;
      }
    },
    [onSuccess, onError]
  );

  return {
    status,
    isPending: status === "processing",
    isSuccess: status === "confirmed",
    isError: status === "error",
    error,
    errorCode,
    receipt,
    purchase,
    reset,
  };
}
