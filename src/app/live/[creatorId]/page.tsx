"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { useLiveRoomSession } from "@/hooks/useLiveRoomSession";
import { useUser } from "@/lib/user-context";
import { LiveRoomBackgroundVideo } from "@/components/live-room/LiveRoomBackgroundVideo";
import { CreatorIdentityOverlay } from "@/components/live-room/CreatorIdentityOverlay";
import { TranslucentChatPanel } from "@/components/live-room/TranslucentChatPanel";
import { FloatingInteractionControls } from "@/components/live-room/FloatingInteractionControls";
import { InteractionMarketplaceDrawer } from "@/components/live-room/InteractionMarketplaceDrawer";
import { LiveTipToast } from "@/components/live-room/LiveTipToast";
import { GiftCelebrationCanvas } from "@/components/live-room/GiftCelebrationCanvas";
import { LiveRoomLeaderboard } from "@/components/live-room/LiveRoomLeaderboard";
import { CreatorLiveEarningsHUD } from "@/components/live-room/CreatorLiveEarningsHUD";
import { LiveInteractionAlertBanner } from "@/components/live-room/LiveInteractionAlertBanner";
import { LiveRoomFanStatusHUD } from "@/components/live-room/LiveRoomFanStatusHUD";
import { FanStatusProfileModal } from "@/components/live-room/FanStatusProfileModal";
import { WalletModal } from "@/components/wallet/WalletModal";
import { ReportModal } from "@/components/trust/ReportModal";
import { useLiveWatchTracker } from "@/hooks/useLiveWatchTracker";
import { useXpProgressionListener } from "@/hooks/useXpProgressionListener";
import { LevelUpCelebrationModal } from "@/components/xp/LevelUpCelebrationModal";
import { XpFloatingToastContainer } from "@/components/xp/XpFloatingToast";
import { FanPublicStatus } from "@/types/fan-status";

