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

export const FAN_STATUS_STYLES: Record<FanStatusTier, FanStatusBadgeStyle> = {
  SUPPORTER: {
    tier: "SUPPORTER",
    label: "🔥 Supporter",
    shortLabel: "Supporter",
    symbol: "🔥",
    textColor: "text-amber-300",
    bgClass: "bg-amber-500/10 hover:bg-amber-500/15",
    borderClass: "border-amber-500/30",
    glowClass: "shadow-[0_0_12px_rgba(245,158,11,0.15)]",
    accentColor: "#F59E0B",
    gradientClass: "from-amber-500/20 via-orange-500/10 to-transparent",
    description: "Active supporter who frequently contributes to live streams.",
  },
  VIP: {
    tier: "VIP",
    label: "💎 VIP",
    shortLabel: "VIP",
    symbol: "💎",
    textColor: "text-cyan-300",
    bgClass: "bg-cyan-500/10 hover:bg-cyan-500/15",
    borderClass: "border-cyan-500/30",
    glowClass: "shadow-[0_0_14px_rgba(6,182,212,0.2)]",
    accentColor: "#06B6D4",
    gradientClass: "from-cyan-500/20 via-blue-500/10 to-transparent",
    description: "Distinguished devotee with priority chat and stage box access.",
  },
  INNER_CIRCLE: {
    tier: "INNER_CIRCLE",
    label: "👑 Inner Circle",
    shortLabel: "Inner Circle",
    symbol: "👑",
    textColor: "text-rose-200",
    bgClass: "bg-gradient-to-r from-rose-500/15 via-purple-500/10 to-amber-500/15 hover:from-rose-500/20",
    borderClass: "border-rose-400/40",
    glowClass: "shadow-[0_0_18px_rgba(244,63,94,0.25)]",
    accentColor: "#F43F5E",
    gradientClass: "from-rose-500/25 via-purple-500/15 to-transparent",
    description: "Top-tier confidant & patron with direct backstage access.",
  },
  ELITE: {
    tier: "ELITE",
    label: "✨ Sovereign",
    shortLabel: "Sovereign",
    symbol: "✨",
    textColor: "text-yellow-200",
    bgClass: "bg-gradient-to-r from-amber-400/20 via-yellow-300/15 to-amber-600/20",
    borderClass: "border-yellow-400/50",
    glowClass: "shadow-[0_0_22px_rgba(234,179,8,0.3)]",
    accentColor: "#EAB308",
    gradientClass: "from-amber-400/30 via-yellow-400/20 to-transparent",
    description: "Sovereign patron immortalized in the room hall of fame.",
  },
  REGULAR: {
    tier: "REGULAR",
    label: "🌿 Regular",
    shortLabel: "Regular",
    symbol: "🌿",
    textColor: "text-emerald-300",
    bgClass: "bg-emerald-500/10 hover:bg-emerald-500/15",
    borderClass: "border-emerald-500/25",
    glowClass: "shadow-[0_0_10px_rgba(16,185,129,0.12)]",
    accentColor: "#10B981",
    gradientClass: "from-emerald-500/15 to-transparent",
    description: "Loyal regular with high stream attendance.",
  },
  NEW_FAN: {
    tier: "NEW_FAN",
    label: "🌱 Member",
    shortLabel: "Member",
    symbol: "🌱",
    textColor: "text-zinc-400",
    bgClass: "bg-white/[0.04] hover:bg-white/[0.07]",
    borderClass: "border-white/10",
    glowClass: "",
    accentColor: "#A1A1AA",
    gradientClass: "from-white/5 to-transparent",
    description: "Community participant.",
  },
};


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
