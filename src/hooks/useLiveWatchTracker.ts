"use client";

import { useEffect, useRef, useCallback } from "react";
import { PlaybackState } from "@/modules/xp/types";

interface UseLiveWatchTrackerOptions {
  fanId?: string;
  creatorProfileId: string;
  livestreamId: string;
  heartbeatIntervalMs?: number; // default 30,000ms (30 seconds)
  isPlaying?: boolean;
  onHeartbeatResponse?: (data: any) => void;
  onError?: (err: Error) => void;
}

/**
 * useLiveWatchTracker
 * 
 * Passive client-side watch telemetry transmitter.
 * Conforms strictly to the architectural invariant:
 * "The browser never decides: 'I just earned 5,000 XP'. It merely sends playback telemetry facts."
 */
export function useLiveWatchTracker({
  fanId,
  creatorProfileId,
  livestreamId,
  heartbeatIntervalMs = 30000,
  isPlaying = true,
  onHeartbeatResponse,
  onError,
}: UseLiveWatchTrackerOptions) {
  const sessionIdRef = useRef<string>("");
  const intervalTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastHeartbeatTimeRef = useRef<number>(Date.now());
  const isWindowFocusedRef = useRef<boolean>(true);

  // Initialize unique viewing session ID per live room visit
  useEffect(() => {
    sessionIdRef.current = `view_sess_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    lastHeartbeatTimeRef.current = Date.now();
  }, [creatorProfileId, livestreamId]);

  // Track document focus / visibility state
  useEffect(() => {
    const handleFocus = () => {
      isWindowFocusedRef.current = true;
    };
    const handleBlur = () => {
      isWindowFocusedRef.current = false;
    };
    const handleVisibilityChange = () => {
      isWindowFocusedRef.current = document.visibilityState === "visible";
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Transmit telemetry heartbeat to backend authority
  const sendHeartbeat = useCallback(async () => {
    if (!fanId || !creatorProfileId) return;

    const now = Date.now();
    const elapsedSeconds = Math.round((now - lastHeartbeatTimeRef.current) / 1000);
    lastHeartbeatTimeRef.current = now;

    // Determine current playback state
    const mediaPlaybackState: PlaybackState = isPlaying ? "PLAYING" : "PAUSED";

    try {
      const response = await fetch("/api/xp/viewing/heartbeat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fanId,
          creatorProfileId,
          livestreamId,
          viewingSessionId: sessionIdRef.current,
          intervalSeconds: Math.max(1, elapsedSeconds),
          isWindowFocused: isWindowFocusedRef.current,
          mediaPlaybackState,
          clientTimestamp: now,
        }),
      });

      if (!response.ok) {
        throw new Error(`Heartbeat failed with HTTP status ${response.status}`);
      }

      const data = await response.json();
      if (onHeartbeatResponse) {
        onHeartbeatResponse(data);
      }
    } catch (err: any) {
      if (onError) {
        onError(err);
      }
    }
  }, [fanId, creatorProfileId, livestreamId, isPlaying, onHeartbeatResponse, onError]);

  // Interval timer loop
  useEffect(() => {
    if (!fanId || !creatorProfileId || !isPlaying) {
      if (intervalTimerRef.current) {
        clearInterval(intervalTimerRef.current);
        intervalTimerRef.current = null;
      }
      return;
    }

    lastHeartbeatTimeRef.current = Date.now();

    intervalTimerRef.current = setInterval(() => {
      sendHeartbeat();
    }, heartbeatIntervalMs);

    return () => {
      if (intervalTimerRef.current) {
        clearInterval(intervalTimerRef.current);
        intervalTimerRef.current = null;
      }
    };
  }, [fanId, creatorProfileId, isPlaying, heartbeatIntervalMs, sendHeartbeat]);

  return {
    viewingSessionId: sessionIdRef.current,
    forceHeartbeat: sendHeartbeat,
  };
}
