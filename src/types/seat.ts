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
