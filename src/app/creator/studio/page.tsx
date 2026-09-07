"use client";

import React, { useState } from "react";
import { useCreatorControlRoom } from "@/hooks/useCreatorControlRoom";
import { ControlRoomHeader } from "@/components/creator-control-room/ControlRoomHeader";
import { AudienceChatPanel } from "@/components/creator-control-room/AudienceChatPanel";
import { CenterStudioCanvas } from "@/components/creator-control-room/CenterStudioCanvas";
import { MarketplaceControlsPanel } from "@/components/creator-control-room/MarketplaceControlsPanel";
import { ControlRoomBottomBar } from "@/components/creator-control-room/ControlRoomBottomBar";
import { DesktopCreatorMultiPanelStudio } from "@/components/creator-control-room/DesktopCreatorMultiPanelStudio";

// Modals & Drawers
import { AddInteractionDrawer } from "@/components/creator-control-room/drawers/AddInteractionDrawer";
import { EditGoalModal } from "@/components/creator-control-room/modals/EditGoalModal";
import { ModerationCenterModal } from "@/components/creator-control-room/modals/ModerationCenterModal";
import { OBSCredentialsModal } from "@/components/creator-control-room/modals/OBSCredentialsModal";
import { FanProfileCRMDrawer } from "@/components/creator-control-room/modals/FanProfileCRMDrawer";

/**
 * ============================================================================
 * THE CREATOR CONTROL ROOM
 * Authoritative Master Command Center for Live Broadcast Orchestration,
 * Real-time Interaction Marketplace, Fan CRM, and Moderation.
 * ============================================================================
 */
