"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { animationBus } from "./animation-bus";
import {
  AnimationQueueItem,
  MajorGiftAnimationPayload,
  RelationshipLevelUpAnimationPayload,
  GoalMetamorphosisAnimationPayload,
  VipEntranceAnimationPayload,
} from "./types";
import { MajorGiftOverlay } from "@/components/animation/MajorGiftOverlay";
import { VipEntranceOverlay } from "@/components/animation/VipEntranceOverlay";
import { LevelUpCelebrationModal } from "@/components/xp/LevelUpCelebrationModal";

interface AnimationContextValue {
  activeItem: AnimationQueueItem | null;
  triggerMajorGift: (payload: MajorGiftAnimationPayload) => void;
  triggerRelationshipLevelUp: (payload: RelationshipLevelUpAnimationPayload) => void;
  triggerGoalMetamorphosis: (payload: GoalMetamorphosisAnimationPayload) => void;
  triggerVipEntrance: (payload: VipEntranceAnimationPayload) => void;
  dismissCurrent: () => void;
  setSoundEnabled: (enabled: boolean) => void;
}

const AnimationContext = createContext<AnimationContextValue | null>(null);

export function AnimationProvider({
  children,
  currentUserId,
  isCreator = false,
}: {
  children: React.ReactNode;
  currentUserId?: string;
  isCreator?: boolean;
}) {
  const [activeItem, setActiveItem] = useState<AnimationQueueItem | null>(null);

  useEffect(() => {
    const unsubscribe = animationBus.subscribe((item) => {
      setActiveItem(item);
    });
    return () => unsubscribe();
  }, []);

  const triggerMajorGift = useCallback((payload: MajorGiftAnimationPayload) => {
    animationBus.triggerMajorGift(payload);
  }, []);

  const triggerRelationshipLevelUp = useCallback((payload: RelationshipLevelUpAnimationPayload) => {
    animationBus.triggerRelationshipLevelUp(payload);
  }, []);

  const triggerGoalMetamorphosis = useCallback((payload: GoalMetamorphosisAnimationPayload) => {
    animationBus.triggerGoalMetamorphosis(payload);
  }, []);

  const triggerVipEntrance = useCallback((payload: VipEntranceAnimationPayload) => {
    animationBus.triggerVipEntrance(payload);
  }, []);

  const dismissCurrent = useCallback(() => {
    animationBus.dismissCurrent();
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    animationBus.setSoundEnabled(enabled);
  }, []);

  return (
    <AnimationContext.Provider
      value={{
        activeItem,
        triggerMajorGift,
        triggerRelationshipLevelUp,
        triggerGoalMetamorphosis,
        triggerVipEntrance,
        dismissCurrent,
        setSoundEnabled,
      }}
    >
      {children}

      {/* Global Event-Driven Animation Layer */}
      {activeItem?.type === "MAJOR_GIFT" && (
        <MajorGiftOverlay
          payload={activeItem.payload}
          currentUserId={currentUserId}
          isCreator={isCreator}
          onDismiss={dismissCurrent}
        />
      )}

      {activeItem?.type === "VIP_ENTRANCE" && (
        <VipEntranceOverlay
          payload={activeItem.payload}
          onDismiss={dismissCurrent}
        />
      )}

      {activeItem?.type === "RELATIONSHIP_LEVEL_UP" && (
        <LevelUpCelebrationModal
          payload={{
            fanUserId: activeItem.payload.fanUserId,
            fanDisplayName: activeItem.payload.fanDisplayName,
            fanAvatarUrl: activeItem.payload.fanAvatarUrl || "",
            creatorProfileId: activeItem.payload.creatorId,
            creatorStageName: activeItem.payload.creatorDisplayName || "Creator",
            creatorAvatarUrl: activeItem.payload.creatorAvatarUrl || "",
            previousLevel: activeItem.payload.previousLevel,
            newLevel: activeItem.payload.newLevel,
            previousTier: activeItem.payload.previousTier,
            newTierName: activeItem.payload.newTier,
            didTierUp: activeItem.payload.didTierAscend,
            badgeColor: activeItem.payload.badgeColor || "#F59E0B",
            gradientClass: activeItem.payload.gradientClass || "from-amber-400 to-pink-500",
            xpAwarded: activeItem.payload.xpAwarded,
            totalXp: activeItem.payload.totalXp,
            coBrandTitle: `${activeItem.payload.fanDisplayName} × ${activeItem.payload.creatorDisplayName || "Creator"}`,
            sourceEventType: "TIER_ASCENSION",
            ledgerProofId: activeItem.payload.ledgerProofId || `PROOF-${Date.now()}`,
            unlockedPerks: activeItem.payload.unlockedPerks || [],
          }}
          onClose={dismissCurrent}
        />
      )}
    </AnimationContext.Provider>
  );
}

export function useAnimationSystem() {
  const ctx = useContext(AnimationContext);
  if (!ctx) {
    // Return safe fallback if not wrapped in provider
    return {
      activeItem: null,
      triggerMajorGift: (p: MajorGiftAnimationPayload) => animationBus.triggerMajorGift(p),
      triggerRelationshipLevelUp: (p: RelationshipLevelUpAnimationPayload) => animationBus.triggerRelationshipLevelUp(p),
      triggerGoalMetamorphosis: (p: GoalMetamorphosisAnimationPayload) => animationBus.triggerGoalMetamorphosis(p),
      triggerVipEntrance: (p: VipEntranceAnimationPayload) => animationBus.triggerVipEntrance(p),
      dismissCurrent: () => animationBus.dismissCurrent(),
      setSoundEnabled: (e: boolean) => animationBus.setSoundEnabled(e),
    };
  }
  return ctx;
}
