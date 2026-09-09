"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Radio, Play, X, Heart, MessageCircle, Send, Volume2, VolumeX, Sparkles } from "lucide-react";
import { useUser } from "@/lib/user-context";

export interface StoryItem {
  id: string;
  creatorId: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  isLive?: boolean;
  viewerCount?: number;
  hasUnseenStory?: boolean;
  storyMediaUrl?: string;
  streamTitle?: string;
}

const DEFAULT_STORIES: StoryItem[] = [
  {
    id: "story-1",
    creatorId: "mayavelvet",
    displayName: "Maya Velvet",
    username: "mayavelvet",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
    isLive: true,
    viewerCount: 1420,
    hasUnseenStory: true,
    storyMediaUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80",
    streamTitle: "VIP Evening Live & Chill Lounge ✨",
  },
  {
    id: "story-2",
    creatorId: "rachelflow",
    displayName: "Rachel Flowear",
    username: "rachelflow",
    avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80",
    isLive: true,
    viewerCount: 980,
    hasUnseenStory: true,
    storyMediaUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80",
    streamTitle: "Acoustic Sunset Broadcast 🎸",
  },
  {
    id: "story-3",
    creatorId: "brians",
    displayName: "Brian S",
    username: "brians",
    avatarUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&auto=format&fit=crop&q=80",
    isLive: true,
    viewerCount: 520,
    hasUnseenStory: true,
    storyMediaUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800&auto=format&fit=crop&q=80",
    streamTitle: "Late Night Gaming & Chill 🎮",
  },
  {
    id: "story-4",
    creatorId: "jennie",
    displayName: "Jennie V",
    username: "jennie_v",
    avatarUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&auto=format&fit=crop&q=80",
    isLive: false,
    viewerCount: 0,
    hasUnseenStory: true,
    storyMediaUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&auto=format&fit=crop&q=80",
    streamTitle: "Studio BTS snapshots 📸",
  },
  {
    id: "story-5",
    creatorId: "matthew",
    displayName: "Matthew K",
    username: "matthew_k",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80",
    isLive: true,
    viewerCount: 310,
    hasUnseenStory: true,
    storyMediaUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80",
    streamTitle: "Electronic Synth Jam Session 🎹",
  },
  {
    id: "story-6",
    creatorId: "janeclark",
    displayName: "Jane Clark",
    username: "jane_clark",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80",
    isLive: true,
    viewerCount: 650,
    hasUnseenStory: true,
    storyMediaUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&auto=format&fit=crop&q=80",
    streamTitle: "Creative Design & Interaction Workshop 🎨",
  },
];

interface StoriesReelProps {
  onAddStoryClick?: () => void;
  customStories?: StoryItem[];
}