export default function CreatorStudioPage() {
  const {
    // 1. Telemetry
    telemetry,

    // 2. Hardware & Media
    videoPreviewRef,
    isCameraActive,
    isMicActive,
    audioMeterLevel,
    ingestCredentials,
    onToggleCamera,
    onToggleMic,

    // 3. Left Region (Audience & Chat)
    chatMessages,
    audienceList,
    topSupporters,
    selectedAudienceMember,
    setSelectedAudienceMember,
    onSendChatMessage,
    onPinMessage,
    onDeleteMessage,
    onMuteUser,
    onTimeoutUser,
    onBanUser,
    onBroadcastShoutout,

    // 4. Center Region (Queue, Goal, Ledger)
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
    onUpdateGoal,
    onTriggerGoalCelebration,

    // 5. Right Region (Marketplace)
    marketplaceItems,
    surgeMultiplier,
    onApplySurgeMultiplier,
    onAddMarketplaceItem,
    onUpdatePrice,
    onToggleItemEnabled,
    onSetQuantity,
    onSetDuration,
    onSetEligibility,
    onDeleteItem,

    // 6. Bottom Region (Moderation & Broadcast)
    moderationRules,
    setModerationRules,
    onToggleBroadcast,
    onTogglePanicBlackout,

    // 7. Simulation Suite
    onSimulateTip,
  } = useCreatorControlRoom();

  // Modal State
  const [isAddInteractionOpen, setIsAddInteractionOpen] = useState(false);
  const [isEditGoalOpen, setIsEditGoalOpen] = useState(false);
  const [isModerationModalOpen, setIsModerationModalOpen] = useState(false);
  const [isOBSModalOpen, setIsOBSModalOpen] = useState(false);

  return (
    <main className="flex flex-col h-[calc(100vh-3.5rem)] lg:h-screen w-full bg-black text-white overflow-hidden select-none">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP REGION: LIVE TELEMETRY & STATUS HUD                   */}
      {/* ------------------------------------------------------------- */}
      <ControlRoomHeader
        telemetry={telemetry}
        activeGoal={activeGoal}
        onSimulateTip={onSimulateTip}
        onOpenEditGoal={() => setIsEditGoalOpen(true)}
      />

      {/* ------------------------------------------------------------- */}
      {/* 2. DESKTOP SIMULTANEOUS MULTI-PANEL STUDIO (>= lg)            */}
      {/* ------------------------------------------------------------- */}
      <div className="hidden lg:flex flex-1 min-h-0 w-full overflow-hidden">
        <DesktopCreatorMultiPanelStudio
          telemetry={telemetry}
          videoPreviewRef={videoPreviewRef}
          isCameraActive={isCameraActive}
          isMicActive={isMicActive}
          audioMeterLevel={audioMeterLevel}
          moderationRules={moderationRules}
          onToggleCamera={onToggleCamera}
          onToggleMic={onToggleMic}
          chatMessages={chatMessages}
          audienceList={audienceList}
          topSupporters={topSupporters}
          selectedAudienceMember={selectedAudienceMember}
          onSendMessage={onSendChatMessage}
          onPinMessage={onPinMessage}
          onDeleteMessage={onDeleteMessage}
          onMuteUser={onMuteUser}
          onTimeoutUser={onTimeoutUser}
          onBanUser={onBanUser}
          onBroadcastShoutout={onBroadcastShoutout}
          onSelectAudienceMember={setSelectedAudienceMember}
          interactionQueue={interactionQueue}
          activeGoal={activeGoal}
          purchaseLedger={purchaseLedger}
          isConfettiActive={isConfettiActive}
          onAcceptQueueItem={onAcceptQueueItem}
          onStartProgressQueueItem={onStartProgressQueueItem}
          onCompleteQueueItem={onCompleteQueueItem}
          onRejectQueueItem={onRejectQueueItem}
          onCancelQueueItem={onCancelQueueItem}
          onRefundQueueItem={onRefundQueueItem}
          onSkipQueueItem={onSkipQueueItem}
          onOpenEditGoal={() => setIsEditGoalOpen(true)}
          onTriggerGoalCelebration={onTriggerGoalCelebration}
          marketplaceItems={marketplaceItems}
          surgeMultiplier={surgeMultiplier}
          onApplySurgeMultiplier={onApplySurgeMultiplier}
          onOpenAddModal={() => setIsAddInteractionOpen(true)}
          onUpdatePrice={onUpdatePrice}
          onToggleItemEnabled={onToggleItemEnabled}
          onSetQuantity={onSetQuantity}
          onSetDuration={onSetDuration}
          onSetEligibility={onSetEligibility}
          onDeleteItem={onDeleteItem}
        />
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. MOBILE / TABLET VERTICAL STACKED CANVAS (< lg)             */}
      {/* ------------------------------------------------------------- */}
      <div className="flex lg:hidden flex-1 flex-col min-h-0 w-full overflow-y-auto">
        {/* CENTER REGION: Live Preview, Queue, Active Goal, Purchases */}
        <div className="flex-1 min-w-0 h-[420px] shrink-0">
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
            onOpenEditGoal={() => setIsEditGoalOpen(true)}
            onTriggerGoalCelebration={onTriggerGoalCelebration}
          />
        </div>

        {/* LEFT REGION: Audience, Chat, Top Supporters, CRM */}
        <div className="w-full h-[360px] shrink-0 border-t border-zinc-800">
          <AudienceChatPanel
            chatMessages={chatMessages}
            audienceList={audienceList}
            topSupporters={topSupporters}
            onSendMessage={onSendChatMessage}
            onPinMessage={onPinMessage}
            onDeleteMessage={onDeleteMessage}
            onMuteUser={onMuteUser}
            onTimeoutUser={onTimeoutUser}
            onBanUser={onBanUser}
            onBroadcastShoutout={onBroadcastShoutout}
            onSelectAudienceMember={setSelectedAudienceMember}
          />
        </div>

        {/* RIGHT REGION: Interaction Marketplace & Surge Pricing */}
        <div className="w-full h-[360px] shrink-0 border-t border-zinc-800">
          <MarketplaceControlsPanel
            marketplaceItems={marketplaceItems}
            surgeMultiplier={surgeMultiplier}
            onApplySurgeMultiplier={onApplySurgeMultiplier}
            onOpenAddModal={() => setIsAddInteractionOpen(true)}
            onUpdatePrice={onUpdatePrice}
            onToggleItemEnabled={onToggleItemEnabled}
            onSetQuantity={onSetQuantity}
            onSetDuration={onSetDuration}
            onSetEligibility={onSetEligibility}
            onDeleteItem={onDeleteItem}
          />
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. BOTTOM REGION: BROADCAST & MODERATION CONSOLE              */}
      {/* ------------------------------------------------------------- */}
      <ControlRoomBottomBar
        isLive={telemetry.isLive}
        isCameraActive={isCameraActive}
        isMicActive={isMicActive}
        moderationRules={moderationRules}
        setModerationRules={setModerationRules}
        onToggleBroadcast={onToggleBroadcast}
        onTogglePanicBlackout={onTogglePanicBlackout}
        onToggleCamera={onToggleCamera}
        onToggleMic={onToggleMic}
        onOpenModerationModal={() => setIsModerationModalOpen(true)}
        onOpenOBSModal={() => setIsOBSModalOpen(true)}
      />

      {/* ------------------------------------------------------------- */}
      {/* 4. MODALS & SLIDE-OUT DRAWERS                                 */}
      {/* ------------------------------------------------------------- */}
      <AddInteractionDrawer
        isOpen={isAddInteractionOpen}
        onClose={() => setIsAddInteractionOpen(false)}
        creatorId="creator_maya"
        onInteractionPublished={(interaction) => {
          onAddMarketplaceItem({
            title: interaction.name,
            description: interaction.description,
            category: (interaction.type === "QUESTION" ? "Question" : interaction.type === "ACTIVITY" ? "Activity" : interaction.type === "CHALLENGE" ? "Challenge" : interaction.type === "PRIORITY_INTERACTION" ? "Priority" : "Custom") as any,
            priceTokens: interaction.price,
            basePriceTokens: interaction.price,
            durationSeconds: interaction.duration,
            maxQuantityPerStream: interaction.quantity,
            remainingQuantity: interaction.remainingQuantity,
            eligibility: interaction.whoCanPurchase,
            isEnabled: interaction.isActive,
            icon: interaction.icon,
          });
        }}
      />

      <EditGoalModal
        isOpen={isEditGoalOpen}
        onClose={() => setIsEditGoalOpen(false)}
        goal={activeGoal}
        onUpdate={onUpdateGoal}
      />

      <ModerationCenterModal
        isOpen={isModerationModalOpen}
        onClose={() => setIsModerationModalOpen(false)}
        moderationRules={moderationRules}
        setModerationRules={setModerationRules}
        audienceList={audienceList}
        onMuteUser={onMuteUser}
        onBanUser={onBanUser}
      />

      <OBSCredentialsModal
        isOpen={isOBSModalOpen}
        onClose={() => setIsOBSModalOpen(false)}
        credentials={ingestCredentials}
      />

      <FanProfileCRMDrawer
        isOpen={!!selectedAudienceMember}
        onClose={() => setSelectedAudienceMember(null)}
        member={selectedAudienceMember}
        onMuteUser={onMuteUser}
        onBanUser={onBanUser}
        onBroadcastShoutout={onBroadcastShoutout}
      />
    </main>
  );
}
