"use client";

import React, { useState } from "react";
import {
  Lock,
  Unlock,
  Play,
  Image as ImageIcon,
  Headphones,
  Sparkles,
  Coins,
  Eye,
  Heart,
  X,
  CheckCircle2,
  Film,
  Layers,
} from "lucide-react";
import { ContentPillarData, ContentMediaItem, CreatorIdentity, CheckoutItemPayload } from "../types";

interface ContentPillarProps {
  creator: CreatorIdentity;
  content: ContentPillarData;
  isSubscribed?: boolean;
  onOpenCheckout: (item: CheckoutItemPayload) => void;
}

export function ContentPillar({
  creator,
  content,
  isSubscribed = false,
  onOpenCheckout,
}: ContentPillarProps) {
  const [filterType, setFilterType] = useState<"ALL" | "VIDEO" | "ALBUM" | "AUDIO" | "FREE_SUB">("ALL");
  const [selectedMedia, setSelectedMedia] = useState<ContentMediaItem | null>(null);

  const filteredItems = content.items.filter((item) => {
    if (filterType === "ALL") return true;
    if (filterType === "FREE_SUB") return item.accessLevel === "SUBSCRIBERS_ONLY" || item.priceCredits === 0;
    return item.contentType === filterType;
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1. Filter Category Pills */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <Film className="h-5 w-5 text-pink-500" />
            4K Media Vault & Exclusive Content
          </h3>
          <p className="text-xs text-zinc-400">
            High-definition digital media, uncensored photo sets, uncut studio master recordings, and subscriber-exclusive drops.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 p-1 rounded-2xl overflow-x-auto no-scrollbar">
          {[
            { id: "ALL", label: "All Media" },
            { id: "VIDEO", label: "Videos" },
            { id: "ALBUM", label: "Photo Sets" },
            { id: "AUDIO", label: "Audio" },
            { id: "FREE_SUB", label: "Sub Perks ✨" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id as any)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                filterType === tab.id
                  ? "bg-pink-600 text-white shadow-md shadow-pink-600/30"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Media Grid */}
      {filteredItems.length === 0 ? (
        <div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-12 text-center text-zinc-400 text-xs">
          No media items found in this category.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="group relative flex flex-col justify-between rounded-3xl bg-zinc-950 border border-zinc-800/80 overflow-hidden hover:border-pink-500/50 hover:shadow-2xl hover:shadow-pink-500/10 transition-all"
            >
              {/* Thumbnail Container */}
              <div
                onClick={() => setSelectedMedia(item)}
                className="relative aspect-video w-full overflow-hidden bg-zinc-900 cursor-pointer"
              >
                <img
                  src={item.previewUrl}
                  alt={item.title}
                  className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                    !item.isUnlocked ? "brightness-75" : ""
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />

                {/* Top Badges */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="flex items-center gap-1 rounded-full bg-black/70 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-black uppercase text-zinc-200 border border-white/10">
                    {item.contentType === "VIDEO" ? (
                      <Play className="h-3 w-3 text-pink-400 fill-pink-400" />
                    ) : item.contentType === "ALBUM" ? (
                      <ImageIcon className="h-3 w-3 text-amber-400" />
                    ) : (
                      <Headphones className="h-3 w-3 text-purple-400" />
                    )}
                    <span>{item.contentType}</span>
                  </span>

                  {item.accessLevel === "SUBSCRIBERS_ONLY" && (
                    <span className="rounded-full bg-purple-600/90 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-black text-white shadow-md">
                      Subscribers Free
                    </span>
                  )}
                </div>

                {/* Lock Status Center Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {item.isUnlocked ? (
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/90 text-white shadow-xl backdrop-blur-md group-hover:scale-110 transition-transform">
                      <Play className="h-6 w-6 fill-white ml-0.5" />
                    </div>
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/80 text-amber-400 shadow-xl border border-amber-500/40 backdrop-blur-md group-hover:scale-110 transition-transform">
                      <Lock className="h-5 w-5" />
                    </div>
                  )}
                </div>

                {/* Bottom Media Metadata Pill */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] text-zinc-300">
                  <span className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg">
                    <Eye className="h-3 w-3 text-zinc-400" />
                    {item.viewCount}
                  </span>
                  <span className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg text-rose-300">
                    <Heart className="h-3 w-3 fill-rose-400" />
                    {item.likeCount}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-pink-300 transition-colors line-clamp-1">
                    {item.title}
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-900 flex items-center justify-between">
                  <div>
                    {item.isUnlocked ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        Unlocked & Ready
                      </span>
                    ) : item.priceCredits === 0 ? (
                      <span className="text-xs font-bold text-purple-400">
                        Subscribers Free
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-black text-amber-400">
                        <Coins className="h-3.5 w-3.5" />
                        {item.priceCredits} Tokens
                      </span>
                    )}
                  </div>

                  {item.isUnlocked ? (
                    <button
                      onClick={() => setSelectedMedia(item)}
                      className="rounded-xl bg-zinc-900 hover:bg-zinc-850 px-3.5 py-1.5 text-xs font-bold text-white border border-zinc-800 transition-colors"
                    >
                      Watch Now →
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        onOpenCheckout({
                          checkoutType: "PPV_CONTENT",
                          title: item.title,
                          subtitle: `PPV Unlock (${item.contentType})`,
                          priceCredits: item.priceCredits,
                          badge: "PPV Media",
                          creatorProfileId: creator.id,
                          contentId: item.id,
                        })
                      }
                      className="rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 px-3.5 py-1.5 text-xs font-black text-white shadow-md shadow-pink-600/30 hover:brightness-110 active:scale-95 transition-all"
                    >
                      Unlock Media
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Media Viewer / Teaser Preview Modal */}
      {selectedMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="relative w-full max-w-3xl rounded-3xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl overflow-hidden">
            {/* Close */}
            <button
              onClick={() => setSelectedMedia(null)}
              className="absolute top-4 right-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-zinc-300 hover:text-white hover:bg-black transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {selectedMedia.isUnlocked ? (
              /* Unlocked In-Browser Player */
              <div className="space-y-4">
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black">
                  {selectedMedia.contentType === "VIDEO" ? (
                    <video
                      src={selectedMedia.mediaUrl}
                      controls
                      autoPlay
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <img
                      src={selectedMedia.mediaUrl}
                      alt={selectedMedia.title}
                      className="h-full w-full object-contain"
                    />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Full Uncensored Access Granted
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white">{selectedMedia.title}</h3>
                  <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                    {selectedMedia.description}
                  </p>
                </div>
              </div>
            ) : (
              /* Locked Teaser Preview */
              <div className="space-y-5">
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-zinc-900">
                  <img
                    src={selectedMedia.previewUrl}
                    alt={selectedMedia.title}
                    className="h-full w-full object-cover blur-sm brightness-50"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-black/50">
                    <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-500/20 text-amber-400 border border-amber-500/40 mb-3 shadow-2xl">
                      <Lock className="h-8 w-8" />
                    </div>
                    <h4 className="text-base font-black text-white">{selectedMedia.title}</h4>
                    <p className="text-xs text-zinc-300 max-w-md mt-1 mb-4">
                      {selectedMedia.description}
                    </p>
                    <button
                      onClick={() => {
                        const m = selectedMedia;
                        setSelectedMedia(null);
                        onOpenCheckout({
                          checkoutType: "PPV_CONTENT",
                          title: m.title,
                          subtitle: `PPV Unlock (${m.contentType})`,
                          priceCredits: m.priceCredits,
                          badge: "PPV Media",
                          creatorProfileId: creator.id,
                          contentId: m.id,
                        });
                      }}
                      className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-xl shadow-pink-600/30 hover:brightness-110 active:scale-95 transition-all"
                    >
                      <Coins className="h-4 w-4" />
                      <span>Unlock with {selectedMedia.priceCredits} Tokens</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
