"use client";

import { useEffect, useRef, useCallback } from "react";
import { defaultTracker, RecommendationTracker } from "@/lib/recommendations/tracker";

interface UseRecommendationTrackerProps {
  userId?: string | null;
  creatorProfileId?: string | null;
  livestreamId?: string | null;
  category?: string;
  positionIndex?: number;
}

export function useRecommendationTracker({
  userId,
  creatorProfileId,
  livestreamId,
  category,
  positionIndex,
}: UseRecommendationTrackerProps) {
  const trackerRef = useRef<RecommendationTracker>(defaultTracker);
  const startTimeRef = useRef<number>(0);
  const activeCreatorIdRef = useRef<string | null | undefined>(creatorProfileId);

  // Keep tracker user ID updated
  useEffect(() => {
    trackerRef.current.setUserId(userId || null);
  }, [userId]);

  // Milestone timers for watch milestones
  const timer3sRef = useRef<NodeJS.Timeout | null>(null);
  const timer15sRef = useRef<NodeJS.Timeout | null>(null);
  const timer60sRef = useRef<NodeJS.Timeout | null>(null);

  // Manage watch milestones & impression when creator profile changes
  useEffect(() => {
    if (!creatorProfileId) return;

    activeCreatorIdRef.current = creatorProfileId;
    startTimeRef.current = Date.now();

    // 1. Track Impression
    trackerRef.current.trackImpression(
      creatorProfileId,
      livestreamId || undefined,
      category,
      positionIndex
    );

    // 2. Set milestone timers for watch telemetry
    timer3sRef.current = setTimeout(() => {
      trackerRef.current.trackWatch(
        creatorProfileId,
        3,
        livestreamId || undefined,
        category
      );
    }, 3000);

    timer15sRef.current = setTimeout(() => {
      trackerRef.current.trackWatch(
        creatorProfileId,
        15,
        livestreamId || undefined,
        category
      );
    }, 15000);

    timer60sRef.current = setTimeout(() => {
      trackerRef.current.trackWatch(
        creatorProfileId,
        60,
        livestreamId || undefined,
        category
      );
    }, 60000);

    // Cleanup on unmount or slide change -> record final EXIT & dwell time
    return () => {
      if (timer3sRef.current) clearTimeout(timer3sRef.current);
      if (timer15sRef.current) clearTimeout(timer15sRef.current);
      if (timer60sRef.current) clearTimeout(timer60sRef.current);

      if (startTimeRef.current > 0 && activeCreatorIdRef.current) {
        const dwellTimeMs = Date.now() - startTimeRef.current;
        trackerRef.current.trackExit(
          activeCreatorIdRef.current,
          dwellTimeMs,
          livestreamId || undefined
        );
      }
    };
  }, [creatorProfileId, livestreamId, category, positionIndex]);

  // High-level event triggers for the component
  const trackLike = useCallback(() => {
    if (creatorProfileId) {
      trackerRef.current.trackLike(creatorProfileId, livestreamId || undefined);
    }
  }, [creatorProfileId, livestreamId]);

  const trackChat = useCallback(
    (messageLength?: number) => {
      if (creatorProfileId) {
        trackerRef.current.trackChat(
          creatorProfileId,
          livestreamId || undefined,
          messageLength
        );
      }
    },
    [creatorProfileId, livestreamId]
  );

  const trackGift = useCallback(
    (amountCredits: number, giftName?: string) => {
      if (creatorProfileId) {
        trackerRef.current.trackGift(
          creatorProfileId,
          amountCredits,
          livestreamId || undefined,
          giftName
        );
      }
    },
    [creatorProfileId, livestreamId]
  );

  const trackInteraction = useCallback(
    (actionType: string, amountCredits = 0) => {
      if (creatorProfileId) {
        trackerRef.current.trackInteraction(
          creatorProfileId,
          actionType,
          amountCredits,
          livestreamId || undefined
        );
      }
    },
    [creatorProfileId, livestreamId]
  );

  const trackFollow = useCallback(() => {
    if (creatorProfileId) {
      trackerRef.current.trackFollow(creatorProfileId, category);
    }
  }, [creatorProfileId, category]);

  const trackUnfollow = useCallback(() => {
    if (creatorProfileId) {
      trackerRef.current.trackUnfollow(creatorProfileId);
    }
  }, [creatorProfileId]);

  const trackSubscription = useCallback(
    (tier = "VIP", amountCredits = 200) => {
      if (creatorProfileId) {
        trackerRef.current.trackSubscription(creatorProfileId, tier, amountCredits);
      }
    },
    [creatorProfileId]
  );

  const trackContentPurchase = useCallback(
    (contentId: string, amountCredits: number) => {
      if (creatorProfileId) {
        trackerRef.current.trackContentPurchase(
          creatorProfileId,
          contentId,
          amountCredits
        );
      }
    },
    [creatorProfileId]
  );

  const trackPrivateSession = useCallback(
    (durationMinutes: number, amountCredits: number) => {
      if (creatorProfileId) {
        trackerRef.current.trackPrivateSession(
          creatorProfileId,
          durationMinutes,
          amountCredits
        );
      }
    },
    [creatorProfileId]
  );

  const trackProfileView = useCallback(() => {
    if (creatorProfileId) {
      trackerRef.current.trackCreatorProfileView(creatorProfileId);
    }
  }, [creatorProfileId]);

  const trackSearch = useCallback((query: string, searchCat?: string) => {
    trackerRef.current.trackSearch(query, searchCat);
  }, []);

  const trackSwipe = useCallback(
    (fromCreatorId?: string, toCreatorId?: string, idx?: number) => {
      trackerRef.current.trackSwipe(fromCreatorId, toCreatorId, idx);
    },
    []
  );

  return {
    tracker: trackerRef.current,
    trackLike,
    trackChat,
    trackGift,
    trackInteraction,
    trackFollow,
    trackUnfollow,
    trackSubscription,
    trackContentPurchase,
    trackPrivateSession,
    trackProfileView,
    trackSearch,
    trackSwipe,
    flush: () => trackerRef.current.flush(),
  };
}
