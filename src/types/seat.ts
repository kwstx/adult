// ============================================================================
// VIRTUAL ROOM SEATS & SOCIAL POSITIONS DOMAIN TYPES
// Authoritative definitions for audience proximity, social tiers & chat styling
// ============================================================================

export type SocialSeatTier =
  | "STANDARD_VIEWER"         // Standard audience arena (distance 4.0)
  | "FRONT_ROW"               // Front row stage bleachers (distance 2.5)
  | "VIP"                     // VIP mezzanine / prime ring (distance 1.5)
  | "INNER_CIRCLE"            // Inner orbit closest to creator (distance 0.8)
  | "CREATOR_SELECTED_GUEST"; // Center stage spotlight beside creator (distance 0.2)

export interface SeatStyleConfig {
  tier: SocialSeatTier;
  label: string;
  shortLabel: string;
  symbol: string;
  textColor: string;
  bgClass: string;
  borderClass: string;
  glowClass: string;
  auraGradient: string;
  chatBubbleClass: string;
  chatBadgeClass: string;
  distanceToCreator: number; // 0.2 (closest) to 4.0 (standard)
  priorityScore: number;     // 100 (Guest), 80 (Inner Circle), 60 (VIP), 40 (Front Row), 10 (Standard)
  description: string;
}

export const SEAT_TIER_CONFIGS: Record<SocialSeatTier, SeatStyleConfig> = {
  CREATOR_SELECTED_GUEST: {
    tier: "CREATOR_SELECTED_GUEST",
    label: "⭐ Spotlight Guest",
    shortLabel: "Guest",
    symbol: "⭐",
    textColor: "text-amber-200",
    bgClass: "bg-gradient-to-r from-amber-500/20 via-yellow-400/20 to-amber-600/20",
    borderClass: "border-amber-400/60",
    glowClass: "shadow-[0_0_24px_rgba(251,191,36,0.35)]",
    auraGradient: "from-amber-400 via-yellow-300 to-amber-500",
    chatBubbleClass: "border-amber-400/50 bg-gradient-to-r from-amber-950/70 via-black/80 to-zinc-950/80 shadow-[0_0_15px_rgba(251,191,36,0.2)]",
    chatBadgeClass: "bg-amber-500 text-black font-black",
    distanceToCreator: 0.2, // Stage Center (Beside Creator)
    priorityScore: 100,
    description: "Honored guest invited directly to the center stage spotlight by the creator.",
  },
  INNER_CIRCLE: {
    tier: "INNER_CIRCLE",
    label: "👑 Inner Circle",
    shortLabel: "Inner Circle",
    symbol: "👑",
    textColor: "text-rose-200",
    bgClass: "bg-gradient-to-r from-rose-500/15 via-purple-500/15 to-amber-500/15",
    borderClass: "border-rose-400/50",
    glowClass: "shadow-[0_0_20px_rgba(244,63,94,0.3)]",
    auraGradient: "from-rose-500 via-purple-500 to-amber-400",
    chatBubbleClass: "border-rose-400/40 bg-gradient-to-r from-rose-950/60 via-purple-950/40 to-black/80 shadow-[0_0_12px_rgba(244,63,94,0.18)]",
    chatBadgeClass: "bg-gradient-to-r from-rose-500 to-purple-600 text-white font-bold",
    distanceToCreator: 0.8, // Inner Orbital Ring
    priorityScore: 80,
    description: "Highest-tier devotee and patron orbiting closest to the creator.",
  },
  VIP: {
    tier: "VIP",
    label: "💎 VIP Mezzanine",
    shortLabel: "VIP",
    symbol: "💎",
    textColor: "text-cyan-300",
    bgClass: "bg-cyan-500/15",
    borderClass: "border-cyan-400/40",
    glowClass: "shadow-[0_0_16px_rgba(6,182,212,0.25)]",
    auraGradient: "from-cyan-500 via-blue-500 to-indigo-500",
    chatBubbleClass: "border-cyan-500/30 bg-black/60 shadow-[0_0_10px_rgba(6,182,212,0.15)]",
    chatBadgeClass: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold",
    distanceToCreator: 1.5, // Prime VIP Ring
    priorityScore: 60,
    description: "Subscribed VIP members enjoying prime elevated viewing pods.",
  },
  FRONT_ROW: {
    tier: "FRONT_ROW",
    label: "🔥 Front Row",
    shortLabel: "Front Row",
    symbol: "🔥",
    textColor: "text-amber-300",
    bgClass: "bg-amber-500/10",
    borderClass: "border-amber-500/30",
    glowClass: "shadow-[0_0_12px_rgba(245,158,11,0.2)]",
    auraGradient: "from-amber-500 via-orange-500 to-red-500",
    chatBubbleClass: "border-amber-500/25 bg-black/55",
    chatBadgeClass: "bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium",
    distanceToCreator: 2.5, // Stage Bleachers
    priorityScore: 40,
    description: "Active tippers and frequent community contributors occupying front-row seats.",
  },
  STANDARD_VIEWER: {
    tier: "STANDARD_VIEWER",
    label: "🌱 Arena Viewer",
    shortLabel: "Viewer",
    symbol: "🌱",
    textColor: "text-zinc-400",
    bgClass: "bg-white/[0.04]",
    borderClass: "border-white/10",
    glowClass: "",
    auraGradient: "from-zinc-600 to-zinc-800",
    chatBubbleClass: "border-white/5 bg-black/45",
    chatBadgeClass: "bg-zinc-800 text-zinc-300",
    distanceToCreator: 4.0, // Arena Floor
    priorityScore: 10,
    description: "General audience participant watching from the stadium arena.",
  },
};


