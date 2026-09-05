"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Sparkles,
  Coins,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Flame,
  Image as ImageIcon,
  CheckCircle2,
  Heart,
  Share2,
} from "lucide-react";
import { VideoPlayer } from "@/components/consumer/VideoPlayer";
import { LiveChat } from "@/components/consumer/LiveChat";
import { TipMenuModal, MenuItem } from "@/components/consumer/TipMenuModal";
import { StreamGoalBanner } from "@/components/consumer/StreamGoalBanner";
import { TipAlertOverlay } from "@/components/consumer/TipAlertOverlay";
import { WalletModal } from "@/components/wallet/WalletModal";
import { ReportModal } from "@/components/trust/ReportModal";
import { useUser } from "@/lib/user-context";

interface PPVItem {
  id: string;
  title: string;
  description: string | null;
  previewUrl: string;
  creditPrice: number;
  mediaType: string;
}

interface CreatorData {
  id: string;
  bio: string | null;
  streamTitle: string;
  isLive: boolean;
  viewerCount: number;
  currentGoalTitle: string;
  currentGoalTarget: number;
  currentGoalProgress: number;
  isPrivateShow: boolean;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    kycStatus: string;
  };
  interactionItems: MenuItem[];
  ppvContents: PPVItem[];
}

export default function LiveRoomPage() {
  const params = useParams();
  const creatorId = params?.creatorId as string;
  const { currentUser, updateBalance } = useUser();

  const [creator, setCreator] = useState<CreatorData | null>(null);
  const [isTipMenuOpen, setIsTipMenuOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "ppv" | "about">("chat");
  const [unlockedPpvIds, setUnlockedPpvIds] = useState<Set<string>>(new Set());
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [goalProgress, setGoalProgress] = useState(0);
  const [goalTarget, setGoalTarget] = useState(500);

  // Fetch creator room data
  useEffect(() => {
    if (!creatorId) return;

    fetch(`/api/creators/${creatorId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.creator) {
          setCreator(data.creator);
          setGoalProgress(data.creator.currentGoalProgress);
          setGoalTarget(data.creator.currentGoalTarget);
        }
      })
      .catch(() => {});
  }, [creatorId]);

  // Listen to SSE updates for goal progress and room status
  useEffect(() => {
    if (!creatorId) return;

    const eventSource = new EventSource(`/api/realtime/${creatorId}/sse`);
    eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === "TIP_EVENT") {
          if (event.payload.newGoalProgress !== undefined) {
            setGoalProgress(event.payload.newGoalProgress);
          }
        }
      } catch {
        // SSE parsing
      }
    };

    return () => {
      eventSource.close();
    };
  }, [creatorId]);

  const handleUnlockPPV = async (item: PPVItem) => {
    if (currentUser.walletBalance < item.creditPrice) {
      setIsWalletOpen(true);
      return;
    }

    setUnlockingId(item.id);
    try {
      const res = await fetch("/api/economic/ppv/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fanUserId: currentUser.id,
          ppvContentId: item.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      updateBalance(data.fanRemainingBalance);
      setUnlockedPpvIds((prev) => new Set(prev).add(item.id));
    } catch (err) {
      console.error(err);
    } finally {
      setUnlockingId(null);
    }
  };

  if (!creator) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Real-time Floating Tip Toast Overlay */}
      <TipAlertOverlay creatorId={creator.id} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Video Player, Stream Goal, Controls, Bio */}
        <div className="lg:col-span-2 space-y-4">
          {/* Main Video Stream */}
          <VideoPlayer
            creatorId={creator.id}
            creatorName={creator.user.displayName}
            isLive={creator.isLive}
            viewerCount={creator.viewerCount}
            isPrivateShow={creator.isPrivateShow}
            posterUrl={creator.user.avatarUrl || undefined}
          />

          {/* Real-Time Animated Stream Goal Bar */}
          <StreamGoalBanner
            title={creator.currentGoalTitle}
            currentProgress={goalProgress}
            target={goalTarget}
          />

          {/* Stream Information & Action Bar */}
          <div className="rounded-3xl bg-zinc-950 border border-zinc-800/80 p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <img
                  src={
                    creator.user.avatarUrl ||
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                  }
                  alt={creator.user.displayName}
                  className="h-13 w-13 rounded-2xl object-cover ring-2 ring-pink-500/40"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-extrabold text-white">
                      {creator.user.displayName}
                    </h1>
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                      <ShieldCheck className="h-3 w-3" />
                      2257 Verified
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-medium mt-0.5">{creator.streamTitle}</p>
                </div>
              </div>

              {/* Interaction & Tip Buttons */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setIsTipMenuOpen(true)}
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-pink-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-pink-600/30 hover:from-pink-500 hover:to-rose-500 transition-all"
                >
                  <Sparkles className="h-4 w-4" />
                  Tip Menu
                </button>
                <button
                  onClick={() => setIsReportOpen(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-rose-400 hover:border-rose-500/40 transition-colors"
                  title="Report Content"
                >
                  <ShieldAlert className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Bio & Description */}
            {creator.bio && (
              <div className="mt-4 pt-4 border-t border-zinc-900 text-xs text-zinc-300 leading-relaxed">
                {creator.bio}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Chat & PPV Vault Tabs */}
        <div className="lg:col-span-1 h-[680px] flex flex-col">
          {/* Tab Switcher */}
          <div className="flex items-center gap-1 rounded-2xl bg-zinc-900/60 p-1 border border-zinc-800/80 mb-3">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 rounded-xl py-1.5 text-xs font-bold transition-all ${
                activeTab === "chat"
                  ? "bg-pink-600 text-white shadow-md shadow-pink-600/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Live Chat
            </button>
            <button
              onClick={() => setActiveTab("ppv")}
              className={`flex-1 rounded-xl py-1.5 text-xs font-bold transition-all ${
                activeTab === "ppv"
                  ? "bg-pink-600 text-white shadow-md shadow-pink-600/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              PPV Vault ({creator.ppvContents.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === "chat" ? (
              <LiveChat
                creatorId={creator.id}
                onOpenTipMenu={() => setIsTipMenuOpen(true)}
              />
            ) : (
              <div className="h-full rounded-3xl bg-zinc-950 border border-zinc-800/80 p-4 overflow-y-auto space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Exclusive Media Vault
                  </h3>
                  <span className="text-[10px] text-zinc-500">Pay-Per-View</span>
                </div>

                {creator.ppvContents.map((ppv) => {
                  const isUnlocked = unlockedPpvIds.has(ppv.id);
                  return (
                    <div
                      key={ppv.id}
                      className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-3 overflow-hidden"
                    >
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden mb-2.5 bg-zinc-900">
                        <img
                          src={ppv.previewUrl}
                          alt={ppv.title}
                          className={`h-full w-full object-cover ${!isUnlocked ? "filter blur-sm scale-105" : ""}`}
                        />
                        {!isUnlocked && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pink-500/80 text-white shadow-lg shadow-pink-500/40">
                              <Lock className="h-4 w-4" />
                            </span>
                          </div>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-white line-clamp-1">{ppv.title}</h4>
                      {ppv.description && (
                        <p className="text-[10px] text-zinc-400 line-clamp-2 mt-0.5">
                          {ppv.description}
                        </p>
                      )}

                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-zinc-800/60">
                        <div className="flex items-center gap-1 text-xs font-extrabold text-amber-400">
                          <Coins className="h-3.5 w-3.5" />
                          <span>{ppv.creditPrice} Tokens</span>
                        </div>

                        {isUnlocked ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Unlocked
                          </span>
                        ) : (
                          <button
                            onClick={() => handleUnlockPPV(ppv)}
                            disabled={unlockingId === ppv.id}
                            className="rounded-xl bg-pink-600 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-pink-600/20 hover:bg-pink-500 disabled:opacity-50"
                          >
                            {unlockingId === ppv.id ? "Unlocking..." : "Unlock Media"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Modals */}
      <TipMenuModal
        isOpen={isTipMenuOpen}
        onClose={() => setIsTipMenuOpen(false)}
        creatorId={creator.id}
        creatorName={creator.user.displayName}
        menuItems={creator.interactionItems}
        onOpenWalletModal={() => setIsWalletOpen(true)}
      />

      <WalletModal isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} />

      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        creatorId={creator.id}
        creatorName={creator.user.displayName}
      />
    </div>
  );
}
