"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AwardXPResult,
  CreatorFanRelationshipDetail,
  CreatorRelationshipTreeData,
  FanMultiCreatorMatrix,
} from "@/modules/relationship/types";

interface UseRelationshipOptions {
  creatorId?: string;
  fanId?: string;
  autoFetch?: boolean;
}

export function useRelationship({
  creatorId,
  fanId = "usr_fan_alex",
  autoFetch = true,
}: UseRelationshipOptions = {}) {
  const [relationship, setRelationship] =
    useState<CreatorFanRelationshipDetail | null>(null);
  const [treeData, setTreeData] = useState<CreatorRelationshipTreeData | null>(
    null
  );
  const [matrix, setMatrix] = useState<FanMultiCreatorMatrix | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAwarding, setIsAwarding] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpgradeResult, setLastUpgradeResult] =
    useState<AwardXPResult | null>(null);

  const fetchRelationship = useCallback(async () => {
    if (!creatorId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/creators/${creatorId}/relationship?fanId=${encodeURIComponent(
          fanId
        )}`
      );
      const json = await res.json();
      if (json.success) {
        setRelationship(json.data);
      } else {
        setError(json.error || "Failed to load relationship");
      }
    } catch (err: any) {
      setError(err.message || "Network error fetching relationship");
    } finally {
      setIsLoading(false);
    }
  }, [creatorId, fanId]);

  const fetchTree = useCallback(async () => {
    if (!creatorId) return;
    try {
      const res = await fetch(
        `/api/creators/${creatorId}/relationship-tree?fanId=${encodeURIComponent(
          fanId
        )}`
      );
      const json = await res.json();
      if (json.success) {
        setTreeData(json.data);
      }
    } catch (err: any) {
      console.error("Failed to load relationship tree:", err);
    }
  }, [creatorId, fanId]);

  const fetchMatrix = useCallback(async () => {
    if (!fanId) return;
    try {
      const res = await fetch(
        `/api/fans/${encodeURIComponent(fanId)}/relationships`
      );
      const json = await res.json();
      if (json.success) {
        setMatrix(json.data);
      }
    } catch (err: any) {
      console.error("Failed to load fan matrix:", err);
    }
  }, [fanId]);

  useEffect(() => {
    if (autoFetch && creatorId) {
      fetchRelationship();
      fetchTree();
    }
  }, [autoFetch, creatorId, fetchRelationship, fetchTree]);

  const awardXp = useCallback(
    async (params: {
      eventType?: string;
      creditsSpent?: number;
      minutesWatched?: number;
      messagesCount?: number;
      customXpAmount?: number;
    }): Promise<AwardXPResult | null> => {
      if (!creatorId) return null;
      setIsAwarding(true);
      setError(null);
      try {
        const res = await fetch(`/api/creators/${creatorId}/relationship`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fanId,
            ...params,
          }),
        });
        const json = await res.json();
        if (json.success) {
          const result: AwardXPResult = json.data;
          setRelationship(result.relationship);
          if (result.didLevelUpTier) {
            setLastUpgradeResult(result);
          }
          // Refresh tree & matrix
          fetchTree();
          fetchMatrix();
          return result;
        } else {
          setError(json.error || "Failed to award XP");
          return null;
        }
      } catch (err: any) {
        setError(err.message || "Failed to award XP");
        return null;
      } finally {
        setIsAwarding(false);
      }
    },
    [creatorId, fanId, fetchTree, fetchMatrix]
  );

  const simulate = useCallback(
    async (
      action: "TIP_50" | "TIP_500" | "WATCH_30M" | "CHAT_10" | "SUB_VIP" | "CUSTOM",
      customXp = 0
    ): Promise<AwardXPResult | null> => {
      if (!creatorId) return null;
      setIsAwarding(true);
      setError(null);
      try {
        const res = await fetch(`/api/creators/${creatorId}/relationship`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fanId,
            action,
            customXp,
          }),
        });
        const json = await res.json();
        if (json.success) {
          const result: AwardXPResult = json.data;
          setRelationship(result.relationship);
          if (result.didLevelUpTier) {
            setLastUpgradeResult(result);
          }
          fetchTree();
          fetchMatrix();
          return result;
        } else {
          setError(json.error || "Failed to simulate engagement");
          return null;
        }
      } catch (err: any) {
        setError(err.message || "Simulation failed");
        return null;
      } finally {
        setIsAwarding(false);
      }
    },
    [creatorId, fanId, fetchTree, fetchMatrix]
  );

  return {
    relationship,
    treeData,
    matrix,
    isLoading,
    isAwarding,
    error,
    lastUpgradeResult,
    clearUpgradeAlert: () => setLastUpgradeResult(null),
    refetch: fetchRelationship,
    fetchTree,
    fetchMatrix,
    awardXp,
    simulate,
  };
}
