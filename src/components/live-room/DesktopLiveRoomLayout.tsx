"use client";

import React, { useState } from "react";
import {
  Users,
  Radio,
  Sparkles,
  Lock,
  Volume2,
  VolumeX,
  Maximize,
  Coins,
  Tv,
  Target,
  Crown,
  Heart,
  MessageSquare,
  Zap,
} from "lucide-react";
import type {
  RoomConfig,
  ViewerPermissions,
  ViewerRelationship,
  StreamGoalData,
  InteractionCatalogueItem,
  PPVVaultItem,
} from "@/modules/livestream/room-session.service";
import type {
  MediaPlaybackState,
  TipAlertItem,
} from "@/hooks/useLiveRoomSession";
import type {
  ChatMessagePayload,
  GiftSentPayload,
  LeaderboardEntry,
  NewInteractionAvailablePayload,
} from "@/modules/realtime/types";
import type { VirtualRoomLayout } from "@/types/seat";
import type { FanPublicStatus } from "@/types/fan-status";
import { CreatorIdentityOverlay } from "./CreatorIdentityOverlay";
import { LiveRoomBackgroundVideo } from "./LiveRoomBackgroundVideo";
import { GiftCelebrationCanvas } from "./GiftCelebrationCanvas";
import { LiveTipToast } from "./LiveTipToast";
import { LiveInteractionAlertBanner } from "./LiveInteractionAlertBanner";
import { CreatorLiveEarningsHUD } from "./CreatorLiveEarningsHUD";
import { LiveRoomFanStatusHUD } from "./LiveRoomFanStatusHUD";
import { TopSupportersSideWidget } from "./TopSupportersSideWidget";
import { DesktopLiveRoomChat } from "./DesktopLiveRoomChat";
import { DesktopMarketplaceDock } from "./DesktopMarketplaceDock";
import { DesktopLivePlayerControls } from "./DesktopLivePlayerControls";

export interface DesktopLiveRoomLayoutProps {
  // 1. Media
  mediaState: MediaPlaybackState;
  streamUrl?: string;
  posterUrl?: string;
  isMuted: boolean;
  toggleMute: () => void;

  // 2. Real-time Events
  activeGiftEvent: GiftSentPayload | null;
  clearActiveGiftEvent: () => void;
  recentTipAlerts: TipAlertItem[];
  newInteractionAlert: any;
  clearNewInteractionAlert: () => void;

  // 3. Room Config & Presence
  roomConfig: any;
  viewerCount: number;
  permissions: any;
  currentUserId: string;
  isCreator: boolean;

  // 4. Chat
  chatMessages: ChatMessagePayload[];
  isChatSending: boolean;
  sendChatMessage: (text: string) => Promise<boolean>;

  // 5. Marketplace & Actions
  interactions: InteractionCatalogueItem[];
  interactionQueue: any[];
  isTriggeringInteraction: string | null;
  triggerInteraction: (item: InteractionCatalogueItem) => Promise<boolean>;
  acceptInteraction?: (queueItemId: string) => Promise<boolean>;
  sendGift?: (params: any) => Promise<boolean>;
  chipInGoal: (credits: number) => Promise<boolean>;
  unlockPPV: (ppvId: string) => Promise<boolean>;
  ppvVault?: PPVVaultItem[];

  // 6. Goal & Relationship
  goal: StreamGoalData;
  relationship: ViewerRelationship;
  toggleFollow: () => Promise<void> | Promise<boolean>;
  walletBalance: number;

  // 7. Leaderboard & Seats
  leaderboard: LeaderboardEntry[];
  roomLayout?: VirtualRoomLayout | null;

  // 8. Creator Earnings
  creatorGrossCredits: number;
  creatorNetUsd: number;

  // 9. Modals triggers
  onOpenWalletModal: () => void;
  onOpenReportModal: () => void;
  onOpenLeaderboard: () => void;
  onOpenVirtualRoom: () => void;
  onInspectFan: (fanId: string) => void;
}

