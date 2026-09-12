"use client";

import React, { useState } from "react";
import { Users, LayoutGrid, Columns2, PictureInPicture2, Mic, MicOff, Crown, Sparkles } from "lucide-react";

export type StageLayoutMode = "SIDE_BY_SIDE" | "PICTURE_IN_PICTURE" | "GRID" | "ACTIVE_SPEAKER";

export interface CoStreamParticipantUI {
  creatorProfileId: string;
  displayName: string;
  stageName?: string;
  avatarUrl?: string | null;
  role: "PRIMARY_HOST" | "CO_HOST" | "GUEST_CREATOR";
  splitPercentage: number;
  isMediaPublished?: boolean;
  isMuted?: boolean;
  streamUrl?: string;
}

interface CoStreamStageProps {
  sessionId: string;
  title: string;
  participants: CoStreamParticipantUI[];
  initialLayout?: StageLayoutMode;
  isHost?: boolean;
  onLayoutChange?: (layout: StageLayoutMode) => void;
}

export function CoStreamStage({
  sessionId,
  title,
  participants,
  initialLayout = "SIDE_BY_SIDE",
  isHost = false,
  onLayoutChange,
}: CoStreamStageProps) {
  const [layout, setLayout] = useState<StageLayoutMode>(initialLayout);
  const [activeSpeakerIndex, setActiveSpeakerIndex] = useState(0);

  const handleLayoutSwitch = (newLayout: StageLayoutMode) => {
    setLayout(newLayout);
    if (onLayoutChange) {
      onLayoutChange(newLayout);
    }
  };

  const primaryHost = participants.find((p) => p.role === "PRIMARY_HOST") || participants[0];
  const guests = participants.filter((p) => p.creatorProfileId !== primaryHost?.creatorProfileId);

  return (
    <div className="relative w-full h-full min-h-[480px] bg-neutral-950 rounded-2xl overflow-hidden border border-neutral-800 flex flex-col">
      {/* Top Overlay Bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-auto">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-rose-600/90 text-white text-xs font-bold uppercase tracking-wider animate-pulse shadow-lg shadow-rose-950/50">
            <span className="w-2 h-2 rounded-full bg-white" />
            <span>CO-LIVE</span>
          </span>
          <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-neutral-900/80 border border-neutral-700 text-neutral-200 text-xs font-medium backdrop-blur-md">
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span>{participants.length} Creators</span>
          </div>
          <span className="text-white text-sm font-semibold truncate max-w-[200px] sm:max-w-xs drop-shadow">
            {title}
          </span>
        </div>

        {/* Host Layout Controls */}
        {isHost && (
          <div className="flex items-center bg-neutral-900/90 border border-neutral-700 rounded-lg p-1 space-x-1 backdrop-blur-md shadow-xl">
            <button
              onClick={() => handleLayoutSwitch("SIDE_BY_SIDE")}
              title="Side by Side (50/50)"
              className={`p-1.5 rounded transition-all ${
                layout === "SIDE_BY_SIDE"
                  ? "bg-purple-600 text-white shadow"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Columns2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleLayoutSwitch("PICTURE_IN_PICTURE")}
              title="Picture in Picture"
              className={`p-1.5 rounded transition-all ${
                layout === "PICTURE_IN_PICTURE"
                  ? "bg-purple-600 text-white shadow"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <PictureInPicture2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleLayoutSwitch("GRID")}
              title="2x2 Grid"
              className={`p-1.5 rounded transition-all ${
                layout === "GRID"
                  ? "bg-purple-600 text-white shadow"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Video Compositing Stage */}
      <div className="flex-1 w-full h-full relative">
        {/* LAYOUT 1: SIDE BY SIDE (50/50) */}
        {layout === "SIDE_BY_SIDE" && (
          <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-1.5 p-1.5 bg-neutral-900">
            {participants.map((p, idx) => (
              <div
                key={p.creatorProfileId}
                className="relative w-full h-full rounded-xl overflow-hidden bg-neutral-900 flex items-center justify-center border border-neutral-800 shadow-inner group"
              >
                {/* Mock Live Stream Video Placeholder / Texture */}
                <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 via-neutral-900 to-black opacity-90 flex items-center justify-center">
                  {p.avatarUrl ? (
                    <img
                      src={p.avatarUrl}
                      alt={p.displayName}
                      className="w-24 h-24 rounded-full border-2 border-purple-500/40 shadow-2xl object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-neutral-800 border-2 border-purple-500/40 flex items-center justify-center text-white text-2xl font-bold">
                      {p.displayName.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Participant Overlay Pill */}
                <div className="absolute bottom-3 left-3 z-20 flex items-center space-x-2 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-full border border-neutral-700/80 shadow-lg">
                  {p.role === "PRIMARY_HOST" ? (
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                  <span className="text-white text-xs font-semibold">{p.displayName}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {(p.splitPercentage * 100).toFixed(0)}% Split
                  </span>
                  <div className="flex items-center pl-1">
                    {p.isMuted ? (
                      <MicOff className="w-3 h-3 text-rose-400" />
                    ) : (
                      <Mic className="w-3 h-3 text-emerald-400 animate-pulse" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* LAYOUT 2: PICTURE IN PICTURE */}
        {layout === "PICTURE_IN_PICTURE" && (
          <div className="w-full h-full relative bg-neutral-900">
            {/* Main Stage (Primary Host) */}
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-800 via-neutral-900 to-black">
              {primaryHost?.avatarUrl ? (
                <img
                  src={primaryHost.avatarUrl}
                  alt={primaryHost.displayName}
                  className="w-32 h-32 rounded-full border-4 border-purple-500/40 shadow-2xl object-cover"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-neutral-800 border-4 border-purple-500/40 flex items-center justify-center text-white text-3xl font-bold">
                  {primaryHost?.displayName.substring(0, 2).toUpperCase()}
                </div>
              )}
              {/* Host Tag */}
              <div className="absolute bottom-4 left-4 z-20 flex items-center space-x-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-neutral-700">
                <Crown className="w-4 h-4 text-amber-400" />
                <span className="text-white text-sm font-semibold">{primaryHost?.displayName}</span>
                <span className="text-xs font-bold text-purple-300">
                  {((primaryHost?.splitPercentage ?? 0.5) * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Floating Co-Host Inset (PiP) */}
            {guests.map((g) => (
              <div
                key={g.creatorProfileId}
                className="absolute bottom-4 right-4 z-20 w-36 h-48 sm:w-44 sm:h-60 rounded-xl overflow-hidden bg-neutral-950 border-2 border-purple-500 shadow-2xl flex flex-col justify-between p-2"
              >
                <div className="flex-1 flex items-center justify-center">
                  {g.avatarUrl ? (
                    <img
                      src={g.avatarUrl}
                      alt={g.displayName}
                      className="w-14 h-14 rounded-full border border-cyan-400 object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-neutral-800 flex items-center justify-center text-white font-bold">
                      {g.displayName.substring(0, 2)}
                    </div>
                  )}
                </div>
                <div className="bg-black/80 backdrop-blur rounded px-2 py-1 flex items-center justify-between text-[11px] text-white">
                  <span className="truncate font-medium">{g.displayName}</span>
                  <span className="text-cyan-400 font-bold ml-1">
                    {(g.splitPercentage * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* LAYOUT 3: 2x2 GRID */}
        {layout === "GRID" && (
          <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-1.5 p-1.5 bg-neutral-900">
            {participants.map((p) => (
              <div
                key={p.creatorProfileId}
                className="relative w-full h-full rounded-xl overflow-hidden bg-neutral-950 flex items-center justify-center border border-neutral-800"
              >
                {p.avatarUrl ? (
                  <img
                    src={p.avatarUrl}
                    alt={p.displayName}
                    className="w-16 h-16 rounded-full border border-purple-400 object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center text-white font-bold">
                    {p.displayName.substring(0, 2)}
                  </div>
                )}
                <div className="absolute bottom-2 left-2 flex items-center space-x-1.5 bg-black/80 px-2.5 py-1 rounded-full text-[11px] text-white border border-neutral-700">
                  <span className="truncate font-semibold">{p.displayName}</span>
                  <span className="text-purple-300 font-bold">
                    {(p.splitPercentage * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
