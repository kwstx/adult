// ============================================================================
// FAN STATUS TYPE DEFINITIONS & SCHEMAS
// Role-Asymmetric, Social Visibility for High-Value Live Room Relationships
// ============================================================================

export type FanStatusTier =
  | "NEW_FAN"
  | "SUPPORTER"
  | "REGULAR"
  | "VIP"
  | "INNER_CIRCLE"
  | "ELITE";

export interface FanStatusBadgeStyle {
  tier: FanStatusTier;
  label: string;          // e.g. "🔥 Supporter", "💎 VIP", "👑 Inner Circle"
  shortLabel: string;     // e.g. "Supporter", "VIP", "Inner Circle"
  symbol: string;         // e.g. "🔥", "💎", "👑"
  textColor: string;      // Tailwind text color class
  bgClass: string;        // Tailwind background class
  borderClass: string;    // Tailwind border class
  glowClass: string;      // Tailwind shadow / glow class
  accentColor: string;    // Hex color code for canvas or SVGs
  gradientClass: string;  // Subtle gradient class
  description: string;    // Elegantly phrased tier description
}

/**
 * 1. PUBLIC VIEWER VIEW:
 * What other viewers in the live room can see.
 * Creates social prestige without leaking financial specifics or private notes.
 */
export interface FanPublicStatus {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  tier: FanStatusTier;
  tierLabel: string;       // e.g. "Supporter"
  tierSymbol: string;      // e.g. "🔥"
  fullBadge: string;       // e.g. "🔥 Supporter"
  fanLevel: number;        // e.g. 8
  isVip: boolean;
  isSubscribed: boolean;
  isModerator: boolean;
  streakDays?: number;     // e.g. 14 (Discreet loyalty milestone)
  memberSince?: string;    // e.g. "June 2025"
  bio?: string;
  topPerkHighlight?: string; // e.g. "Stage Seat VIP Access"
  respectCount?: number;   // In-room social cheer count
}

/**
 * 2. CREATOR CRM VIEW:
 * What the creator sees when inspecting a fan.
 * Rich relationship intelligence, lifetime value, notes, and moderation tools.
 */
export interface FanCreatorDossier extends FanPublicStatus {
  creatorProfileId: string;
  totalTokensSpentSession: number;
  totalTokensSpentLifetime: number;
  sessionWatchMinutes: number;
  lifetimeWatchMinutes: number;
  currentStreakDays: number;
  longestStreakDays: number;
  lastInteractedAt: string;
  customNotes?: string;
  relationshipProgressPercent: number; // 0 to 100 towards next tier
  unlockedPerks: string[];
  isMuted: boolean;
  isBanned: boolean;
  fiatValueEstimatedSessionUsd: number;
  fiatValueEstimatedLifetimeUsd: number;
}

/**
 * 3. SELF VIEW:
 * What the fan sees about their own progression with this specific creator.
 */
export interface FanSelfStatus extends FanPublicStatus {
  totalXp: number;
  xpInCurrentTier: number;
  xpRequiredForNextTier: number;
  progressPercent: number;
  xpRemainingToNextTier: number;
  nextTierName: string | null;
  nextTierSymbol: string | null;
  unlockedPerks: string[];
  nextTierPerks: string[];
}