export default function LiveRoomPage() {
  const params = useParams();
  const creatorId = (params?.creatorId as string) || "mayavelvet";
  const { currentUser } = useUser();

  // --------------------------------------------------------------------------
  // REAL-TIME ENGINE ORCHESTRATED VIA SINGLE PERSISTENT HOOK:
  // Zero polling - all state originates from authoritative backend events:
  // - GIFT_SENT, NEW_MESSAGE, VIEWER_JOINED, VIEWER_LEFT, GOAL_UPDATED,
  //   INTERACTION_PURCHASED, INTERACTION_ACCEPTED, LEADERBOARD_UPDATED
  // --------------------------------------------------------------------------
  const {
    // 1. Media
    mediaState,
    streamUrl,
    posterUrl,
    isMuted,
    toggleMute,

    // 2. Real-time Connection & Animations
    connectionStatus,
    activeGiftEvent,
    clearActiveGiftEvent,
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

    // 7. Interactions, Queue & PPV
    interactions,
    interactionQueue,
    newInteractionAlert,
    clearNewInteractionAlert,
    ppvVault,
    isTriggeringInteraction,
    triggerInteraction,
    acceptInteraction,
    unlockPPV,

    // 8. Live Goal, Leaderboard & Gifts
    goal,
    leaderboard,
    chipInGoal,
    sendGift,

    // 9. Creator Live Earnings
    creatorGrossCredits,
    creatorNetUsd,

    // 10. Relationship & Wallet
    relationship,
    toggleFollow,
    walletBalance,
  } = useLiveRoomSession(creatorId);

  // -------------------------------------------------------------
  // 11. AUTHORITATIVE BACKEND-DRIVEN XP & WATCH TELEMETRY TRACKER
  // The client passively transmits playback facts; backend calculates XP & level-ups
  // -------------------------------------------------------------
  useLiveWatchTracker({
    fanId: currentUser?.id,
    creatorProfileId: roomConfig?.creatorId || creatorId,
    livestreamId: roomConfig?.activeSessionId || "live_stream_default",
    isPlaying: mediaState === "PLAYING" || Boolean(roomConfig?.isLive),
    heartbeatIntervalMs: 30000,
  });

  const { activeLevelUp, dismissLevelUp, xpToasts, dismissToast } = useXpProgressionListener({
    creatorProfileId: roomConfig?.creatorId || creatorId,
    fanId: currentUser?.id,
  });

  // UI Drawer & Modal State
  const [isMarketplaceOpen, setIsMarketplaceOpen] = useState(false);
  const [marketplaceTab, setMarketplaceTab] = useState<"gifts" | "interactions" | "goal" | "ppv" | "vip">("gifts");
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Fan Status Inspection Modal State
  const [inspectedFanId, setInspectedFanId] = useState<string | null>(null);

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
              Establishing persistent real-time streaming connection (zero polling)
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

  const isCreator = permissions.isCreator || currentUser.id === roomConfig.creatorId;

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

      {/* ------------------------------------------------------------- */}
      {/* 2. REAL-TIME MULTI-TIER GIFT CELEBRATION CANVAS               */}
      {/* Handles Sarah (Sender), Creator, and Spectators distinctly    */}
      {/* ------------------------------------------------------------- */}
      <GiftCelebrationCanvas
        giftEvent={activeGiftEvent}
        currentUserId={currentUser.id}
        isCreator={isCreator}
        onAnimationEnd={clearActiveGiftEvent}
      />

      {/* Real-Time Floating Tip Toasts */}
      <LiveTipToast alerts={recentTipAlerts} />

      {/* Real-Time New Interaction Available Alert Banner */}
      <LiveInteractionAlertBanner
        interaction={newInteractionAlert}
        onDismiss={clearNewInteractionAlert}
        onOpenInteraction={(item) => {
          setMarketplaceTab("interactions");
          setIsMarketplaceOpen(true);
        }}
      />

      {/* Creator Real-Time Live Earnings & Interaction Requests HUD */}
      {isCreator && (
        <CreatorLiveEarningsHUD
          grossTokens={creatorGrossCredits}
          netUsd={creatorNetUsd}
          interactionQueue={interactionQueue}
          onAcceptInteraction={acceptInteraction}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. TOP OVERLAY: CREATOR IDENTITY & LIVE STREAM GOAL          */}
      {/* ------------------------------------------------------------- */}
      <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none p-3 sm:p-4 space-y-2">
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

        {/* High-Value Relationship Presence HUD */}
        <div className="pointer-events-auto flex items-center justify-between">
          <LiveRoomFanStatusHUD
            creatorId={roomConfig.creatorId}
            isCreator={isCreator}
            onSelectFan={(fan: FanPublicStatus) => setInspectedFanId(fan.userId)}
          />
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. BOTTOM OVERLAY: TRANSLUCENT CHAT PANEL                    */}
      {/* ------------------------------------------------------------- */}
      <TranslucentChatPanel
        messages={chatMessages}
        isChatSending={isChatSending}
        canChat={permissions.canChat}
        onSendMessage={sendChatMessage}
        onOpenMarketplace={() => {
          setMarketplaceTab("gifts");
          setIsMarketplaceOpen(true);
        }}
        onInspectFan={(fanId, fanName) => setInspectedFanId(fanId)}
      />

      {/* ------------------------------------------------------------- */}
      {/* 5. FLOATING INTERACTION CONTROLS (RIGHT-SIDE BUTTONS)         */}
      {/* ------------------------------------------------------------- */}
      <FloatingInteractionControls
        walletBalance={walletBalance}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        onOpenMarketplace={() => {
          setMarketplaceTab("gifts");
          setIsMarketplaceOpen(true);
        }}
        onOpenGoalTab={() => {
          setMarketplaceTab("goal");
          setIsMarketplaceOpen(true);
        }}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        onOpenWalletModal={() => setIsWalletModalOpen(true)}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onSendHeart={() => {}}
      />

      {/* ------------------------------------------------------------- */}
      {/* 6. INTERACTION & GIFT MARKETPLACE DRAWER                     */}
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
        onSendGift={sendGift}
        onTriggerInteraction={triggerInteraction}
        onChipInGoal={chipInGoal}
        onUnlockPPV={unlockPPV}
        onOpenWalletModal={() => {
          setIsMarketplaceOpen(false);
          setIsWalletModalOpen(true);
        }}
      />

      {/* ------------------------------------------------------------- */}
      {/* 7. LIVE ROOM LEADERBOARD MODAL                                */}
      {/* ------------------------------------------------------------- */}
      <LiveRoomLeaderboard
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        leaderboard={leaderboard}
        currentUserId={currentUser.id}
        creatorName={roomConfig.displayName}
      />

      {/* ------------------------------------------------------------- */}
      {/* 8. FAN STATUS PROFILE MODAL (Role-Aware Inspection)           */}
      {/* ------------------------------------------------------------- */}
      <FanStatusProfileModal
        isOpen={Boolean(inspectedFanId)}
        onClose={() => setInspectedFanId(null)}
        fanId={inspectedFanId}
        creatorId={roomConfig.creatorId}
        isCreator={isCreator}
        currentUserId={currentUser.id}
        onSendShoutout={(fan) => {
          sendChatMessage(`✨ Special shoutout to our ${fan.fullBadge} ${fan.displayName}! Thank you for your support! 👑`);
        }}
        onMuteUser={(fanId, fanName) => {
          sendChatMessage(`🛡️ User ${fanName} was muted by the broadcaster.`);
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

      {/* ------------------------------------------------------------- */}
      {/* 9. AUTHORITATIVE XP LEVEL-UP CELEBRATION MODAL & TOASTS       */}
      {/* ------------------------------------------------------------- */}
      <LevelUpCelebrationModal
        payload={activeLevelUp}
        onClose={dismissLevelUp}
      />
      <XpFloatingToastContainer
        toasts={xpToasts}
        onDismiss={dismissToast}
      />
    </main>
  );
}
