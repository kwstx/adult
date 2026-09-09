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
    <div className="space-y-6 animate-fade-in">
      {/* 1. Filter Category Tabs matching Image 2 ("Videos", "Collections", "Saved") */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-zinc-850">
        <div className="flex items-center gap-6 overflow-x-auto scrollbar-none">
          {[
            { id: "ALL", label: "Videos" },
            { id: "ALBUM", label: "Collections" },
            { id: "FREE_SUB", label: "Saved & Perks ✨" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id as any)}
              className={`relative py-2 text-xs sm:text-sm font-bold transition-colors ${
                filterType === tab.id ? "text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <span>{tab.label}</span>
              {filterType === tab.id && (
                <span className="absolute bottom-0 inset-x-0 h-0.5 rounded-full bg-gradient-to-r from-orange-500 to-rose-600 shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 font-medium">
            {filteredItems.length} media items
          </span>
        </div>
      </div>

      {/* 2. 2-Column Staggered Media Grid matching Image 2 */}
      {filteredItems.length === 0 ? (
        <div className="rounded-[28px] bg-zinc-950 border border-zinc-800 p-12 text-center text-zinc-400 text-xs">
          No media items found in this category.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
          {filteredItems.map((item, index) => (
            <div
              key={item.id}
              onClick={() => {
                if (item.isUnlocked) {
                  setSelectedMedia(item);
                } else {
                  onOpenCheckout({
                    checkoutType: "PPV_CONTENT",
                    title: item.title,
                    subtitle: `PPV Unlock (${item.contentType})`,
                    priceCredits: item.priceCredits,
                    badge: "PPV Media",
                    creatorProfileId: creator.id,
                    contentId: item.id,
                  });
                }
              }}
              className={`group relative rounded-2xl sm:rounded-[24px] overflow-hidden bg-zinc-900 border border-zinc-800/80 cursor-pointer shadow-lg hover:border-orange-500/50 hover:shadow-2xl hover:shadow-orange-950/30 transition-all ${
                index % 3 === 0 ? "aspect-[4/5]" : "aspect-square"
              }`}
            >
              {/* Media Image Thumbnail */}
              <img
                src={item.previewUrl}
                alt={item.title}
                className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                  !item.isUnlocked ? "brightness-90" : ""
                }`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

              {/* View Count Overlay Badge Pill (e.g. 👁 2.2K) on Bottom-Left */}
              <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-white shadow-md">
                <Eye className="h-3 w-3 text-zinc-300" />
                <span>
                  {item.viewCount >= 1000
                    ? `${(item.viewCount / 1000).toFixed(1)}K`
                    : item.viewCount || "2.2K"}
                </span>
              </div>

              {/* Lock / Unlocked Status Badge on Top-Right */}
              <div className="absolute top-2.5 right-2.5 z-10">
                {!item.isUnlocked && (
                  <span className="flex items-center gap-1 rounded-full bg-black/70 backdrop-blur-md border border-amber-500/40 px-2 py-0.5 text-[9px] font-bold text-amber-300">
                    <Lock className="h-2.5 w-2.5" />
                    <span>{item.priceCredits} Tokens</span>
                  </span>
                )}
              </div>

              {/* Center Play Button on Hover */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full frosted-play-btn text-white shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
                  <Play className="h-5 w-5 fill-white translate-x-0.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Media Viewer / Teaser Preview Modal */}
      {selectedMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="relative w-full max-w-2xl rounded-[32px] bg-zinc-950 border border-zinc-800 p-6 shadow-2xl overflow-hidden">
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
                      Full Access Granted
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    {selectedMedia.title}
                  </h3>
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
                    <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-amber-500/20 text-amber-400 border border-amber-500/40 mb-3 shadow-2xl">
                      <Lock className="h-7 w-7" />
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
                      className="flex items-center gap-2 rounded-full coral-pill-btn px-6 py-3 text-xs font-bold shadow-xl"
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
