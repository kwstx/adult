"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { useLiveRoomSession } from "@/hooks/useLiveRoomSession";
import { LiveRoomBackgroundVideo } from "@/components/live-room/LiveRoomBackgroundVideo";
import { CreatorIdentityOverlay } from "@/components/live-room/CreatorIdentityOverlay";
import { TranslucentChatPanel } from "@/components/live-room/TranslucentChatPanel";
import { FloatingInteractionControls } from "@/components/live-room/FloatingInteractionControls";
import { InteractionMarketplaceDrawer } from "@/components/live-room/InteractionMarketplaceDrawer";
import { LiveTipToast } from "@/components/live-room/LiveTipToast";
import { WalletModal } from "@/components/wallet/WalletModal";
import { ReportModal } from "@/components/trust/ReportModal";

export default function LiveRoomPage() {
  const params = useParams();
  const creatorId = (params?.creatorId as string) || "mayavelvet";

  // --------------------------------------------------------------------------
  // 10 INDEPENDENT CONCURRENT SYSTEMS ORCHESTRATED VIA SINGLE HOOK:
  // 1. Video Player receiving media
  // 2. Real-time application connection (SSE / EventBus)
  // 3. Room configuration loading
  // 4. Backend viewer permissions determination
  // 5. Chat connection & message streaming
  // 6. Audience presence system & live viewer counting
  // 7. Interaction catalogue loading & execution
  // 8. Creator live goal loading & real-time milestones
  // 9. Viewer relationship level loading & progression
  // 10. User wallet balance loading & ledger synchronization
  // --------------------------------------------------------------------------
  const {
    // 1. Media
    mediaState,
    streamUrl,
    posterUrl,
    isMuted,
    toggleMute,

    // 2. Real-time Connection
    connectionStatus,
    recentTipAlerts,

    // 3. Room Configuration
    roomConfig,
    isLoadingSession,
    sessionError,

    // 4. Permissions
    permissions,

    // 5. Chat Engine
    chatMessages,
    isChatSending,
    sendChatMessage,

    // 6. Presence
    viewerCount,

    // 7. Interactions & PPV
    interactions,
    ppvVault,
    isTriggeringInteraction,
    triggerInteraction,
    unlockPPV,

    // 8. Live Goal
    goal,
    chipInGoal,

    // 9. Relationship
    relationship,
    toggleFollow,

    // 10. Wallet
    walletBalance,
  } = useLiveRoomSession(creatorId);

  // UI Drawer & Modal State
  const [isMarketplaceOpen, setIsMarketplaceOpen] = useState(false);
  const [marketplaceTab, setMarketplaceTab] = useState<"interactions" | "goal" | "ppv" | "vip">("interactions");
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Loading State
  if (isLoadingSession && !roomConfig) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-14 w-14 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-pink-600/30" />
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-pink-500 border-t-transparent shadow-lg shadow-pink-500/40" />
          </div>
          <div className="text-center">
            <p className="text-sm font-black tracking-wide text-zinc-200">
              Entering Live Room...
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Establishing real-time connection & syncing systems
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (sessionError || !roomConfig) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-zinc-950 p-6 text-center text-white">
        <div className="max-w-md rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 shadow-2xl backdrop-blur-xl">
          <h2 className="text-xl font-black text-rose-400">Unable to Connect</h2>
          <p className="text-xs text-zinc-400 mt-2 mb-6 leading-relaxed">
            {sessionError || "The live broadcast could not be found or is currently unavailable."}
          </p>
          <a
            href="/discover"
            className="inline-flex rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 px-6 py-3 text-xs font-bold text-white shadow-xl shadow-pink-600/30 hover:from-pink-500 hover:to-rose-500 transition-all"
          >
            Explore Live Discovery Feed
          </a>
        </div>
      </div>
    );
  }

  return (
    <main className="relative h-screen w-full overflow-hidden bg-black select-none">
      {/* ------------------------------------------------------------- */}
      {/* 1. BACKGROUND: CREATOR'S LIVE VIDEO STREAM & AMBIENCE        */}
      {/* ------------------------------------------------------------- */}
      <LiveRoomBackgroundVideo
        streamUrl={streamUrl}
        posterUrl={posterUrl}
        creatorName={roomConfig.displayName}
        isLive={roomConfig.isLive}
        isPrivateShow={roomConfig.isPrivateShow && !permissions.isVip}
        mediaState={mediaState}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        onDoubleTapHeart={() => {}}
        onUnlockPrivateShow={() => {
          setMarketplaceTab("vip");
          setIsMarketplaceOpen(true);
        }}
      />

      {/* Real-Time Floating Tip Celebration Toasts */}
      <LiveTipToast alerts={recentTipAlerts} />

      {/* ------------------------------------------------------------- */}
      {/* 2. TOP OVERLAY: CREATOR IDENTITY & STATUS                     */}
      {/* ------------------------------------------------------------- */}
      <CreatorIdentityOverlay
        roomConfig={roomConfig}
        relationship={relationship}
        goal={goal}
        viewerCount={viewerCount}
        onToggleFollow={toggleFollow}
        onOpenGoalDrawer={() => {
          setMarketplaceTab("goal");
          setIsMarketplaceOpen(true);
        }}
      />

      {/* ------------------------------------------------------------- */}
      {/* 3. BOTTOM OVERLAY: TRANSLUCENT / GRADIENT CHAT PANEL         */}
      {/* ------------------------------------------------------------- */}
      <TranslucentChatPanel
        messages={chatMessages}
        isChatSending={isChatSending}
        canChat={permissions.canChat}
        onSendMessage={sendChatMessage}
        onOpenMarketplace={() => {
          setMarketplaceTab("interactions");
          setIsMarketplaceOpen(true);
        }}
      />

      {/* ------------------------------------------------------------- */}
      {/* 4. FLOATING INTERACTION CONTROLS (RIGHT-SIDE BUTTONS)         */}
      {/* ------------------------------------------------------------- */}
      <FloatingInteractionControls
        walletBalance={walletBalance}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        onOpenMarketplace={() => {
          setMarketplaceTab("interactions");
          setIsMarketplaceOpen(true);
        }}
        onOpenGoalTab={() => {
          setMarketplaceTab("goal");
          setIsMarketplaceOpen(true);
        }}
        onOpenWalletModal={() => setIsWalletModalOpen(true)}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onSendHeart={() => {}}
      />

      {/* ------------------------------------------------------------- */}
      {/* 5. INTERACTION MARKETPLACE DRAWER                             */}
      {/* ------------------------------------------------------------- */}
      <InteractionMarketplaceDrawer
        isOpen={isMarketplaceOpen}
        onClose={() => setIsMarketplaceOpen(false)}
        initialTab={marketplaceTab}
        creatorId={roomConfig.creatorId}
        creatorName={roomConfig.displayName}
        walletBalance={walletBalance}
        interactions={interactions}
        goal={goal}
        ppvVault={ppvVault}
        relationship={relationship}
        isTriggeringInteraction={isTriggeringInteraction}
        onTriggerInteraction={triggerInteraction}
        onChipInGoal={chipInGoal}
        onUnlockPPV={unlockPPV}
        onOpenWalletModal={() => {
          setIsMarketplaceOpen(false);
          setIsWalletModalOpen(true);
        }}
      />

      {/* Modals */}
      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
      />

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        creatorId={roomConfig.creatorId}
        creatorName={roomConfig.displayName}
      />
    </main>
  );
}
