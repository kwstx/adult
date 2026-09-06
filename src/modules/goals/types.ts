import { GoalStatus } from "@prisma/client";

export type GoalUnlockType =
  | "SPECIAL_EXPERIENCE"
  | "PPV_UNLOCKED"
  | "VIP_MODE"
  | "BONUS_INTERACTION"
  | "CUSTOM_REWARD";

export interface GoalUnlockDefinition {
  type: GoalUnlockType;
  title: string;
  description: string;
  mediaUrl?: string | null;
  actionLabel?: string;
  actionPayload?: Record<string, unknown>;
}

export interface CollectiveGoalData {
  id: string;
  creatorProfileId: string;
  creatorDisplayName?: string;
  creatorUsername?: string;
  creatorAvatarUrl?: string | null;
  livestreamId?: string | null;
  title: string;
  description?: string | null;
  rewardDescription?: string | null;
  targetCredits: number;
  currentCredits: number;
  contributorCount: number;
  percentage: number;
  remainingCredits: number;
  status: GoalStatus;
  startedAt: string;
  endsAt?: string | null;
  reachedAt?: string | null;
  unlock?: GoalUnlockDefinition | null;
  topContributors?: Array<{
    fanId: string;
    displayName: string;
    username: string;
    avatarUrl?: string | null;
    amountContributed: number;
    rank: number;
  }>;
  recentContributions?: Array<{
    id: string;
    fanId: string;
    displayName: string;
    amountCredits: number;
    message?: string | null;
    createdAt: string;
  }>;
}

export interface ContributeToGoalInput {
  fanUserId: string;
  goalId: string;
  credits: number;
  message?: string;
  isAnonymous?: boolean;
  idempotencyKey?: string;
}

export interface ContributeToGoalResult {
  success: boolean;
  goal: CollectiveGoalData;
  contribution: {
    id: string;
    amountCredits: number;
    message?: string | null;
    isAnonymous: boolean;
    createdAt: string;
  };
  isCompleted: boolean;
  isThresholdCrossedThisTransaction: boolean;
  unlockCreated?: GoalUnlockDefinition | null;
  fanRemainingBalance: number;
  ledgerTransactionId: string;
  eventId: string;
}

export interface CreateCollectiveGoalInput {
  creatorProfileId: string;
  livestreamId?: string;
  title: string;
  description?: string;
  rewardDescription?: string;
  targetCredits: number;
  initialCredits?: number;
  unlockType?: GoalUnlockType;
  unlockTitle?: string;
  unlockDescription?: string;
  unlockMediaUrl?: string;
  endsAt?: Date;
}
