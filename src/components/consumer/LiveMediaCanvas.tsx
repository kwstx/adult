"use client";

import React, { useRef, useEffect, useState } from "react";
import { Lock, Radio, Sparkles, Volume2, VolumeX } from "lucide-react";
import type { MediaConnectionState, StreamingCostTier } from "@/lib/feed/types";

interface LiveMediaCanvasProps {
  streamUrl?: string;
  posterUrl?: string | null;
  creatorName: string;
  isLive: boolean;
  isPrivateShow?: boolean;
  mediaState: MediaConnectionState; // "ACTIVE" | "PREWARMING" | "SUSPENDED" | "DESTROYED"
  costTier?: StreamingCostTier;
  isMuted?: boolean;
  onDoubleTapLike?: () => void;
  onToggleMute?: () => void;
}

export function LiveMediaCanvas({
  streamUrl,
  posterUrl,
  creatorName,
  isLive,
  isPrivateShow = false,
  mediaState,
  costTier = "BALANCED",
  isMuted = true,
  onDoubleTapLike,
  onToggleMute,
}: LiveMediaCanvasProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastTapRef = useRef<number>(0);
  const [showHeartBurst, setShowHeartBurst] = useState<{ x: number; y: number } | null>(null);
  const [isPosterLoaded, setIsPosterLoaded] = useState(false);
  const [hasVideoFrame, setHasVideoFrame] = useState(false);

  // 1. Eager Poster Preload
  useEffect(() => {
    if (posterUrl && (mediaState === "ACTIVE" || mediaState === "PREWARMING")) {
      const img = new Image();
      img.src = posterUrl;
      img.onload = () => setIsPosterLoaded(true);
    }
  }, [posterUrl, mediaState]);

  // 2. Video Pipeline Lifecycle (Active Play, Cost-Aware Prewarm, Suspended Pause)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (mediaState === "ACTIVE") {
      video.muted = isMuted;
      video.play().catch(() => {
        // Autoplay policy fallback: mute and retry
        video.muted = true;
        video.play().catch(() => {});
      });
    } else if (mediaState === "PREWARMING") {
      // Prewarm media connection based on streaming architecture & cost tier
      if (costTier === "AGGRESSIVE" || costTier === "BALANCED") {
        video.muted = true;
        video.preload = costTier === "AGGRESSIVE" ? "auto" : "metadata";
        // Pre-fetch first frame silently then pause
        video.load();
      } else {
        // CONSERVATIVE: Do not load media stream until active
        video.preload = "none";
      }
    } else if (mediaState === "SUSPENDED") {
      // Suspend video decoder and network stream to preserve device memory & bandwidth
      video.pause();
    }
  }, [mediaState, isMuted, costTier]);

  // Handle double-tap likes
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setShowHeartBurst({ x, y });
      if (onDoubleTapLike) onDoubleTapLike();

      setTimeout(() => setShowHeartBurst(null), 800);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  const isActive = mediaState === "ACTIVE";

  return (
    <div
      onPointerDown={handlePointerDown}
      className="relative h-full w-full select-none overflow-hidden bg-zinc-950 flex items-center justify-center cursor-pointer"
    >
      {isLive ? (
        <>
          {/* Simulated / Real HTML5 / HLS / WebRTC Video Stream */}
          {streamUrl && (mediaState === "ACTIVE" || mediaState === "PREWARMING") && (
            <video
              ref={videoRef}
              src={streamUrl}
              poster={posterUrl || undefined}
              playsInline
              loop
              muted={isMuted}
              onLoadedData={() => setHasVideoFrame(true)}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
                hasVideoFrame ? "opacity-100" : "opacity-0"
              }`}
            />
          )}

          {/* High-Resolution Stream Poster Background */}
          <img
            src={
              posterUrl ||
              "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&auto=format&fit=crop&q=80"
            }
            alt={creatorName}
            className={`h-full w-full object-cover object-center filter contrast-[1.03] brightness-95 transform transition-all duration-700 ${
              isActive ? "scale-100 opacity-100" : "scale-105 opacity-90"
            }`}
            loading={mediaState === "PREWARMING" ? "eager" : "lazy"}
          />

          {/* Ambient Lighting Gradients */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/90 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/40 pointer-events-none" />

          {/* Glowing Ambient Halo when Active */}
          {isActive && (
            <>
              <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-pink-600/15 blur-3xl pointer-events-none animate-pulse" />
              <div className="absolute bottom-1/3 right-1/4 h-72 w-72 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />
            </>
          )}

          {/* Locked Overlay for Private Broadcasts */}
          {isPrivateShow && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-2xl p-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-pink-500/20 text-pink-400 mb-4 ring-1 ring-pink-500/50 shadow-2xl shadow-pink-500/30 animate-bounce">
                <Lock className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-black text-white">Private Show in Progress</h3>
              <p className="text-xs text-zinc-300 max-w-xs mt-2 mb-5 leading-relaxed">
                This room is restricted to VIP Subscribers or Private Ticket Holders.
              </p>
              <button className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-amber-500 px-6 py-3 font-bold text-white shadow-xl shadow-pink-600/40 hover:scale-105 active:scale-95 transition-all">
                <Sparkles className="h-4 w-4" />
                <span>Unlock Access (1,000 Tokens)</span>
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-900/90 text-center p-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-800 text-zinc-500 mb-3 ring-1 ring-zinc-700">
            <Radio className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-white">{creatorName} is Offline</h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-xs">
            Swipe up to discover another live stream or view their PPV Media Vault.
          </p>
        </div>
      )}

      {/* Double Tap Heart Pop */}
      {showHeartBurst && (
        <div
          className="pointer-events-none absolute z-50 -translate-x-1/2 -translate-y-1/2 animate-double-tap-pop text-6xl text-pink-500 drop-shadow-[0_0_20px_rgba(236,72,153,0.8)]"
          style={{ left: `${showHeartBurst.x}px`, top: `${showHeartBurst.y}px` }}
        >
          ❤️
        </div>
      )}
    </div>
  );
}
