/**
 * Animation System - Authoritative Domain Types & Event Payloads
 * 
 * Defines strongly-typed animation events, queue priorities, and visual presets.
 * Principles:
 * - Animations communicate authoritative domain events (no fabricated rewards).
 * - High-impact animations are reserved for meaningful milestones (major gifts, level-ups, 100% goals, VIP arrivals).
 * - Ordinary navigation remains instant (0ms delay).
 */

import { GiftTier } from "@/modules/realtime/types";
import { FanStatusTier } from "@/types/fan-status";

export type AnimationPriority = "CRITICAL" | "HIGH" | "NORMAL" | "SUBTLE";

export type AnimationEventType =
  | "MAJOR_GIFT"
  | "RELATIONSHIP_LEVEL_UP"
  | "GOAL_100_METAMORPHOSIS"
  | "VIP_ENTRANCE";

// ----------------------------------------------------------------------------
// 1. Major Gift Animation Payload
// ----------------------------------------------------------------------------
export interface MajorGiftAnimationPayload {
  id: string;
  creatorId: string;
  sender: {
    userId: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    badge?: string | null;
    fanLevel: number;
  };
  gift: {
    id: string;
    name: string;
    icon: string;
    creditAmount: number;
    tier: GiftTier; // "MEDIUM" (100-499) | "LEGENDARY" (>=500)
    customMessage?: string;
  };
  creatorEarningsDelta?: {
    grossCredits: number;
    netCredits: number;
    platformRakeCredits: number;
  };
  visualPreset?: "CONFETTI_BURST" | "DIAMOND_SHOCKWAVE" | "GOLDEN_METEOR" | "COSMIC_FLAME";
  durationMs?: number;
}

// ----------------------------------------------------------------------------
// 2. Relationship Level-Up Animation Payload
// ----------------------------------------------------------------------------
export interface RelationshipLevelUpAnimationPayload {
  id: string;
  creatorId: string;
  creatorDisplayName?: string;
  creatorAvatarUrl?: string;
  fanUserId: string;
  fanDisplayName: string;
  fanUsername?: string;
  fanAvatarUrl?: string;
  previousLevel: number;
  newLevel: number;
  previousTier: string;
  newTier: string;
  tierCode: FanStatusTier | string;
  didTierAscend: boolean;
  badgeColor?: string;
  gradientClass?: string;
  xpAwarded: number;
  totalXp: number;
  unlockedPerks?: Array<{
    id: string;
    title: string;
    description: string;
  }>;
  ledgerProofId?: string;
  durationMs?: number;
}

// ----------------------------------------------------------------------------
// 3. Goal 100% Metamorphosis Animation Payload
// ----------------------------------------------------------------------------
export interface GoalMetamorphosisAnimationPayload {
  id: string;
  goalId: string;
  creatorId: string;
  title: string;
  targetCredits: number;
  finalCredits: number;
  contributorCount: number;
  completedAt: string;
  unlock: {
    type: "SPECIAL_EXPERIENCE" | "PPV_UNLOCKED" | "VIP_MODE" | "BONUS_INTERACTION" | "CUSTOM_REWARD";
    title: string;
    description: string;
    mediaUrl?: string | null;
    actionLabel?: string;
    actionPayload?: Record<string, unknown>;
  };
  topContributors?: Array<{
    fanId: string;
    displayName: string;
    username: string;
    avatarUrl?: string | null;
    amountContributed: number;
    rank: number;
  }>;
  celebrationTheme?: "MIDNIGHT_NEON" | "GOLDEN_CHAMPION" | "CYBER_FIRE";
  durationMs?: number;
}

// ----------------------------------------------------------------------------
// 4. VIP Room Entrance Acknowledgment Payload
// ----------------------------------------------------------------------------
export interface VipEntranceAnimationPayload {
  id: string;
  roomId: string;
  creatorId: string;
  user: {
    userId: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    badge?: string | null;
    fanLevel?: number;
    seatTier?: "STANDARD_VIEWER" | "FRONT_ROW" | "VIP" | "INNER_CIRCLE" | "CREATOR_SELECTED_GUEST" | null;
    vipTierCode?: "VIP" | "INNER_CIRCLE" | "ROYAL" | "CHAMPION" | string;
  };
  entranceTitle?: string; // e.g. "💎 VIP Maria entered the room"
  joinedAt: string;
  durationMs?: number;
}

// ----------------------------------------------------------------------------
// Unified Queue Item
// ----------------------------------------------------------------------------
export type AnimationQueueItem =
  | { type: "MAJOR_GIFT"; priority: "CRITICAL" | "HIGH"; payload: MajorGiftAnimationPayload; createdAt: number }
  | { type: "RELATIONSHIP_LEVEL_UP"; priority: "HIGH" | "NORMAL"; payload: RelationshipLevelUpAnimationPayload; createdAt: number }
  | { type: "GOAL_100_METAMORPHOSIS"; priority: "CRITICAL"; payload: GoalMetamorphosisAnimationPayload; createdAt: number }
  | { type: "VIP_ENTRANCE"; priority: "NORMAL" | "SUBTLE"; payload: VipEntranceAnimationPayload; createdAt: number };

// Sound synthesis options for celebratory cues
export interface SynthesizedChimeConfig {
  freqs: number[];
  type?: OscillatorType;
  durationSec?: number;
  gain?: number;
}
