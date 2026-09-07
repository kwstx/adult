"use client";

import React, { useState } from "react";
import {
  LayoutGrid,
  Columns,
  Maximize2,
  Minimize2,
  Tv,
  MessageSquare,
  Zap,
  Layers,
  Sparkles,
  Sliders,
  Shield,
  Eye,
  EyeOff,
} from "lucide-react";
import { AudienceChatPanel } from "./AudienceChatPanel";
import { CenterStudioCanvas } from "./CenterStudioCanvas";
import { MarketplaceControlsPanel } from "./MarketplaceControlsPanel";
import type {
  ControlRoomTelemetry,
  StreamGoal,
  LiveQueueItem,
  PurchaseLedgerItem,
  ControlRoomChatMessage,
  AudienceMember,
  TopSupporter,
  MarketplaceItem,
  ModerationRuleConfig,
  SurgeMultiplier,
  InteractionEligibility,
} from "@/types/control-room";

export interface DesktopCreatorMultiPanelStudioProps {
  // Telemetry & Hardware
  telemetry: ControlRoomTelemetry;
  videoPreviewRef: React.RefObject<HTMLVideoElement | null>;
  isCameraActive: boolean;
  isMicActive: boolean;
  audioMeterLevel: number;
  moderationRules: ModerationRuleConfig;
  onToggleCamera: () => void;
  onToggleMic: () => void;

  // Left (Audience & Chat)
  chatMessages: ControlRoomChatMessage[];
  audienceList: AudienceMember[];
  topSupporters: TopSupporter[];
  selectedAudienceMember: AudienceMember | null;
  onSendMessage: (text: string) => void;
  onPinMessage: (id: string) => void;
  onDeleteMessage: (id: string) => void;
  onMuteUser: (userId: string, username: string) => void;
  onTimeoutUser: (userId: string, username: string) => void;
  onBanUser: (userId: string, username: string) => void;
  onBroadcastShoutout: (supporter: TopSupporter) => void;
  onSelectAudienceMember: (member: AudienceMember | null) => void;

  // Center (Queue, Goal, Ledger)
  interactionQueue: LiveQueueItem[];
  activeGoal: StreamGoal;
  purchaseLedger: PurchaseLedgerItem[];
  isConfettiActive: boolean;
  onAcceptQueueItem: (id: string, note?: string) => void;
  onStartProgressQueueItem?: (id: string) => void;
  onCompleteQueueItem: (id: string) => void;
  onRejectQueueItem?: (id: string, reason: string) => void;
  onCancelQueueItem?: (id: string, reason: string) => void;
  onRefundQueueItem?: (id: string, reason: string, partialCredits?: number) => void;
  onSkipQueueItem: (id: string) => void;
  onOpenEditGoal: () => void;
  onTriggerGoalCelebration: () => void;

  // Right (Marketplace)
  marketplaceItems: MarketplaceItem[];
  surgeMultiplier: SurgeMultiplier;
  onApplySurgeMultiplier: (multiplier: SurgeMultiplier) => void;
  onOpenAddModal: () => void;
  onUpdatePrice: (id: string, newPrice: number) => void;
  onToggleItemEnabled: (id: string) => void;
  onSetQuantity: (id: string, quantity: number | null) => void;
  onSetDuration: (id: string, duration: number) => void;
  onSetEligibility: (id: string, eligibility: InteractionEligibility) => void;
  onDeleteItem: (id: string) => void;
}

type StudioLayoutMode = "QUAD_PANEL" | "STREAM_FOCUS" | "AUDIENCE_CRM";

