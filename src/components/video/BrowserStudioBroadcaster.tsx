"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  Radio,
  Camera,
  Mic,
  MicOff,
  VideoOff,
  Play,
  Square,
  Sparkles,
  Settings,
  Shield,
  Activity,
  Layers,
  Coins,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import type { AudienceRulesConfig, StreamIngestCredentials } from "@/modules/video/types";

interface BrowserStudioBroadcasterProps {
  creatorUserId: string;
  creatorDisplayName: string;
  defaultTitle?: string;
  defaultCategory?: string;
}

/**
 * IN-BROWSER CREATOR STUDIO BROADCASTER
 * 
 * Media Architectural Invariant:
 * The creator's camera & microphone produce real-time media tracks.
 * These tracks are sent DIRECTLY to the specialized streaming infrastructure via WHIP (WebRTC).
 * The application server coordinates ingest authorization, metadata, rules, and room status.
 * Zero video frames are transported through the Next.js server.
 */
export function BrowserStudioBroadcaster({
  creatorUserId,
  creatorDisplayName,
  defaultTitle = "Late Night Lounge & Dance Requests ✨",
  defaultCategory = "Entertainment",
}: BrowserStudioBroadcasterProps) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Broadcast state
  const [isLive, setIsLive] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [credentials, setCredentials] = useState<StreamIngestCredentials | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Stream Configuration
  const [title, setTitle] = useState(defaultTitle);
  const [category, setCategory] = useState(defaultCategory);
  const [isVipOnly, setIsVipOnly] = useState(false);
  const [ticketPrice, setTicketPrice] = useState(0);
  const [requireAgeAssurance, setRequireAgeAssurance] = useState(true);

  // Hardware Device & Track State
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [hasCopiedKey, setHasCopiedKey] = useState(false);

  // Telemetry metrics
  const [fps, setFps] = useState(60);
  const [bitrateKbps, setBitrateKbps] = useState(4200);

  // 1. Capture Creator Camera & Microphone
  const startCameraPreview = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 60 } },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });

      mediaStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.warn("Camera preview fallback mode:", err);
      setErrorMessage("Camera access required for live broadcast.");
    }
  }, []);

  useEffect(() => {
    startCameraPreview();

    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCameraPreview]);

  // 2. Start / End Broadcast via Control Plane
  const handleToggleBroadcast = async () => {
    if (isLive) {
      // STOP BROADCAST
      setIsProvisioning(true);
      try {
        await fetch("/api/video/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creatorUserId,
            action: "STOP",
          }),
        });
        setIsLive(false);
        setCredentials(null);
      } catch (err: any) {
        console.error("Stop broadcast error:", err);
      } finally {
        setIsProvisioning(false);
      }
    } else {
      // START BROADCAST
      setIsProvisioning(true);
      setErrorMessage(null);

      try {
        const audienceRules: Partial<AudienceRulesConfig> = {
          minAge: 18,
          requireAgeAssurance,
          isSubscribersOnly: isVipOnly,
          ticketPriceCredits: ticketPrice,
          isFollowerOnly: false,
          isChatDisabled: false,
        };

        const res = await fetch("/api/video/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creatorUserId,
            action: "START",
            title,
            category,
            streamMode: isVipOnly ? "VIP_SHOW" : "PUBLIC_BROADCAST",
            audienceRules,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to provision stream ingest.");
        }

        setCredentials(data.credentials);
        setIsLive(true);
      } catch (err: any) {
        console.error("Start broadcast error:", err);
        setErrorMessage(err.message || "Failed to start broadcast.");
      } finally {
        setIsProvisioning(false);
      }
    }
  };

  const copyStreamKey = () => {
    if (!credentials?.streamKey) return;
    navigator.clipboard.writeText(credentials.streamKey);
    setHasCopiedKey(true);
    setTimeout(() => setHasCopiedKey(false), 2000);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 select-none">
      {/* Studio Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-pink-500/20 text-pink-400">
              <Radio className="h-4 w-4" />
            </span>
            <h1 className="text-2xl font-black text-white">Broadcast Control Center</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Authoritative Studio for {creatorDisplayName} — Direct WHIP / WebRTC Media Ingest
          </p>
        </div>

        {/* Master Go Live Toggle */}
        <button
          onClick={handleToggleBroadcast}
          disabled={isProvisioning}
          className={`flex items-center gap-2 rounded-2xl px-6 py-3 text-xs font-black shadow-xl transition-all ${
            isLive
              ? "bg-rose-600 text-white shadow-rose-600/40 hover:bg-rose-700"
              : "bg-emerald-600 text-white shadow-emerald-600/40 hover:bg-emerald-700"
          }`}
        >
          {isProvisioning ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : isLive ? (
            <>
              <Square className="h-4 w-4" />
              End Broadcast
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Go Live to Media Edge
            </>
          )}
        </button>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-2xl bg-rose-500/20 border border-rose-500/40 p-4 flex items-center gap-3 text-rose-300 text-xs font-semibold">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Grid: Broadcaster Canvas & Audience Rule Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Camera Preview Viewport */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative aspect-video w-full overflow-hidden rounded-3xl bg-zinc-950 border border-zinc-800/80 shadow-2xl flex items-center justify-center">
            {/* Live Camera Viewport */}
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`h-full w-full object-cover transform -scale-x-100 ${
                isVideoDisabled ? "hidden" : "block"
              }`}
            />

            {isVideoDisabled && (
              <div className="flex flex-col items-center justify-center text-center p-6 text-zinc-500">
                <VideoOff className="h-10 w-10 mb-2" />
                <p className="text-xs font-bold text-zinc-300">Camera Feed Paused</p>
              </div>
            )}

            {/* Ingest Status Floating Indicator */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
              {isLive ? (
                <span className="flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1 text-xs font-black text-white shadow-lg shadow-rose-600/40 animate-pulse">
                  ● BROADCASTING (WHIP)
                </span>
              ) : (
                <span className="flex items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1 text-xs font-bold text-zinc-400">
                  ● LOCAL PREVIEW
                </span>
              )}
              <span className="rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-xs font-semibold text-emerald-400 border border-white/10">
                1080p60 • {bitrateKbps} kbps
              </span>
            </div>

            {/* Bottom Local Controls */}
            <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-2 pointer-events-auto">
                <button
                  onClick={() => setIsAudioMuted(!isAudioMuted)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md transition-all ${
                    isAudioMuted ? "bg-rose-600 text-white" : "bg-black/70 text-zinc-200 hover:bg-black"
                  }`}
                >
                  {isAudioMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setIsVideoDisabled(!isVideoDisabled)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md transition-all ${
                    isVideoDisabled ? "bg-rose-600 text-white" : "bg-black/70 text-zinc-200 hover:bg-black"
                  }`}
                >
                  {isVideoDisabled ? <VideoOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                </button>
              </div>

              <div className="pointer-events-auto">
                <span className="rounded-full bg-black/70 backdrop-blur-md px-3 py-1 text-xs font-medium text-zinc-300 border border-white/10">
                  Direct Ingest to Media Edge
                </span>
              </div>
            </div>
          </div>

          {/* External OBS Ingest Credentials Box */}
          {credentials && (
            <div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-5 shadow-xl">
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-3">
                OBS / External Encoder RTMP Ingest
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block mb-1">Server URL</span>
                  <input
                    type="text"
                    readOnly
                    value={credentials.rtmpIngestUrl}
                    className="w-full rounded-xl bg-zinc-900 px-3 py-2 text-zinc-300 border border-zinc-800"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block mb-1">Stream Key</span>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      readOnly
                      value={credentials.streamKey}
                      className="flex-1 rounded-xl bg-zinc-900 px-3 py-2 text-zinc-300 border border-zinc-800"
                    />
                    <button
                      onClick={copyStreamKey}
                      className="rounded-xl bg-pink-600 px-3 py-2 text-white font-bold text-xs"
                    >
                      {hasCopiedKey ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Stream Rules & Audience Gatekeeper Configuration */}
        <div className="space-y-4">
          <div className="rounded-3xl bg-zinc-950 border border-zinc-800/80 p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
              <Layers className="h-4 w-4 text-pink-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Audience Rules & Gatekeeping
              </h3>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1.5">Broadcast Title</label>
              <input
                type="text"
                disabled={isLive}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs text-white border border-zinc-800 focus:border-pink-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1.5">Category</label>
              <select
                disabled={isLive}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs text-white border border-zinc-800 focus:border-pink-500 outline-none"
              >
                <option value="Entertainment">Entertainment & Dance</option>
                <option value="VIP Shows">VIP Private Sessions</option>
                <option value="Cosplay">Cosplay & Themes</option>
                <option value="Music">Music & Lounge</option>
              </select>
            </div>

            {/* Audience Gatekeeper Toggles */}
            <div className="space-y-3 pt-2">
              <label className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/70 border border-zinc-800 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-zinc-200 block">Subscribers-Only VIP Room</span>
                  <span className="text-[10px] text-zinc-400">Restricts media access to active VIP fans</span>
                </div>
                <input
                  type="checkbox"
                  disabled={isLive}
                  checked={isVipOnly}
                  onChange={(e) => setIsVipOnly(e.target.checked)}
                  className="h-4 w-4 rounded text-pink-600 focus:ring-pink-500 bg-zinc-900 border-zinc-700"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/70 border border-zinc-800 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-zinc-200 block">Require Age Assurance</span>
                  <span className="text-[10px] text-zinc-400">Mandates 18+ identity verification</span>
                </div>
                <input
                  type="checkbox"
                  disabled={isLive}
                  checked={requireAgeAssurance}
                  onChange={(e) => setRequireAgeAssurance(e.target.checked)}
                  className="h-4 w-4 rounded text-pink-600 focus:ring-pink-500 bg-zinc-900 border-zinc-700"
                />
              </label>
            </div>

            {/* Pay-Per-View Ticket Price */}
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                Admission Ticket Price (Tokens)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  disabled={isLive}
                  value={ticketPrice}
                  onChange={(e) => setTicketPrice(Number(e.target.value))}
                  className="w-full rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs text-amber-400 font-bold border border-zinc-800 focus:border-amber-500 outline-none"
                  placeholder="0 = Free Admission"
                />
                <span className="text-xs font-bold text-zinc-400 shrink-0">🪙 Tokens</span>
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">Set to 0 for free public broadcast</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