export function DesktopLiveRoomLayout({
  mediaState,
  streamUrl,
  posterUrl,
  isMuted,
  toggleMute,
  activeGiftEvent,
  clearActiveGiftEvent,
  recentTipAlerts,
  newInteractionAlert,
  clearNewInteractionAlert,
  roomConfig,
  viewerCount,
  permissions,
  currentUserId,
  isCreator,
  chatMessages,
  isChatSending,
  sendChatMessage,
  interactions,
  interactionQueue,
  isTriggeringInteraction,
  triggerInteraction,
  acceptInteraction,
  sendGift,
  chipInGoal,
  unlockPPV,
  ppvVault = [],
  goal,
  relationship,
  toggleFollow,
  walletBalance,
  leaderboard,
  roomLayout,
  creatorGrossCredits,
  creatorNetUsd,
  onOpenWalletModal,
  onOpenReportModal,
  onOpenLeaderboard,
  onOpenVirtualRoom,
  onInspectFan,
}: DesktopLiveRoomLayoutProps) {
  // Desktop Layout Modes
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [volume, setVolume] = useState(80);
  const [streamQuality, setStreamQuality] = useState("1080p60 (Source)");
  const [activeSideTab, setActiveSideTab] = useState<"chat" | "market">("chat");

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-black text-white overflow-hidden select-none">
      {/* ------------------------------------------------------------- */}
      {/* REAL-TIME OVERLAYS: CELEBRATION, TIP TOASTS, ALERTS           */}
      {/* ------------------------------------------------------------- */}
      <GiftCelebrationCanvas
        giftEvent={activeGiftEvent}
        currentUserId={currentUserId}
        isCreator={isCreator}
        onAnimationEnd={clearActiveGiftEvent}
      />

      <LiveTipToast alerts={recentTipAlerts} />

      <LiveInteractionAlertBanner
        interaction={newInteractionAlert}
        onDismiss={clearNewInteractionAlert}
        onOpenInteraction={() => {}}
      />

      {/* Broadcaster Real-time Earnings HUD */}
      {isCreator && (
        <CreatorLiveEarningsHUD
          grossTokens={creatorGrossCredits}
          netUsd={creatorNetUsd}
          interactionQueue={interactionQueue}
          onAcceptInteraction={acceptInteraction || (async () => true)}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* MAIN 3-ZONE WORKSTATION CANVAS (Left Video | Center Chat | Right Market) */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 flex min-h-0 w-full overflow-hidden">
        {/* ========================================================= */}
        {/* ZONE 1 (LEFT): CREATOR / LIVE VIDEO VIEWPORT              */}
        {/* ========================================================= */}
        <section
          aria-label="Creator Live Stream Viewport"
          className={`relative flex flex-col justify-between overflow-hidden bg-zinc-950 transition-all duration-300 ${
            isTheaterMode
              ? "flex-1 min-w-0"
              : "flex-1 min-w-[380px] lg:flex-[1.6] xl:flex-[1.9] 2xl:flex-[2.2]"
          }`}
        >
          {/* 1.1 Video Layer */}
          <div className="relative flex-1 w-full h-full min-h-0 overflow-hidden flex items-center justify-center">
            <LiveRoomBackgroundVideo
              streamUrl={streamUrl}
              posterUrl={posterUrl}
              creatorName={roomConfig.displayName}
              isLive={roomConfig.isLive}
              isPrivateShow={roomConfig.isPrivateShow && !permissions.isVip}
              mediaState={mediaState}
              isMuted={isMuted}
              onToggleMute={toggleMute}
              onUnlockPrivateShow={() => {}}
            />

            {/* 1.2 Top In-Video HUD: Creator Identity & Stream Goal */}
            <div className="absolute top-0 left-0 right-0 z-20 p-4 space-y-2.5 pointer-events-none">
              <div className="pointer-events-auto">
                <CreatorIdentityOverlay
                  roomConfig={roomConfig}
                  relationship={relationship}
                  goal={goal}
                  viewerCount={viewerCount}
                  onToggleFollow={toggleFollow}
                  onOpenGoalDrawer={() => {}}
                />
              </div>

              {/* High-Value Relationship Presence HUD & Virtual Seats Counter */}
              <div className="pointer-events-auto flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
                <LiveRoomFanStatusHUD
                  creatorId={roomConfig.creatorId}
                  isCreator={isCreator}
                  onSelectFan={(fan: FanPublicStatus) => onInspectFan(fan.userId)}
                />

                {/* Virtual Room Trigger Badge */}
                <button
                  onClick={onOpenVirtualRoom}
                  className="flex items-center gap-1.5 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md px-3 py-1 text-xs font-bold text-white border border-purple-500/30 shadow-lg hover:border-purple-400/60 transition-all shrink-0"
                >
                  <span className="flex h-2 w-2 rounded-full bg-purple-400 animate-ping" />
                  <span>Virtual Room</span>
                  {roomLayout && (
                    <span className="rounded-full bg-purple-500/30 px-1.5 py-0.2 text-[10px] text-purple-200 font-black">
                      {roomLayout.totalSeatedCount} seated
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* 1.3 Left Overlay Dock: Top Supporters Widget (Workstation mode) */}
            {!isTheaterMode && (
              <div className="absolute top-28 left-4 z-20 pointer-events-auto hidden 2xl:block">
                <TopSupportersSideWidget
                  leaderboard={leaderboard}
                  currentUserId={currentUserId}
                  creatorName={roomConfig.displayName}
                  onOpenFullLeaderboard={onOpenLeaderboard}
                  onSendGift={() => {}}
                  onSelectUser={(userId) => onInspectFan(userId)}
                />
              </div>
            )}
          </div>
        </section>

        {/* ========================================================= */}
        {/* THEATER MODE COLLAPSED SIDEBAR (Tabbed Chat & Market)     */}
        {/* ========================================================= */}
        {isTheaterMode ? (
          <aside
            aria-label="Theater Mode Companion Panel"
            className="w-[360px] xl:w-[400px] h-full shrink-0 flex flex-col border-l border-zinc-800/80 bg-zinc-950"
          >
            {/* Theater Mode Side Switcher */}
            <div className="flex items-center border-b border-zinc-800/80 bg-zinc-900/60 p-1.5 shrink-0">
              <button
                onClick={() => setActiveSideTab("chat")}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-bold transition-all ${
                  activeSideTab === "chat"
                    ? "bg-pink-600 text-white shadow-md shadow-pink-600/30"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Live Chat</span>
              </button>
              <button
                onClick={() => setActiveSideTab("market")}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-bold transition-all ${
                  activeSideTab === "market"
                    ? "bg-pink-600 text-white shadow-md shadow-pink-600/30"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Zap className="h-3.5 w-3.5" />
                <span>Marketplace</span>
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
              {activeSideTab === "chat" ? (
                <DesktopLiveRoomChat
                  messages={chatMessages}
                  isChatSending={isChatSending}
                  canChat={permissions.canChat}
                  onSendMessage={sendChatMessage}
                  onInspectFan={(id) => onInspectFan(id)}
                  viewerCount={viewerCount}
                  creatorName={roomConfig.displayName}
                />
              ) : (
                <DesktopMarketplaceDock
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
                  onOpenWalletModal={onOpenWalletModal}
                  onOpenLeaderboard={onOpenLeaderboard}
                  onOpenVirtualRoom={onOpenVirtualRoom}
                  roomLayout={roomLayout}
                />
              )}
            </div>
          </aside>
        ) : (
          <>
            {/* ========================================================= */}
            {/* ZONE 2 (CENTER): DEDICATED REALTIME LIVE CHAT STREAM       */}
            {/* ========================================================= */}
            <section
              aria-label="Desktop Realtime Chat"
              className="w-[320px] lg:w-[350px] xl:w-[380px] 2xl:w-[410px] h-full shrink-0 flex flex-col"
            >
              <DesktopLiveRoomChat
                messages={chatMessages}
                isChatSending={isChatSending}
                canChat={permissions.canChat}
                onSendMessage={sendChatMessage}
                onInspectFan={(id) => onInspectFan(id)}
                viewerCount={viewerCount}
                creatorName={roomConfig.displayName}
              />
            </section>

            {/* ========================================================= */}
            {/* ZONE 3 (RIGHT): INTERACTION MARKETPLACE & CONTROLS DOCK    */}
            {/* ========================================================= */}
            <section
              aria-label="Desktop Interaction Marketplace"
              className="w-[330px] lg:w-[360px] xl:w-[390px] 2xl:w-[420px] h-full shrink-0 flex flex-col"
            >
              <DesktopMarketplaceDock
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
                onOpenWalletModal={onOpenWalletModal}
                onOpenLeaderboard={onOpenLeaderboard}
                onOpenVirtualRoom={onOpenVirtualRoom}
                roomLayout={roomLayout}
              />
            </section>
          </>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ZONE 4 (BOTTOM): PERSISTENT DESKTOP PLAYER CONTROLS BAR       */}
      {/* ------------------------------------------------------------- */}
      <DesktopLivePlayerControls
        isPlaying={mediaState === "PLAYING"}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        volume={volume}
        onVolumeChange={setVolume}
        quality={streamQuality}
        onQualityChange={setStreamQuality}
        isTheaterMode={isTheaterMode}
        onToggleTheaterMode={() => setIsTheaterMode(!isTheaterMode)}
        isFullscreen={typeof document !== "undefined" && Boolean(document.fullscreenElement)}
        onToggleFullscreen={toggleFullscreen}
        walletBalance={walletBalance}
        onOpenWalletModal={onOpenWalletModal}
        onQuickTip={(amt) => {
          if (sendGift) {
            sendGift({
              credits: amt,
              giftId: `quick_tip_${amt}`,
              giftName: `${amt} Token Tip`,
              giftIcon: "🪙",
            });
          }
        }}
        onOpenReportModal={onOpenReportModal}
        viewerCount={viewerCount}
        creatorName={roomConfig.displayName}
        isCreator={isCreator}
        creatorGrossCredits={creatorGrossCredits}
        creatorNetUsd={creatorNetUsd}
      />
    </div>
  );
}
