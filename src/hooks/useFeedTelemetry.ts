"use client";

import { useEffect, useRef, useCallback } from "react";

export type TelemetryEventType =
  | "IMPRESSION"
  | "WATCH_3S"
  | "WATCH_20S"
  | "WATCH_30S"
  | "WATCH_90S"
  | "WATCH_DURATION"
  | "IMMEDIATE_BOUNCE"
  | "FOLLOW"
  | "UNFOLLOW"
  | "INTERACTION_MENU_OPEN"
  | "STREAM_ENTER"
  | "STREAM_LEAVE"
  | "CHAT_OPEN"
  | "GIFT_OPEN"
  | "PPV_OPEN"
  | "LIKE"
  | "TIP";

export interface TelemetryEvent {
  sessionId: string;
  userId?: string;
  creatorId: string;
  streamId?: string;
  eventType: TelemetryEventType;
  dwellTimeMs?: number;
  category?: string;
  positionIndex?: number;
  metadata?: Record<string, any>;
  timestamp: number;
}

interface UseFeedTelemetryOptions {
  userId?: string;
  currentCreatorId?: string;
  currentPositionIndex?: number;
  category?: string;
}

export function useFeedTelemetry({
  userId,
  currentCreatorId,
  currentPositionIndex,
  category,
}: UseFeedTelemetryOptions) {
  const sessionIdRef = useRef<string>("");
  const eventBufferRef = useRef<TelemetryEvent[]>([]);
  const startTimeRef = useRef<number>(0);
  const activeCreatorIdRef = useRef<string | undefined>(undefined);
  const activeCategoryRef = useRef<string | undefined>(undefined);
  const activeIndexRef = useRef<number | undefined>(undefined);

  // Timer references for milestones
  const timer3sRef = useRef<NodeJS.Timeout | null>(null);
  const timer20sRef = useRef<NodeJS.Timeout | null>(null);
  const timer30sRef = useRef<NodeJS.Timeout | null>(null);
  const timer90sRef = useRef<NodeJS.Timeout | null>(null);
  const flushTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize unique session ID once per mount
  useEffect(() => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Dispatch FEED_VIEWED to 16-stage funnel
      fetch("/api/analytics/funnel/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "FEED_VIEWED",
          userId,
          sessionId: sessionIdRef.current,
        }),
      }).catch(() => {});
    }
  }, [userId]);

  // Dispatch to 16-stage backend event funnel
  const dispatchFunnelEvent = useCallback(
    (stage: string, creatorId?: string, extra?: Record<string, any>) => {
      fetch("/api/analytics/funnel/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: stage,
          userId,
          sessionId: sessionIdRef.current,
          creatorProfileId: creatorId || currentCreatorId,
          ...extra,
        }),
      }).catch(() => {});
    },
    [userId, currentCreatorId]
  );

  // Flush queued events to backend API
  const flushEvents = useCallback(async (isImmediate = false) => {
    if (eventBufferRef.current.length === 0) return;

    const eventsToSend = [...eventBufferRef.current];
    eventBufferRef.current = [];

    const payload = JSON.stringify({
      sessionId: sessionIdRef.current,
      userId,
      events: eventsToSend,
    });

    try {
      if (isImmediate && typeof navigator !== "undefined" && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon("/api/feed/events", blob);
      } else {
        await fetch("/api/feed/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: isImmediate,
        });
      }
    } catch (err) {
      console.warn("[Telemetry Flush Failed]:", err);
      eventBufferRef.current = [...eventsToSend, ...eventBufferRef.current];
    }
  }, [userId]);

  // Push single event to buffer
  const recordEvent = useCallback(
    (
      eventType: TelemetryEventType,
      creatorId: string,
      customDwellMs?: number,
      metadata?: Record<string, any>,
      immediateFlush = false
    ) => {
      if (!creatorId) return;

      const event: TelemetryEvent = {
        sessionId: sessionIdRef.current,
        userId,
        creatorId,
        eventType,
        dwellTimeMs: customDwellMs ?? 0,
        category: activeCategoryRef.current || category,
        positionIndex: activeIndexRef.current ?? currentPositionIndex,
        metadata,
        timestamp: Date.now(),
      };

      eventBufferRef.current.push(event);

      if (immediateFlush) {
        flushEvents(false);
      }
    },
    [userId, category, currentPositionIndex, flushEvents]
  );

  // Periodic flush timer (every 3 seconds)
  useEffect(() => {
    flushTimerRef.current = setInterval(() => {
      if (eventBufferRef.current.length > 0) {
        flushEvents(false);
      }
    }, 3000);

    return () => {
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
      flushEvents(true);
    };
  }, [flushEvents]);

  // Page unload & visibility change listener
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (activeCreatorIdRef.current && startTimeRef.current > 0) {
          const dwell = Math.round(performance.now() - startTimeRef.current);
          recordEvent("WATCH_DURATION", activeCreatorIdRef.current, dwell, { reason: "tab_hidden" });
          dispatchFunnelEvent("LIVE_EXITED", activeCreatorIdRef.current, { durationSeconds: Math.round(dwell / 1000) });
        }
        flushEvents(true);
      }
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", () => flushEvents(true));

    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", () => flushEvents(true));
    };
  }, [recordEvent, flushEvents, dispatchFunnelEvent]);

  // Active creator transition lifecycle & milestone tracking
  useEffect(() => {
    // 1. Cleanup previous stream session if changing creators
    if (activeCreatorIdRef.current && activeCreatorIdRef.current !== currentCreatorId) {
      const prevCreatorId = activeCreatorIdRef.current;
      const dwellMs = Math.round(performance.now() - startTimeRef.current);

      if (timer3sRef.current) clearTimeout(timer3sRef.current);
      if (timer20sRef.current) clearTimeout(timer20sRef.current);
      if (timer30sRef.current) clearTimeout(timer30sRef.current);
      if (timer90sRef.current) clearTimeout(timer90sRef.current);

      if (dwellMs < 3000) {
        recordEvent("IMMEDIATE_BOUNCE", prevCreatorId, dwellMs, { quickExit: true }, true);
      }

      recordEvent("WATCH_DURATION", prevCreatorId, dwellMs, undefined, true);
      recordEvent("STREAM_LEAVE", prevCreatorId, dwellMs);
      dispatchFunnelEvent("LIVE_EXITED", prevCreatorId, { durationSeconds: Math.round(dwellMs / 1000) });
    }

    // 2. Start new session for current creator
    if (currentCreatorId) {
      activeCreatorIdRef.current = currentCreatorId;
      activeCategoryRef.current = category;
      activeIndexRef.current = currentPositionIndex;
      startTimeRef.current = performance.now();

      // Trigger Impression & Enter in 16-stage funnel
      recordEvent("IMPRESSION", currentCreatorId, 0, undefined, true);
      dispatchFunnelEvent("LIVE_IMPRESSION", currentCreatorId);
      dispatchFunnelEvent("LIVE_ENTERED", currentCreatorId);
      dispatchFunnelEvent("WATCH_STARTED", currentCreatorId);

      // Trigger 3s Milestone
      timer3sRef.current = setTimeout(() => {
        if (activeCreatorIdRef.current === currentCreatorId) {
          recordEvent("WATCH_3S", currentCreatorId, 3000, { passedBounceTest: true });
        }
      }, 3000);

      // Trigger 20s Milestone
      timer20sRef.current = setTimeout(() => {
        if (activeCreatorIdRef.current === currentCreatorId) {
          recordEvent("WATCH_20S", currentCreatorId, 20000, { highInterest: true });
        }
      }, 20000);

      // Trigger 30s Milestone (Stage 7 in 16-stage funnel)
      timer30sRef.current = setTimeout(() => {
        if (activeCreatorIdRef.current === currentCreatorId) {
          recordEvent("WATCH_30S", currentCreatorId, 30000, { milestone30s: true });
          dispatchFunnelEvent("WATCH_30_SECONDS", currentCreatorId, { durationSeconds: 30 });
        }
      }, 30000);

      // Trigger 90s Milestone
      timer90sRef.current = setTimeout(() => {
        if (activeCreatorIdRef.current === currentCreatorId) {
          recordEvent("WATCH_90S", currentCreatorId, 90000, { deepEngagement: true });
        }
      }, 90000);
    }

    return () => {
      if (timer3sRef.current) clearTimeout(timer3sRef.current);
      if (timer20sRef.current) clearTimeout(timer20sRef.current);
      if (timer30sRef.current) clearTimeout(timer30sRef.current);
      if (timer90sRef.current) clearTimeout(timer90sRef.current);
    };
  }, [currentCreatorId, currentPositionIndex, category, recordEvent, dispatchFunnelEvent]);

  // Dedicated action tracking helpers
  const trackFollow = useCallback(
    (creatorId: string, isNowFollowing: boolean) => {
      recordEvent(
        isNowFollowing ? "FOLLOW" : "UNFOLLOW",
        creatorId,
        Math.round(performance.now() - startTimeRef.current),
        undefined,
        true
      );
      if (isNowFollowing) {
        dispatchFunnelEvent("CREATOR_FOLLOWED", creatorId);
      }
    },
    [recordEvent, dispatchFunnelEvent]
  );

  const trackInteractionMenuOpen = useCallback(
    (creatorId: string) => {
      recordEvent(
        "INTERACTION_MENU_OPEN",
        creatorId,
        Math.round(performance.now() - startTimeRef.current),
        undefined,
        true
      );
      dispatchFunnelEvent("INTERACTION_MENU_OPENED", creatorId);
      dispatchFunnelEvent("INTERACTION_VIEWED", creatorId);
    },
    [recordEvent, dispatchFunnelEvent]
  );

  const trackStreamEnter = useCallback(
    (creatorId: string) => {
      recordEvent(
        "STREAM_ENTER",
        creatorId,
        Math.round(performance.now() - startTimeRef.current),
        { action: "deep_room_enter" },
        true
      );
      dispatchFunnelEvent("LIVE_ENTERED", creatorId);
    },
    [recordEvent, dispatchFunnelEvent]
  );

  const trackLike = useCallback(
    (creatorId: string) => {
      recordEvent("LIKE", creatorId, 0);
    },
    [recordEvent]
  );

  const trackTip = useCallback(
    (creatorId: string, amount: number) => {
      recordEvent("TIP", creatorId, 0, { amount }, true);
      dispatchFunnelEvent("PURCHASE_STARTED", creatorId, { amountCredits: amount });
    },
    [recordEvent, dispatchFunnelEvent]
  );

  const trackChatOpen = useCallback(
    (creatorId: string) => {
      recordEvent("CHAT_OPEN", creatorId, 0);
    },
    [recordEvent]
  );

  const trackMarketplaceOpen = useCallback(
    (creatorId: string) => {
      recordEvent("PPV_OPEN", creatorId, 0);
      dispatchFunnelEvent("INTERACTION_VIEWED", creatorId, { viewType: "PPV_VAULT" });
    },
    [recordEvent, dispatchFunnelEvent]
  );

  return {
    sessionId: sessionIdRef.current,
    recordEvent,
    trackFollow,
    trackInteractionMenuOpen,
    trackStreamEnter,
    trackLike,
    trackTip,
    trackChatOpen,
    trackMarketplaceOpen,
    flushEvents,
    dispatchFunnelEvent,
  };
}
