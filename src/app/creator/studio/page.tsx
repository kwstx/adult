"use client";

import React, { useState, useEffect } from "react";
import {
  Radio,
  Eye,
  Coins,
  Copy,
  Check,
  Play,
  Square,
  Sparkles,
  Shield,
  Settings,
  Flame,
  Users,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { useUser } from "@/lib/user-context";

interface LiveInteractionQueueItem {
  id: string;
  senderName: string;
  credits: number;
  actionTitle?: string;
  customMessage?: string;
  timestamp: string;
}

export default function CreatorStudioPage() {
  const { currentUser } = useUser();
  const [isLive, setIsLive] = useState(true);
  const [streamTitle, setStreamTitle] = useState("Late Night Neon Lounge & Dance Requests 💃✨");
  const [streamKey, setStreamKey] = useState("live_maya_sec_78b2a19");
  const [ingestUrl] = useState("rtmp://ingest.live.platform.local/app");
  const [hasCopiedKey, setHasCopiedKey] = useState(false);
  const [viewerCount, setViewerCount] = useState(248);
  const [sessionRevenue, setSessionRevenue] = useState(1450); // 1,450 tokens earned tonight
  const [interactionQueue, setInteractionQueue] = useState<LiveInteractionQueueItem[]>([
    {
      id: "iq_1",
      senderName: "Neon Rider ⚡",
      credits: 100,
      actionTitle: "Spin the Wheel 🎡",
      customMessage: "Let's see what fortune says!",
      timestamp: "2 mins ago",
    },
    {
      id: "iq_2",
      senderName: "Alex Patron 💎",
      credits: 250,
      actionTitle: "Neon Confetti Pop 🎊",
      customMessage: "Congrats on hitting the milestone!",
      timestamp: "Just now",
    },
  ]);

  // Connect to SSE for incoming tips in the creator studio
  useEffect(() => {
    const creatorProfileId = currentUser.username === "mayavelvet" ? "creator_maya" : currentUser.id;
    const eventSource = new EventSource(`/api/realtime/${creatorProfileId}/sse`);

    eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === "TIP_EVENT") {
          const payload = event.payload;
          setSessionRevenue((prev) => prev + (payload.credits || 0));
          setInteractionQueue((prev) => [
            {
              id: payload.tipId || `iq_${Date.now()}`,
              senderName: payload.senderName || "Fan",
              credits: payload.credits,
              actionTitle: payload.actionTitle,
              customMessage: payload.customMessage,
              timestamp: "Just now",
            },
            ...prev,
          ]);
        } else if (event.type === "PRESENCE_COUNT") {
          setViewerCount(event.payload.viewerCount);
        }
      } catch {
        // SSE parsing
      }
    };

    return () => {
      eventSource.close();
    };
  }, [currentUser]);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(streamKey);
    setHasCopiedKey(true);
    setTimeout(() => setHasCopiedKey(false), 2000);
  };

  const handleToggleBroadcast = () => {
    setIsLive(!isLive);
  };

  const handleCompleteInteraction = (id: string) => {
    setInteractionQueue((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Studio Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-pink-500/20 text-pink-400">
              <Radio className="h-4 w-4" />
            </span>
            <h1 className="text-2xl font-black text-white">Creator Operating System</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Studio dashboard for {currentUser.displayName} — Live broadcast orchestration & queue
          </p>
        </div>

        {/* Live Broadcast Status Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleBroadcast}
            className={`flex items-center gap-2 rounded-2xl px-6 py-3 text-xs font-extrabold shadow-xl transition-all ${
              isLive
                ? "bg-rose-600 text-white shadow-rose-600/30 hover:bg-rose-700"
                : "bg-emerald-600 text-white shadow-emerald-600/30 hover:bg-emerald-700"
            }`}
          >
            {isLive ? (
              <>
                <Square className="h-4 w-4" />
                End Live Stream
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Go Live Now
              </>
            )}
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-3xl bg-zinc-950 border border-zinc-800/80 p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Live Viewers</span>
            <Users className="h-4 w-4 text-pink-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">
            {isLive ? viewerCount.toLocaleString() : 0}
          </div>
          <span className="text-[11px] font-medium text-emerald-400 mt-1 inline-block">
            ● Stream Healthy (1080p60)
          </span>
        </div>

        <div className="rounded-3xl bg-zinc-950 border border-zinc-800/80 p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Tonight's Earnings</span>
            <Coins className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400">
              {sessionRevenue.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-zinc-400">Tokens</span>
          </div>
          <span className="text-[11px] font-medium text-zinc-400 mt-1 inline-block">
            ≈ ${(sessionRevenue * 0.08).toFixed(2)} USD Net Creator Payout
          </span>
        </div>

        <div className="rounded-3xl bg-zinc-950 border border-zinc-800/80 p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Queue Items</span>
            <Sparkles className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">
            {interactionQueue.length} Pending
          </div>
          <span className="text-[11px] font-medium text-purple-300 mt-1 inline-block">
            Real-time fan interaction requests
          </span>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Interaction Queue & Stream Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live Paid Interaction Queue */}
          <div className="rounded-3xl bg-zinc-950 border border-zinc-800/80 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                  <Flame className="h-4 w-4" />
                </span>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Live Interaction Queue
                </h3>
              </div>
              <span className="text-xs text-zinc-400 font-medium">
                Complete items as performed on camera
              </span>
            </div>

            {interactionQueue.length === 0 ? (
              <div className="py-10 text-center rounded-2xl bg-zinc-900/40 border border-zinc-800/60">
                <Sparkles className="mx-auto h-8 w-8 text-zinc-600 mb-2" />
                <p className="text-xs text-zinc-400 font-medium">No pending fan interactions</p>
              </div>
            ) : (
              <div className="space-y-3">
                {interactionQueue.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4 transition-all hover:border-pink-500/40 shadow-lg"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-pink-600 to-amber-500 text-white font-bold shrink-0">
                        <Coins className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-white">{item.senderName}</span>
                          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/30">
                            {item.credits} Tokens
                          </span>
                        </div>
                        <p className="text-xs font-bold text-pink-400 mt-0.5">{item.actionTitle}</p>
                        {item.customMessage && (
                          <p className="text-xs text-zinc-300 italic truncate mt-0.5">
                            &ldquo;{item.customMessage}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleCompleteInteraction(item.id)}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 px-3 py-1.5 text-xs font-bold hover:bg-emerald-600 hover:text-white transition-colors ml-4 shrink-0"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Done
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stream Configuration & Ingest Details */}
          <div className="rounded-3xl bg-zinc-950 border border-zinc-800/80 p-6 shadow-xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              OBS / Stream Ingest Configuration
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block mb-1">
                  RTMP Server URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={ingestUrl}
                    className="flex-1 rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs text-zinc-300 border border-zinc-800 font-mono select-all"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(ingestUrl)}
                    className="rounded-2xl bg-zinc-800 p-2.5 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block mb-1">
                  Stream Key (Keep secret)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    readOnly
                    value={streamKey}
                    className="flex-1 rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs text-zinc-300 border border-zinc-800 font-mono"
                  />
                  <button
                    onClick={handleCopyKey}
                    className="flex items-center gap-1.5 rounded-2xl bg-pink-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-pink-600/30 hover:bg-pink-500"
                  >
                    {hasCopiedKey ? (
                      <>
                        <Check className="h-4 w-4" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" /> Copy Key
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Quick Room Controls */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-3xl bg-zinc-950 border border-zinc-800/80 p-6 shadow-xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Room Controls
            </h3>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                <div>
                  <p className="font-bold text-zinc-200">Subscribers-Only Chat</p>
                  <p className="text-[10px] text-zinc-400">Only VIPs can send messages</p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-pink-600 focus:ring-pink-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                <div>
                  <p className="font-bold text-zinc-200">Slow Mode (10s)</p>
                  <p className="text-[10px] text-zinc-400">Limit chat speed</p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-pink-600 focus:ring-pink-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                <div>
                  <p className="font-bold text-zinc-200">Min Tip to Highlight</p>
                  <p className="text-[10px] text-zinc-400">Highlight tips over 100 tokens</p>
                </div>
                <span className="font-bold text-amber-400">100 🪙</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-gradient-to-tr from-pink-950/40 via-zinc-900 to-zinc-950 border border-pink-500/30 p-6 shadow-xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">
              Next Payout Settlement
            </h3>
            <p className="text-xs text-zinc-300">
              Your wallet balance has{" "}
              <span className="font-bold text-amber-400">{currentUser.walletBalance} tokens</span>{" "}
              ready for wire or USDT payout.
            </p>
            <button className="mt-4 w-full rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 py-3 text-xs font-bold text-white shadow-lg shadow-pink-600/30 hover:from-pink-500 hover:to-rose-500">
              Request Creator Payout Wire
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
