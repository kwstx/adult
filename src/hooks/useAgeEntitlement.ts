"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@/lib/user-context";

export type AgeVerificationStatus =
  | "NOT_STARTED"
  | "SESSION_CREATED"
  | "PENDING_SUBMISSION"
  | "IN_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED"
  | "REVOKED";

export interface AgeEntitlementSummary {
  userId: string;
  isFullyVerified: boolean;
  primaryStatus: AgeVerificationStatus;
  highestAssuranceLevel: string | null;
  jurisdiction: string;
  verifiedAt: string | null;
  expiresAt: string | null;
  entitlements: {
    AGE_VERIFIED_ENTRY: boolean;
    ADULT_MEDIA_PLAYBACK: boolean;
    INTERACTIVE_PARTICIPATION: boolean;
    PPV_PURCHASE: boolean;
    PRIVATE_SESSION_ACCESS: boolean;
    CREATOR_BROADCAST_2257: boolean;
  };
}

export function useAgeEntitlement(jurisdictionCode = "DEFAULT") {
  const { currentUser, setAgeVerified } = useUser();
  const [summary, setSummary] = useState<AgeEntitlementSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInitiatingSession, setIsInitiatingSession] = useState(false);
  const [activeSessionUrl, setActiveSessionUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchEntitlements = useCallback(async () => {
    if (!currentUser?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(
        `/api/safety/age-verify/entitlements?userId=${encodeURIComponent(
          currentUser.id
        )}&jurisdiction=${encodeURIComponent(jurisdictionCode)}`
      );

      if (res.ok) {
        const data = await res.json();
        setSummary(data);
        const verified = data.entitlements?.ADULT_MEDIA_PLAYBACK ?? false;
        setAgeVerified(verified);
      }
    } catch (err: any) {
      console.error("Failed to load age entitlements:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id, jurisdictionCode, setAgeVerified]);

  useEffect(() => {
    fetchEntitlements();
  }, [fetchEntitlements]);

  // Auto-poll when verification is pending
  useEffect(() => {
    if (summary?.primaryStatus === "PENDING_SUBMISSION" || summary?.primaryStatus === "IN_REVIEW") {
      const interval = setInterval(() => {
        fetchEntitlements();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [summary?.primaryStatus, fetchEntitlements]);

  const initiateVerification = async (params?: {
    method?: string;
    jurisdiction?: string;
    redirectUrl?: string;
  }) => {
    if (!currentUser?.id) {
      setError("Please log in to verify your age.");
      return null;
    }

    setIsInitiatingSession(true);
    setError(null);

    try {
      const res = await fetch("/api/safety/age-verify/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          method: params?.method || "ID_DOCUMENT_KYC",
          jurisdictionCode: params?.jurisdiction || jurisdictionCode,
          redirectUrl: params?.redirectUrl || window.location.href,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to start verification session.");
      }

      setActiveSessionUrl(data.hostedVerificationUrl);
      return data;
    } catch (err: any) {
      setError(err.message || "Failed to initiate verification");
      return null;
    } finally {
      setIsInitiatingSession(false);
    }
  };

  return {
    summary,
    isLoading,
    isModalOpen,
    openAgeModal: () => setIsModalOpen(true),
    closeAgeModal: () => setIsModalOpen(false),
    isInitiatingSession,
    activeSessionUrl,
    error,
    refreshEntitlements: fetchEntitlements,
    initiateVerification,

    // Feature Flags & Access Helpers
    isVerified: summary?.entitlements?.ADULT_MEDIA_PLAYBACK ?? false,
    canViewAdultMedia: summary?.entitlements?.ADULT_MEDIA_PLAYBACK ?? false,
    canInteractAndChat: summary?.entitlements?.INTERACTIVE_PARTICIPATION ?? false,
    canPurchasePPV: summary?.entitlements?.PPV_PURCHASE ?? false,
    canBroadcastLive: summary?.entitlements?.CREATOR_BROADCAST_2257 ?? false,
    status: summary?.primaryStatus || "NOT_STARTED",
  };
}