export function StoriesReel({ onAddStoryClick, customStories }: StoriesReelProps) {
  const { currentUser } = useUser();
  const [stories, setStories] = useState<StoryItem[]>(customStories || DEFAULT_STORIES);
  const [selectedStory, setSelectedStory] = useState<StoryItem | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showAddStoryModal, setShowAddStoryModal] = useState(false);

  useEffect(() => {
    if (customStories && customStories.length > 0) {
      setStories(customStories);
      return;
    }

    // Load active creators from API to populate stories reel if available
    fetch("/api/creators")
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data?.creators && Array.isArray(data.creators) && data.creators.length > 0) {
          const mapped: StoryItem[] = data.creators.map((c: any) => ({
            id: c.id,
            creatorId: c.id,
            displayName: c.user?.displayName || c.displayName || "Creator",
            username: c.user?.username || c.username || "creator",
            avatarUrl:
              c.user?.avatarUrl ||
              c.avatarUrl ||
              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
            isLive: true,
            viewerCount: c.viewerCount || 120,
            hasUnseenStory: true,
            storyMediaUrl:
              c.user?.avatarUrl ||
              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80",
            streamTitle: c.streamTitle || "Live Interactive Experience",
          }));
          setStories(mapped);
        }
      })
      .catch((err) => {
        console.warn("Using fallback stories:", err);
      });
  }, [customStories]);

  const handleStoryClick = (story: StoryItem) => {
    setSelectedStory(story);
    setLiked(false);
    setCommentText("");
  };

  return (
    <>
      <div className="w-full overflow-x-auto scrollbar-none py-2 px-1">
        <div className="flex items-center gap-4 sm:gap-5 min-w-max">
          {/* 1. "Your Story" / "Add Story" Bubble */}
          <div className="flex flex-col items-center gap-1.5 group cursor-pointer">
            <button
              onClick={() => {
                if (onAddStoryClick) onAddStoryClick();
                else setShowAddStoryModal(true);
              }}
              className="relative flex items-center justify-center h-16 w-16 sm:h-18 sm:w-18 rounded-full border-2 border-dashed border-zinc-700/80 group-hover:border-pink-500/80 bg-zinc-900/60 p-1 transition-all group-hover:scale-105"
              title="Add your story or broadcast"
            >
              <div className="relative h-full w-full rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center">
                {currentUser?.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.displayName || "You"}
                    className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                ) : (
                  <Plus className="h-6 w-6 text-zinc-400 group-hover:text-pink-400 transition-colors" />
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-gradient-to-tr from-orange-500 to-rose-600 text-white ring-2 ring-black shadow-md">
                <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5 stroke-[3]" />
              </div>
            </button>
            <span className="text-[11px] font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors max-w-[68px] truncate text-center">
              Your story
            </span>
          </div>

          {/* 2. Creator Story / Live Carousel Items */}
          {stories.map((story) => (
            <div
              key={story.id}
              onClick={() => handleStoryClick(story)}
              className="flex flex-col items-center gap-1.5 group cursor-pointer select-none"
            >
              <div className="relative p-0.5 rounded-full story-ring-gradient group-hover:shadow-[0_0_16px_rgba(244,63,94,0.5)] transition-all group-hover:scale-105">
                <div className="h-15 w-15 sm:h-17 sm:w-17 rounded-full p-[2px] bg-black">
                  <img
                    src={story.avatarUrl}
                    alt={story.displayName}
                    className="h-full w-full rounded-full object-cover"
                  />
                </div>

                {/* Pulsing "LIVE" Badge on Story Avatar */}
                {story.isLive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-gradient-to-r from-rose-600 to-red-600 px-2 py-0.2 text-[9px] font-black uppercase text-white shadow-lg ring-1.5 ring-black">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                    LIVE
                  </span>
                )}
              </div>

              <span className="text-[11px] font-medium text-zinc-300 group-hover:text-white transition-colors max-w-[68px] truncate text-center">
                {story.displayName.split(" ")[0]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Interactive Story & Live Preview Modal */}
      {selectedStory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-fade-in">
          <div className="relative aspect-[9/16] w-full max-w-sm rounded-[32px] overflow-hidden bg-zinc-950 border border-white/10 shadow-2xl flex flex-col justify-between">
            {/* Background Media */}
            <img
              src={selectedStory.storyMediaUrl || selectedStory.avatarUrl}
              alt={selectedStory.displayName}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/70" />

            {/* Story Top Progress Bar & Header */}
            <div className="relative z-10 p-4 space-y-3">
              {/* Progress Line */}
              <div className="h-1 w-full rounded-full bg-white/30 overflow-hidden">
                <div className="h-full w-full bg-white animate-[shimmer_5s_linear_infinite]" />
              </div>

              {/* Creator Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img
                    src={selectedStory.avatarUrl}
                    alt={selectedStory.displayName}
                    className="h-9 w-9 rounded-full object-cover ring-2 ring-pink-500"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-white">{selectedStory.displayName}</span>
                      {selectedStory.isLive && (
                        <span className="rounded-full bg-rose-600 px-1.5 py-0.2 text-[8px] font-black text-white">
                          LIVE
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-300">@{selectedStory.username} • 2h ago</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-1.5 rounded-full bg-black/50 text-white hover:bg-black/80"
                  >
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => setSelectedStory(null)}
                    className="p-1.5 rounded-full bg-black/50 text-white hover:bg-black/80"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Stream / Story Engagement Bar */}
            <div className="relative z-10 p-4 space-y-3">
              {selectedStory.isLive && (
                <Link
                  href={`/live/${selectedStory.creatorId}`}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 py-2.5 text-xs font-black uppercase text-white shadow-lg shadow-rose-600/40 hover:brightness-110 active:scale-98 transition-all"
                >
                  <Radio className="h-4 w-4 animate-pulse" />
                  <span>Join Live Broadcast ({selectedStory.viewerCount} Viewers)</span>
                </Link>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={`Send message to ${selectedStory.displayName.split(" ")[0]}...`}
                  className="flex-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 px-4 py-2 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-pink-500"
                />
                <button
                  onClick={() => setLiked(!liked)}
                  className={`p-2.5 rounded-full backdrop-blur-md transition-transform active:scale-90 ${
                    liked ? "bg-rose-500/20 text-rose-500" : "bg-black/60 text-white"
                  }`}
                >
                  <Heart className={`h-4 w-4 ${liked ? "fill-rose-500" : ""}`} />
                </button>
                <button
                  onClick={() => {
                    if (commentText.trim()) setCommentText("");
                  }}
                  className="p-2.5 rounded-full bg-gradient-to-tr from-pink-600 to-rose-600 text-white"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Add Story Modal */}
      {showAddStoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-3xl bg-zinc-950 border border-zinc-800 p-6 space-y-4 shadow-2xl text-center">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-rose-600 flex items-center justify-center mx-auto text-white shadow-lg">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-base font-black text-white">Create a Story or Go Live</h3>
            <p className="text-xs text-zinc-400">
              Share moment snapshots with your followers or start an interactive livestream broadcasting session.
            </p>
            <div className="space-y-2 pt-2">
              <Link
                href="/creator/studio"
                onClick={() => setShowAddStoryModal(false)}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 py-3 text-xs font-bold text-white shadow-lg shadow-rose-600/30"
              >
                <Radio className="h-4 w-4" />
                <span>Go Live in Studio</span>
              </Link>
              <button
                onClick={() => setShowAddStoryModal(false)}
                className="w-full rounded-2xl bg-zinc-900 border border-zinc-800 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-850"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
