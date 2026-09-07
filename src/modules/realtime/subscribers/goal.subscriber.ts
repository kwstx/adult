/**
 * Goal Engine Subscriber
 *
 * Listens for authoritative contributions (Gifts) and updates active stream goals.
 *
 * Responsibilities:
 * - Computes progress, percentage, and remaining credits
 * - Emits `GOAL_PROGRESS` event to the live room
 * - Automatically triggers and publishes `GOAL_COMPLETED` when the target is reached
 */

import { eventBus } from "../event-bus";
import {
  DomainEvent,
  GiftSentPayload,
  GoalProgressPayload,
  GoalCompletedPayload,
} from "../types";

export interface StreamGoalState {
  goalId: string;
  creatorId: string;
  title: string;
  target: number;
  progress: number;
  isCompleted: boolean;
  contributorCount: number;
  topContributors: Map<string, { userId: string; displayName: string; amount: number }>;
}

export class GoalSubscriber {
  private static registered = false;
  private static goalStore: Map<string, StreamGoalState> = new Map();

  public static register(): void {
    if (this.registered) return;
    this.registered = true;

    // 1. React to GIFT_SENT
    eventBus.on<GiftSentPayload>("GIFT_SENT", (event) => {
      this.handleGiftSent(event);
    });
  }

  private static handleGiftSent(event: DomainEvent<GiftSentPayload>): void {
    const { creatorId, sender, gift } = event.payload;
    const goal = this.getOrCreateGoal(creatorId);

    const prevProgress = goal.progress;
    const addedCredits = gift.creditAmount;
    goal.progress += addedCredits;

    // Track contributor
    const currentContrib = goal.topContributors.get(sender.userId) || {
      userId: sender.userId,
      displayName: sender.displayName,
      amount: 0,
    };
    currentContrib.amount += addedCredits;
    goal.topContributors.set(sender.userId, currentContrib);
    goal.contributorCount = goal.topContributors.size;

    const percentage = Math.min(100, Math.round((goal.progress / goal.target) * 100));
    const isNowCompleted = goal.progress >= goal.target;
    const justCompleted = !goal.isCompleted && isNowCompleted;

    if (isNowCompleted) {
      goal.isCompleted = true;
    }

    const roomChannel = `room:${creatorId}`;

    // 1. Publish authoritative GOAL_PROGRESS
    const progressPayload: GoalProgressPayload = {
      goalId: goal.goalId,
      creatorId,
      title: goal.title,
      target: goal.target,
      progress: goal.progress,
      percentage,
      remaining: Math.max(0, goal.target - goal.progress),
      deltaCredits: addedCredits,
      isCompleted: goal.isCompleted,
      contributor: {
        userId: sender.userId,
        displayName: sender.displayName,
        avatarUrl: sender.avatarUrl,
        fanLevel: sender.fanLevel,
        amount: addedCredits,
      },
      milestoneTriggered: justCompleted ? "GOAL_REACHED" : undefined,
      updatedAt: new Date().toISOString(),
    };

    eventBus.publish(roomChannel, {
      id: `goal_prog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: "GOAL_PROGRESS",
      channel: roomChannel,
      timestamp: Date.now(),
      payload: progressPayload,
      metadata: {
        source: "goal_subscriber",
        version: "1.0.0",
        causationId: event.id,
      },
    });

    // 2. If completed on this gift, publish authoritative GOAL_COMPLETED
    if (justCompleted) {
      const topList = Array.from(goal.topContributors.values())
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)
        .map((c, index) => ({
          userId: c.userId,
          fanId: c.userId,
          displayName: c.displayName,
          username: c.displayName.toLowerCase().replace(/\s+/g, ""),
          amountContributed: c.amount,
          rank: index + 1,
        }));

      const completedPayload: GoalCompletedPayload = {
        goalId: goal.goalId,
        creatorId,
        title: goal.title,
        target: goal.target,
        finalProgress: goal.progress,
        contributorCount: goal.contributorCount,
        completedAt: new Date().toISOString(),
        unlock: {
          type: "SPECIAL_EXPERIENCE",
          title: "Unlocked: VIP Celebration Show & Exclusive Media",
          description: `Goal "${goal.title}" target of ${goal.target} credits achieved!`,
        },
        topContributors: topList,
        celebrationTheme: "GOLDEN_CHAMPION",
      };

      eventBus.publish(roomChannel, {
        id: `goal_comp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: "GOAL_COMPLETED",
        channel: roomChannel,
        timestamp: Date.now(),
        payload: completedPayload,
        metadata: {
          source: "goal_subscriber",
          version: "1.0.0",
          causationId: event.id,
        },
      });
    }
  }

  public static setGoal(creatorId: string, title: string, target: number, initialProgress = 0): void {
    this.goalStore.set(creatorId, {
      goalId: `goal_${creatorId}`,
      creatorId,
      title,
      target,
      progress: initialProgress,
      isCompleted: initialProgress >= target,
      contributorCount: 0,
      topContributors: new Map(),
    });
  }

  public static getGoal(creatorId: string): StreamGoalState {
    return this.getOrCreateGoal(creatorId);
  }

  private static getOrCreateGoal(creatorId: string): StreamGoalState {
    if (!this.goalStore.has(creatorId)) {
      this.goalStore.set(creatorId, {
        goalId: `goal_${creatorId}`,
        creatorId,
        title: "Community Stream Milestone",
        target: 1000,
        progress: 0,
        isCompleted: false,
        contributorCount: 0,
        topContributors: new Map(),
      });
    }
    return this.goalStore.get(creatorId)!;
  }

  public static resetForTesting(): void {
    this.registered = false;
    this.goalStore.clear();
  }
}