export function DesktopCreatorMultiPanelStudio({
  telemetry,
  videoPreviewRef,
  isCameraActive,
  isMicActive,
  audioMeterLevel,
  moderationRules,
  onToggleCamera,
  onToggleMic,
  chatMessages,
  audienceList,
  topSupporters,
  onSendMessage,
  onPinMessage,
  onDeleteMessage,
  onMuteUser,
  onTimeoutUser,
  onBanUser,
  onBroadcastShoutout,
  onSelectAudienceMember,
  interactionQueue,
  activeGoal,
  purchaseLedger,
  isConfettiActive,
  onAcceptQueueItem,
  onStartProgressQueueItem,
  onCompleteQueueItem,
  onRejectQueueItem,
  onCancelQueueItem,
  onRefundQueueItem,
  onSkipQueueItem,
  onOpenEditGoal,
  onTriggerGoalCelebration,
  marketplaceItems,
  surgeMultiplier,
  onApplySurgeMultiplier,
  onOpenAddModal,
  onUpdatePrice,
  onToggleItemEnabled,
  onSetQuantity,
  onSetDuration,
  onSetEligibility,
  onDeleteItem,
}: DesktopCreatorMultiPanelStudioProps) {
  const [layoutMode, setLayoutMode] = useState<StudioLayoutMode>("QUAD_PANEL");
  const [isLeftPanelVisible, setIsLeftPanelVisible] = useState(true);
  const [isRightPanelVisible, setIsRightPanelVisible] = useState(true);

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full bg-black select-none overflow-hidden">
      {/* ------------------------------------------------------------- */}
      {/* MULTI-PANEL WORKSPACE CONTROLLER BAR                          */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950 px-4 py-2 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            Multi-Panel Workstation:
          </span>

          {/* Preset Layout Buttons */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-0.5">
            <button
              onClick={() => {
                setLayoutMode("QUAD_PANEL");
                setIsLeftPanelVisible(true);
                setIsRightPanelVisible(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                layoutMode === "QUAD_PANEL"
                  ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                  : "text-zinc-400 hover:text-white"
              }`}
              title="View all studio panels simultaneously"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Quad Workstation</span>
            </button>

            <button
              onClick={() => {
                setLayoutMode("STREAM_FOCUS");
                setIsLeftPanelVisible(false);
                setIsRightPanelVisible(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                layoutMode === "STREAM_FOCUS"
                  ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                  : "text-zinc-400 hover:text-white"
              }`}
              title="Stream & Queue Focus (Expanded center)"
            >
              <Tv className="h-3.5 w-3.5" />
              <span>Studio Focus</span>
            </button>

            <button
              onClick={() => {
                setLayoutMode("AUDIENCE_CRM");
                setIsLeftPanelVisible(true);
                setIsRightPanelVisible(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                layoutMode === "AUDIENCE_CRM"
                  ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                  : "text-zinc-400 hover:text-white"
              }`}
              title="Audience & Fan CRM Focus"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Audience CRM Focus</span>
            </button>
          </div>
        </div>

        {/* Panel Toggle Switches */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLeftPanelVisible(!isLeftPanelVisible)}
            className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold border transition-colors ${
              isLeftPanelVisible
                ? "bg-zinc-800 text-white border-zinc-700"
                : "bg-zinc-950 text-zinc-500 border-zinc-850 hover:text-zinc-300"
            }`}
          >
            {isLeftPanelVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            <span>Chat Panel</span>
          </button>

          <button
            onClick={() => setIsRightPanelVisible(!isRightPanelVisible)}
            className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold border transition-colors ${
              isRightPanelVisible
                ? "bg-zinc-800 text-white border-zinc-700"
                : "bg-zinc-950 text-zinc-500 border-zinc-850 hover:text-zinc-300"
            }`}
          >
            {isRightPanelVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            <span>Marketplace Panel</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SIMULTANEOUS MULTI-PANEL WORKSPACE CONTENT                    */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 flex min-h-0 w-full overflow-hidden">
        {/* PANEL 1 (LEFT): AUDIENCE, CHAT, TOP SUPPORTERS & CRM */}
        {isLeftPanelVisible && (
          <aside
            aria-label="Creator Audience and Chat Panel"
            className={`h-full shrink-0 border-r border-zinc-800/80 bg-zinc-950 transition-all duration-300 flex flex-col ${
              layoutMode === "AUDIENCE_CRM"
                ? "w-[440px] xl:w-[480px]"
                : "w-[340px] lg:w-[370px] xl:w-[400px]"
            }`}
          >
            <AudienceChatPanel
              chatMessages={chatMessages}
              audienceList={audienceList}
              topSupporters={topSupporters}
              onSendMessage={onSendMessage}
              onPinMessage={onPinMessage}
              onDeleteMessage={onDeleteMessage}
              onMuteUser={onMuteUser}
              onTimeoutUser={onTimeoutUser}
              onBanUser={onBanUser}
              onBroadcastShoutout={onBroadcastShoutout}
              onSelectAudienceMember={onSelectAudienceMember}
            />
          </aside>
        )}

        {/* PANEL 2 (CENTER): STUDIO CANVAS, HARDWARE PREVIEW & INTERACTION QUEUE */}
        <section
          aria-label="Studio Center Stage"
          className="flex-1 min-w-[400px] h-full overflow-hidden bg-black flex flex-col"
        >
          <CenterStudioCanvas
            videoPreviewRef={videoPreviewRef}
            isCameraActive={isCameraActive}
            isMicActive={isMicActive}
            audioMeterLevel={audioMeterLevel}
            moderationRules={moderationRules}
            interactionQueue={interactionQueue}
            activeGoal={activeGoal}
            purchaseLedger={purchaseLedger}
            isConfettiActive={isConfettiActive}
            onToggleCamera={onToggleCamera}
            onToggleMic={onToggleMic}
            onAcceptQueueItem={onAcceptQueueItem}
            onStartProgressQueueItem={onStartProgressQueueItem}
            onCompleteQueueItem={onCompleteQueueItem}
            onRejectQueueItem={onRejectQueueItem}
            onCancelQueueItem={onCancelQueueItem}
            onRefundQueueItem={onRefundQueueItem}
            onSkipQueueItem={onSkipQueueItem}
            onOpenEditGoal={onOpenEditGoal}
            onTriggerGoalCelebration={onTriggerGoalCelebration}
          />
        </section>

        {/* PANEL 3 (RIGHT): MARKETPLACE CONTROLS & SURGE PRICING */}
        {isRightPanelVisible && (
          <aside
            aria-label="Creator Marketplace Panel"
            className="w-[340px] lg:w-[370px] xl:w-[400px] h-full shrink-0 border-l border-zinc-800/80 bg-zinc-950 flex flex-col"
          >
            <MarketplaceControlsPanel
              marketplaceItems={marketplaceItems}
              surgeMultiplier={surgeMultiplier}
              onApplySurgeMultiplier={onApplySurgeMultiplier}
              onOpenAddModal={onOpenAddModal}
              onUpdatePrice={onUpdatePrice}
              onToggleItemEnabled={onToggleItemEnabled}
              onSetQuantity={onSetQuantity}
              onSetDuration={onSetDuration}
              onSetEligibility={onSetEligibility}
              onDeleteItem={onDeleteItem}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
