"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@/lib/user-context";
import { CollectiveGoalData, GoalUnlockDefinition } from "@/modules/goals/types";
import { GoalCompletedPayload, GoalContributionReceivedPayload, GoalUpdatedPayload } from "@/modules/realtime/types";

interface UseCollectiveGoalOptions {
  creatorId?: string;
  initialGoalId?: string;
  autoConnectSse?: boolean;
}

export function useCollectiveGoal({
  creatorId = "c1",
  initialGoalId,
  autoConnectSse = true,
}: UseCollectiveGoalOptions = {}) {
  const { currentUser, updateBalance } = useUser();

  const [goal, setGoal] = useState<CollectiveGoalData>({
    id: initialGoalId || "goal_midnight_default",
    creatorProfileId: creatorId,
    title: "MIDNIGHT GOAL",
    description: "Exclusive midnight milestone goal unlocked by community contributions.",
    rewardDescription: "“At 100,000 the special experience unlocks.”",
    targetCredits: 100000,
    currentCredits: 68500,
    contributorCount: 42,
    percentage: 68,
    remainingCredits: 31500,
    status: "ACTIVE",
    startedAt: new Date().toISOString(),
    unlock: {
      type: "SPECIAL_EXPERIENCE",
      title: "MIDNIGHT GOAL — Special Experience Unlocked!",
      description: "At 100,000 the special experience unlocks.",
      mediaUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1200&auto=format&fit=crop",
      actionLabel: "Enter Special Experience",
    },
    topContributors: [
      { fanId: "u_sarah", displayName: "Sarah Connor", username: "sarahc", amountContributed: 25000, rank: 1 },
      { fanId: "u_alex", displayName: "Alex Rivera", username: "alexr", amountContributed: 18500, rank: 2 },
      { fanId: "u_neo", displayName: "Cyber Knight", username: "neo99", amountContributed: 12000, rank: 3 },
    ],
    recentContributions: [],
  });

  // Animated visual progress states (eased interpolation)
  const [displayCredits, setDisplayCredits] = useState<number>(68500);
  const [displayPercentage, setDisplayPercentage] = useState<number>(68);
  const [isLoading, setIsLoading] = useState(false);
  const [isContributing, setIsContributing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Completed Unlock state
  const [completedPayload, setCompletedPayload] = useState<GoalCompletedPayload | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [recentCheer, setRecentCheer] = useState<{
    displayName: string;
    amount: number;
    message?: string | null;
  } | null>(null);

  // Animation frame ref for smooth numerical counting
  const animationRef = useRef<number | null>(null);
  const currentCreditsRef = useRef(displayCredits);

  // Number interpolation smoothing
  const animateToCredits = useCallback((targetValue: number, targetPercentage: number) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const startValue = currentCreditsRef.current;
    const diff = targetValue - startValue;
    if (diff === 0) {
      setDisplayCredits(targetValue);
      setDisplayPercentage(targetPercentage);
      return;
    }

    const duration = 1200; // ms
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + diff * easeOut);

      currentCreditsRef.current = current;
      setDisplayCredits(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(step);
      } else {
        currentCreditsRef.current = targetValue;
        setDisplayCredits(targetValue);
        setDisplayPercentage(targetPercentage);
      }
    };

    animationRef.current = requestAnimationFrame(step);
  }, []);

  // Fetch Authoritative Goal State
  const fetchGoal = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = initialGoalId
        ? `/api/goals/${initialGoalId}`
        : `/api/goals/active?creatorId=${creatorId}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Failed to load collective goal.");
      }
      const data: CollectiveGoalData = await res.json();
      setGoal(data);
      animateToCredits(data.currentCredits, data.percentage);

      if (data.status === "REACHED" && data.unlock) {
        setCompletedPayload({
          goalId: data.id,
          creatorId: data.creatorProfileId,
          title: data.title,
          target: data.targetCredits,
          finalProgress: data.currentCredits,
          contributorCount: data.contributorCount,
          completedAt: data.reachedAt || new Date().toISOString(),
          unlock: data.unlock,
          topContributors: data.topContributors || [],
        });
      }
    } catch (err: any) {
      console.warn("Could not hydrate goal, keeping default:", err.message);
    } finally {
      setIsLoading(false);
    }
  }, [creatorId, initialGoalId, animateToCredits]);

  useEffect(() => {
    fetchGoal();
  }, [fetchGoal]);

  // Real-time Event Subscription via SSE Stream
  useEffect(() => {
    if (!autoConnectSse || !creatorId) return;

    const eventSource = new EventSource(`/api/realtime/${creatorId}/sse`);

    eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);

        switch (event.type) {
          case "GOAL_UPDATED": {
            const payload = event.payload as GoalUpdatedPayload;
            setGoal((prev) => {
              const newGoal: CollectiveGoalData = {
                ...prev,
                title: payload.title || prev.title,
                targetCredits: payload.target,
                currentCredits: payload.progress,
                percentage: payload.percentage,
                remainingCredits: payload.remaining,
                contributorCount: payload.contributorCount ?? prev.contributorCount,
                status: payload.isCompleted ? "REACHED" : "ACTIVE",
              };
              return newGoal;
            });

            animateToCredits(payload.progress, payload.percentage);

            if (payload.recentContribution) {
              setRecentCheer({
                displayName: payload.recentContribution.fanName,
                amount: payload.recentContribution.amount,
                message: payload.recentContribution.message,
              });
              setTimeout(() => setRecentCheer(null), 5000);
            }
            break;
          }

          case "GOAL_CONTRIBUTION_RECEIVED": {
            const payload = event.payload as GoalContributionReceivedPayload;
            setRecentCheer({
              displayName: payload.contributor.displayName,
              amount: payload.amount,
              message: payload.message,
            });
            setTimeout(() => setRecentCheer(null), 5000);
            break;
          }

          case "GOAL_COMPLETED": {
            const payload = event.payload as GoalCompletedPayload;
            setGoal((prev) => ({
              ...prev,
              title: payload.title,
              targetCredits: payload.target,
              currentCredits: payload.finalProgress,
              percentage: 100,
              remainingCredits: 0,
              status: "REACHED",
              unlock: payload.unlock,
              topContributors: payload.topContributors,
            }));

            animateToCredits(payload.finalProgress, 100);
            setCompletedPayload(payload);
            setShowCelebration(true);
            break;
          }

          default:
            break;
        }
      } catch (err) {
        console.error("Goal SSE parse error:", err);
      }
    };

    return () => {
      eventSource.close();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [creatorId, autoConnectSse, animateToCredits]);

  // Execute Contribution Action
  const contribute = async (credits: number, message?: string, isAnonymous?: boolean): Promise<boolean> => {
    if (credits <= 0 || isContributing) return false;

    setIsContributing(true);
    setError(null);

    // Optimistic instant feedback
    const optimisticNewCredits = goal.currentCredits + credits;
    const optimisticPercent = Math.min(100, Math.round((optimisticNewCredits / goal.targetCredits) * 100));
    animateToCredits(optimisticNewCredits, optimisticPercent);

    try {
      const res = await fetch(`/api/goals/${goal.id}/contribute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fanUserId: currentUser.id,
          credits,
          message,
          isAnonymous,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        // Rollback on failure
        animateToCredits(goal.currentCredits, goal.percentage);
        throw new Error(data.error || "Failed to contribute to goal.");
      }

      // Authoritative synchronization
      setGoal(data.goal);
      animateToCredits(data.goal.currentCredits, data.goal.percentage);

      if (typeof data.fanRemainingBalance === "number") {
        updateBalance(data.fanRemainingBalance);
      }

      if (data.isThresholdCrossedThisTransaction || data.isCompleted) {
        if (data.unlockCreated) {
          setCompletedPayload({
            goalId: data.goal.id,
            creatorId: data.goal.creatorProfileId,
            title: data.goal.title,
            target: data.goal.targetCredits,
            finalProgress: data.goal.currentCredits,
            contributorCount: data.goal.contributorCount,
            completedAt: new Date().toISOString(),
            unlock: data.unlockCreated,
            topContributors: data.goal.topContributors || [],
          });
        }
        setShowCelebration(true);
      }

      return true;
    } catch (err: any) {
      setError(err.message || "Failed to complete contribution.");
      return false;
    } finally {
      setIsContributing(false);
    }
  };

  // Close celebration overlay
  const dismissCelebration = () => setShowCelebration(false);

  return {
    goal,
    displayCredits,
    displayPercentage,
    isLoading,
    isContributing,
    error,
    contribute,
    refreshGoal: fetchGoal,
    completedPayload,
    showCelebration,
    dismissCelebration,
    recentCheer,
  };
}