export interface SeatOccupant {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  seatTier: SocialSeatTier;
  seatIndex: number;
  fanLevel: number;
  badge?: string | null;
  occupiedAt: string;
  expiresAt?: string | null;
  entitlementReason: string;
  totalCreditsContributedSession?: number;
  streakDays?: number;
  isCreatorGuest?: boolean;
}

export interface VirtualSeatSlot {
  seatIndex: number;
  tier: SocialSeatTier;
  label: string;
  isOccupied: boolean;
  occupant: SeatOccupant | null;
  minPriceCredits?: number;
  angleDegrees?: number; // for circular / orbital visualization
  radiusNormalized?: number; // 0 (center) to 1 (outer ring)
}

export interface VirtualRoomLayout {
  creatorId: string;
  creatorDisplayName: string;
  creatorAvatarUrl: string | null;
  isLive: boolean;
  totalAudienceCount: number;
  totalSeatedCount: number;
  
  // Tier-organized seats
  guestSpotlightSeats: VirtualSeatSlot[];  // Max 2 seats directly next to creator
  innerCircleSeats: VirtualSeatSlot[];     // Max 4 orbital seats
  vipSeats: VirtualSeatSlot[];             // Max 8 luxury pods
  frontRowSeats: VirtualSeatSlot[];        // Max 12 front-row bleachers
  standardViewersCount: number;            // Count of general viewers in arena
  
  // Caller-specific seat & entitlement state
  callerSeat: VirtualSeatSlot | null;
  callerEntitlement: SeatEntitlementResult;
  
  updatedAt: string;
}

export interface SeatEntitlementResult {
  userId: string;
  highestEntitledTier: SocialSeatTier;
  isEligibleForGuest: boolean;
  isEligibleForInnerCircle: boolean;
  isEligibleForVip: boolean;
  isEligibleForFrontRow: boolean;
  entitlementReason: string;
  currentOccupiedSeatIndex?: number | null;
  availableUpgradeTiers: Array<{
    tier: SocialSeatTier;
    requirement: string;
    isMet: boolean;
  }>;
}

export interface ClaimSeatRequest {
  seatTier: SocialSeatTier;
  seatIndex?: number;
  fanUserId: string;
}

export interface InviteGuestRequest {
  guestUserId: string;
  seatIndex?: number;
  invitationNote?: string;
  durationMinutes?: number;
}
