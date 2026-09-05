"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type {
  FeedCandidate,
  MediaConnectionState,
  StreamingCostTier,
  SlidingWindowSlots,
} from "@/lib/feed/types";
import { useFeedTelemetry } from "@/hooks/useFeedTelemetry";

interface UseLiveFeedControllerProps {
  userId?: string;
  initialCreatorId?: string;
  categoryTag?: string;
  costTier?: StreamingCostTier;
  onCreatorChange?: (creator: FeedCandidate) => void;
}

export function useLiveFeedController({
  userId,
  initialCreatorId,
  categoryTag = "All",
  costTier = "BALANCED",
  onCreatorChange,
}: UseLiveFeedControllerProps) {
  // 1. Core Feed State (Backend-authoritative candidate stream)
  const [candidates, setCandidates] = useState<FeedCandidate[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  // 2. Audio & Playback Global States
  const [isMuted, setIsMuted] = useState<boolean>(true);

  // 3. Touch / Drag Gesture State for 60fps Spring Transitions
  const touchStartY = useRef<number | null>(null);
  const touchCurrentY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);
  const [dragOffsetY, setDragOffsetY] = useState<number>(0);
  const isTransitioning = useRef<boolean>(false);
  const isWheelLocked = useRef<boolean>(false);

  // 4. Media Connection Lifecycle Tracking Map
  const [mediaConnectionStates, setMediaConnectionStates] = useState<
    Record<string, MediaConnectionState>
  >({});

  // Sliding Window Derived Slots
  const currentItem: FeedCandidate | null = candidates[currentIndex] || null;
  const previousItem: FeedCandidate | null =
    currentIndex > 0 ? candidates[currentIndex - 1] : null;
  const nextItem: FeedCandidate | null =
    currentIndex < candidates.length - 1 ? candidates[currentIndex + 1] : null;

  const slidingWindow: SlidingWindowSlots = {
    previous: previousItem,
    current: currentItem,
    next: nextItem,
  };

  // 5. Telemetry Pipeline Integration
  const telemetry = useFeedTelemetry({
    userId,
    currentCreatorId: currentItem?.id,
    currentPositionIndex: currentIndex,
    category: currentItem?.stream.tags.join(","),
  });

  // ============================================================================
  // BACKEND INTEGRATION: Fetch Candidate Pool (Backend Authoritative Ordering)
  // ============================================================================
  const fetchFeedBatch = useCallback(
    async (tag = categoryTag, cursor?: string) => {
      if (!cursor) setIsLoading(true);
      else setIsLoadingMore(true);

      try {
        const tagParam = tag === "All" ? "" : `&tag=${encodeURIComponent(tag)}`;
        const cursorParam = cursor ? `&cursor=${encodeURIComponent(cursor)}` : "";
        const userParam = userId ? `&userId=${encodeURIComponent(userId)}` : "";
        const res = await fetch(`/api/feed?limit=15${userParam}${tagParam}${cursorParam}`);
        
        if (!res.ok) throw new Error(`Feed fetch failed: ${res.statusText}`);
        const data = await res.json();

        if (data.candidates && data.candidates.length > 0) {
          if (cursor) {
            setCandidates((prev) => {
              // Deduplicate newly appended candidates
              const existingIds = new Set(prev.map((c) => c.id));
              const newItems = data.candidates.filter((c: FeedCandidate) => !existingIds.has(c.id));
              return [...prev, ...newItems];
            });
          } else {
            setCandidates(data.candidates);
            
            // If an initialCreatorId was requested in the URL, jump to it if present
            if (initialCreatorId) {
              const targetIdx = data.candidates.findIndex(
                (c: FeedCandidate) => c.id === initialCreatorId || c.creator.username === initialCreatorId
              );
              if (targetIdx !== -1) {
                setCurrentIndex(targetIdx);
              } else {
                setCurrentIndex(0);
              }
            } else {
              setCurrentIndex(0);
            }
          }
          setNextCursor(data.nextCursor || null);
        } else if (!cursor) {
          setCandidates([]);
        }
      } catch (err) {
        console.error("[Feed Controller] Error fetching candidate batch:", err);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [categoryTag, userId, initialCreatorId]
  );

  // Initial feed boot
  useEffect(() => {
    fetchFeedBatch(categoryTag);
  }, [fetchFeedBatch, categoryTag]);

  // Continuous Prefetching: Backend delivers the next batch before reaching end
  useEffect(() => {
    const PREFETCH_THRESHOLD = 3;
    if (
      candidates.length > 0 &&
      currentIndex >= candidates.length - PREFETCH_THRESHOLD &&
      nextCursor &&
      !isLoadingMore
    ) {
      fetchFeedBatch(categoryTag, nextCursor);
    }
  }, [currentIndex, candidates.length, nextCursor, isLoadingMore, fetchFeedBatch, categoryTag]);

  // ============================================================================
  // MEDIA CONNECTION & RESOURCE LIFECYCLE MANAGEMENT (Cost-Aware Pipeline)
  // ============================================================================
  useEffect(() => {
    if (!currentItem) return;

    const newStates: Record<string, MediaConnectionState> = {};

    // 1. Current Item (Creator A): FULL ACTIVE STREAM
    newStates[currentItem.id] = "ACTIVE";

    // 2. Next Item (Creator B): PRE-WARMING (Metadata + Poster + Conditional Media Pipeline)
    if (nextItem) {
      newStates[nextItem.id] = "PREWARMING";

      // Eagerly pre-cache the next creator's high-res poster image
      if (nextItem.stream.posterUrl) {
        const img = new Image();
        img.src = nextItem.stream.posterUrl;
      }

      // Cost Constraints Handling:
      // Depending on streaming architecture (WebRTC vs Low-Latency HLS vs Cost Tier):
      if (costTier === "AGGRESSIVE") {
        // Prepare low-latency WebRTC SDP exchange or HLS playlist fetch
        // (Media pipeline connects in background ready for instant 0ms un-pause)
      } else if (costTier === "BALANCED") {
        // Pre-fetch initial media metadata / manifest header only, no continuous video chunk streaming
      } else {
        // CONSERVATIVE: Zero media bytes downloaded until active visual swipe
      }
    }

    // 3. Previous Item (Creator Z): SUSPENDED (Paused, video stream buffer released)
    if (previousItem) {
      newStates[previousItem.id] = "SUSPENDED";
    }

    // 4. Garbage Collect / Evict distant items from memory
    candidates.forEach((cand, idx) => {
      if (Math.abs(idx - currentIndex) > 1) {
        newStates[cand.id] = "DESTROYED";
      }
    });

    setMediaConnectionStates(newStates);

    if (onCreatorChange) {
      onCreatorChange(currentItem);
    }
  }, [currentIndex, candidates, currentItem, nextItem, previousItem, costTier, onCreatorChange]);

  // ============================================================================
  // CLIENT-SIDE URL SYNCHRONIZATION WITHOUT APP REBUILD
  // ============================================================================
  useEffect(() => {
    if (!currentItem) return;

    // Update browser address bar seamlessly without causing Next.js router re-mounts
    // or tearing down React component state
    const currentPath = window.location.pathname;
    const targetUrl = `/live/${currentItem.id}`;

    if (currentPath !== targetUrl && typeof window !== "undefined") {
      window.history.replaceState(
        { creatorId: currentItem.id, feedIndex: currentIndex },
        `Live | ${currentItem.creator.displayName}`,
        targetUrl
      );
    }
  }, [currentItem, currentIndex]);

  // Handle browser Back / Forward history traversal smoothly
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && typeof event.state.feedIndex === "number") {
        const targetIdx = event.state.feedIndex;
        if (targetIdx >= 0 && targetIdx < candidates.length) {
          setCurrentIndex(targetIdx);
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [candidates]);

  // ============================================================================
  // INSTANT VISUAL TRANSITIONS & GESTURE ENGINE
  // ============================================================================
  const goToNextStream = useCallback(() => {
    if (currentIndex < candidates.length - 1 && !isTransitioning.current) {
      isTransitioning.current = true;
      setCurrentIndex((prev) => prev + 1);
      setDragOffsetY(0);

      setTimeout(() => {
        isTransitioning.current = false;
      }, 300);
    }
  }, [currentIndex, candidates.length]);

  const goToPrevStream = useCallback(() => {
    if (currentIndex > 0 && !isTransitioning.current) {
      isTransitioning.current = true;
      setCurrentIndex((prev) => prev - 1);
      setDragOffsetY(0);

      setTimeout(() => {
        isTransitioning.current = false;
      }, 300);
    }
  }, [currentIndex]);

  // Touch handlers with fluid resistance
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchCurrentY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    touchCurrentY.current = e.touches[0].clientY;
    const deltaY = touchCurrentY.current - touchStartY.current;

    // Apply fluid resistance damping (0.45x)
    setDragOffsetY(deltaY * 0.45);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchStartY.current === null || touchCurrentY.current === null) {
      setDragOffsetY(0);
      return;
    }

    const deltaY = touchStartY.current - touchCurrentY.current;
    const duration = Date.now() - touchStartTime.current;
    const velocity = Math.abs(deltaY) / Math.max(duration, 1);

    const SWIPE_DISTANCE_THRESHOLD = 60; // pixels
    const VELOCITY_THRESHOLD = 0.5;      // px/ms for quick flick

    const isFlick = velocity > VELOCITY_THRESHOLD;
    const isDistanceSwipe = Math.abs(deltaY) > SWIPE_DISTANCE_THRESHOLD;

    if ((isFlick || isDistanceSwipe) && deltaY > 0) {
      // Swiped UP -> Go to Next Stream (Creator B)
      goToNextStream();
    } else if ((isFlick || isDistanceSwipe) && deltaY < 0) {
      // Swiped DOWN -> Go to Previous Stream (Creator Z)
      goToPrevStream();
    }

    setDragOffsetY(0);
    touchStartY.current = null;
    touchCurrentY.current = null;
  }, [goToNextStream, goToPrevStream]);

  // Mouse wheel handling with debounce lock
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (isWheelLocked.current) return;

      if (Math.abs(e.deltaY) > 35) {
        isWheelLocked.current = true;
        if (e.deltaY > 0) {
          goToNextStream();
        } else {
          goToPrevStream();
        }

        setTimeout(() => {
          isWheelLocked.current = false;
        }, 450);
      }
    },
    [goToNextStream, goToPrevStream]
  );

  return {
    // Feed Data & 3-Slot Sliding Window
    candidates,
    currentIndex,
    slidingWindow,
    currentCandidate: currentItem,
    nextCandidate: nextItem,
    previousCandidate: previousItem,
    isLoading,
    isLoadingMore,

    // Media & State Lifecycle
    mediaConnectionStates,
    isMuted,
    toggleMute: () => setIsMuted((prev) => !prev),

    // Gesture & Motion
    dragOffsetY,
    goToNextStream,
    goToPrevStream,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleWheel,

    // Telemetry & Actions
    telemetry,
    refreshFeed: () => fetchFeedBatch(categoryTag),
  };
}
