"use client";

import React, { useState, useEffect } from "react";
import {
  Volume2,
  VolumeX,
  Maximize,
  Radio,
  Users,
  Lock,
  Sparkles,
  Settings,
  ShieldCheck,
} from "lucide-react";

interface VideoPlayerProps {
  creatorId: string;
  creatorName: string;
  isLive: boolean;
  viewerCount: number;
  isPrivateShow?: boolean;
  posterUrl?: string;
}

export function VideoPlayer({
  creatorId,
  creatorName,
  isLive,
  viewerCount,
  isPrivateShow = false,
  posterUrl,
}: VideoPlayerProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [latency, setLatency] = useState<number>(1.2);

  // Simulate ultra-low latency heartbeat
  useEffect(() => {
    const interval = setInterval(() => {
      setLatency(Number((1.0 + Math.random() * 0.5).toFixed(1)));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-3xl bg-zinc-950 border border-zinc-800/80 shadow-2xl group">
      {/* Live Video Canvas / Simulation Background */}
      {isLive ? (
        <div className="relative h-full w-full bg-zinc-900 flex items-center justify-center overflow-hidden">
          {/* High-res ambient video placeholder background */}
          <img
            src={
              posterUrl ||
              "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&auto=format&fit=crop&q=80"
            }
            alt={creatorName}
            className="h-full w-full object-cover opacity-80 filter contrast-105"
          />

          {/* Animated Neon Ambient Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-black/60 pointer-events-none" />

          {/* Locked State if Private Show */}
          {isPrivateShow && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl p-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-pink-500/20 text-pink-400 mb-4 ring-1 ring-pink-500/50">
                <Lock className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-white">Private Show in Progress</h3>
              <p className="text-sm text-zinc-400 max-w-md mt-1 mb-4">
                This broadcast is restricted to VIP Subscribers and Private Ticket holders.
              </p>
              <button className="rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 px-6 py-2.5 font-bold text-white shadow-lg shadow-pink-600/30">
                Unlock Private Stream Access
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-900 text-center p-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-800 text-zinc-500 mb-3">
            <Radio className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-white">{creatorName} is Offline</h3>
          <p className="text-sm text-zinc-400 mt-1">
            Check the schedule or subscribe to get notified when they go live.
          </p>
        </div>
      )}

      {/* Top Floating Badges */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          {isLive && (
            <span className="flex items-center gap-1.5 rounded-full bg-rose-600/90 backdrop-blur-md px-3 py-1 text-xs font-bold text-white shadow-lg shadow-rose-600/40">
              <span className="h-2 w-2 rounded-full bg-white animate-ping" />
              LIVE
            </span>
          )}
          <span className="flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-xs font-semibold text-zinc-200 border border-white/10">
            <Users className="h-3.5 w-3.5 text-pink-400" />
            {viewerCount.toLocaleString()} Viewers
          </span>
          <span className="hidden sm:flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
            {latency}s Latency
          </span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <span className="flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-xs font-medium text-zinc-300 border border-white/10">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            2257 Verified
          </span>
        </div>
      </div>

      {/* Bottom Floating Control Bar on Hover */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-black/80 transition-colors"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <span className="text-xs font-medium text-zinc-300">{creatorName}</span>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-black/80 transition-colors">
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-black/80 transition-colors"
          >
            <Maximize className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
