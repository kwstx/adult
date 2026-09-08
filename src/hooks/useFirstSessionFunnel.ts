"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@/lib/user-context";
import type { FunnelMilestoneProgress, FunnelStatusResponse, FirstSessionRewardClaimResult } from "@/modules/funnel/types";

interface UseFirstSessionFunnelProps {
  userId?: string;
  currentCreatorId?: string;
  currentCreatorName?: string;
  onRewardClaimed?: (creditsAdded: number) => void;
}

export function useFirstSessionFunnel({
  userId,
  currentCreatorId,
  currentCreatorName,
  onRewardClaimed,
}: UseFirstSessionFunnelProps) {
  const { currentUser, updateBalance } = useUser();
  const effectiveUserId = userId || currentUser.id;

  // 1. Session tracking states
  const [watchSeconds, setWatchSeconds] = useState<number>(0);
  const [swipedCount, setSwipedCount] = useState<number>(0);
  const [hasFollowed, setHasFollowed] = useState<boolean>(false);
  const [hasOpenedMenu, setHasOpenedMenu] = useState<boolean>(false);
  const [isRewardClaimed, setIsRewardClaimed] = useState<boolean>(false);
  const [hasMadePurchase, setHasMadePurchase] = useState<boolean>(false);

  // 2. Modals and celebration triggers
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState<boolean>(false);
  const [isLevelUpModalOpen, setIsLevelUpModalOpen] = useState<boolean>(false);
  const [isReturnBannerVisible, setIsReturnBannerVisible] = useState<boolean>(false);
  const [levelUpPayload, setLevelUpPayload] = useState<any>(null);
  const [isClaiming, setIsClaiming] = useState<boolean>(false);

  // Prevent multiple popups
  const hasTriggeredWelcomeModal = useRef<boolean>(false);

  // 3. Watch Time Timer (Accumulates while component mounted)
  useEffect(() => {
    const timer = setInterval(() => {
      setWatchSeconds((prev) => {
        const next = prev + 1;
        // Check milestone threshold (25 seconds)
        if (next >= 25 && !isRewardClaimed && !hasTriggeredWelcomeModal.current) {
          hasTriggeredWelcomeModal.current = true;
          setIsWelcomeModalOpen(true);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRewardClaimed]);

  // 4. Initial status sync from backend
  useEffect(() => {
    if (!effectiveUserId) return;

    fetch(`/api/funnel/status?userId=${encodeURIComponent(effectiveUserId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: FunnelStatusResponse | null) => {
        if (data && data.milestones) {
          setIsRewardClaimed(data.milestones.isRewardClaimed);
          setHasMadePurchase(data.milestones.hasMadeFirstPurchase);
          if (data.milestones.isRewardClaimed) {
            hasTriggeredWelcomeModal.current = true;
          }
        }
      })
      .catch(() => {});
  }, [effectiveUserId]);

  // 5. Notify actions from feed
  const notifySwipe = useCallback(() => {
    setSwipedCount((prev) => {
      const next = prev + 1;
      // Record milestone to backend
      fetch("/api/funnel/milestone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: effectiveUserId,
          creatorProfileId: currentCreatorId,
          milestoneType: "SWIPE_STREAM",
          metadata: { swipeCount: next },
        }),
      }).catch(() => {});
      return next;
    });
  }, [effectiveUserId, currentCreatorId]);

  const notifyFollow = useCallback((isFollowing: boolean) => {
    setHasFollowed(isFollowing);
    if (isFollowing) {
      fetch("/api/funnel/milestone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: effectiveUserId,
          creatorProfileId: currentCreatorId,
          milestoneType: "FOLLOW_CREATOR",
        }),
      }).catch(() => {});

      // If user follows a creator, prompt welcome reward if not yet claimed
      if (!isRewardClaimed && !hasTriggeredWelcomeModal.current) {
        hasTriggeredWelcomeModal.current = true;
        setIsWelcomeModalOpen(true);
      }
    }
  }, [effectiveUserId, currentCreatorId, isRewardClaimed]);

  const notifyMenuOpened = useCallback(() => {
    setHasOpenedMenu(true);
    fetch("/api/funnel/milestone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: effectiveUserId,
        creatorProfileId: currentCreatorId,
        milestoneType: "OPEN_INTERACTION_MENU",
      }),
    }).catch(() => {});
  }, [effectiveUserId, currentCreatorId]);

  // 6. Claim Welcome Reward (+50 Bonus Tokens + 100 Platform XP)
  const claimWelcomeReward = useCallback(async () => {
    if (isClaiming || isRewardClaimed) return;
    setIsClaiming(true);

    try {
      const res = await fetch("/api/funnel/claim-reward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: effectiveUserId,
          creatorProfileId: currentCreatorId,
        }),
      });

      const data: FirstSessionRewardClaimResult = await res.json();
      if (res.ok && data.success) {
        setIsRewardClaimed(true);
        setIsWelcomeModalOpen(false);

        // Update local wallet context balance
        if (data.walletBalanceAfter !== undefined) {
          updateBalance(data.walletBalanceAfter);
        } else {
          updateBalance(currentUser.walletBalance + 50);
        }

        if (onRewardClaimed) {
          onRewardClaimed(data.grantedBonusCredits || 50);
        }
      }
    } catch (err) {
      console.error("[Funnel Hook] Failed to claim welcome reward:", err);
    } finally {
      setIsClaiming(false);
    }
  }, [effectiveUserId, currentCreatorId, isClaiming, isRewardClaimed, updateBalance, currentUser.walletBalance, onRewardClaimed]);

  // 7. Handle Tip / First Purchase Completed
  const handleTipSuccess = useCallback(
    (creditsSpent: number, relationshipProgression?: any) => {
      setHasMadePurchase(true);

      if (relationshipProgression) {
        setLevelUpPayload({
          ...relationshipProgression,
          creatorName: currentCreatorName || "Creator",
          creditsSpent,
        });

        // If level up or first purchase, display relationship level up modal
        if (relationshipProgression.didLevelUp || relationshipProgression.didTierUp || relationshipProgression.newLevel >= 2) {
          setIsLevelUpModalOpen(true);
        }
      } else {
        // Fallback celebration
        setLevelUpPayload({
          creatorName: currentCreatorName || "Creator",
          newLevel: 2,
          previousLevel: 1,
          newTier: "SUPPORTER",
          tierName: "Supporter",
          didLevelUp: true,
          totalXp: creditsSpent * 10,
          xpAwarded: creditsSpent * 10,
        });
        setIsLevelUpModalOpen(true);
      }

      // After celebrating level up, schedule return banner
      setTimeout(() => {
        setIsReturnBannerVisible(true);
      }, 5000);
    },
    [currentCreatorName]
  );

  // Derived Guide Step Text
  let currentGuideStep = 1;
  let guideMessage = `Watch live (${Math.min(watchSeconds, 25)}s / 25s)`;

  if (watchSeconds >= 25 && !isRewardClaimed) {
    currentGuideStep = 2;
    guideMessage = "🎁 50 Free Tokens Unlocked! Tap to Claim";
  } else if (isRewardClaimed && !hasMadePurchase) {
    currentGuideStep = 3;
    guideMessage = "🎁 Send your 50 free tokens (Press G / Gift)";
  } else if (hasMadePurchase) {
    currentGuideStep = 4;
    guideMessage = "🔥 Day 1 Streak Active! Return tomorrow for Day 2";
  } else if (swipedCount === 0) {
    currentGuideStep = 2;
    guideMessage = "Swipe up for next creator ➔";
  }

  return {
    // State metrics
    watchSeconds,
    swipedCount,
    hasFollowed,
    hasOpenedMenu,
    isRewardClaimed,
    hasMadePurchase,
    isClaiming,

    // Step guidance
    currentGuideStep,
    guideMessage,

    // Modals
    isWelcomeModalOpen,
    setIsWelcomeModalOpen,
    isLevelUpModalOpen,
    setIsLevelUpModalOpen,
    isReturnBannerVisible,
    setIsReturnBannerVisible,
    levelUpPayload,

    // Actions
    notifySwipe,
    notifyFollow,
    notifyMenuOpened,
    claimWelcomeReward,
    handleTipSuccess,
  };
}
