/**
 * Authoritative Entitlement System Core Types
 * 
 * An Entitlement answers: "What does this user currently have access to?"
 * 
 * Provides domain types for granular, server-side access control across subscriptions,
 * PPV content, VIP access, private sessions, premium seating, priority queues, and events.
 */

export type EntitlementKey =
  | "SUBSCRIBER"              // Subscriber to Creator
  | "VIP_ACCESS"              // VIP tier access / VIP pass
  | "DIAMOND_ACCESS"          // Diamond tier supporter
  | "CONTENT_ACCESS"          // Purchased PPV video/photo/album/bundle
  | "PRIVATE_SESSION_ACCESS"  // Booked/active 1-on-1 private session room
  | "PREMIUM_SEAT"            // VIP Front Row or premium seat in live room
  | "PRIORITY_INTERACTION"    // Fast-track queue or prioritized tip alert
  | "SPECIAL_EVENT_TICKET"    // Ticketed event / special broadcast pass
  | "DIRECT_MESSAGES"         // Unlocked direct messaging privileges
  | "VOD_ACCESS"              // Stream recording & VOD archive access
  | "CUSTOM_BADGE"            // Custom chat badges & exclusive emotes
  | "PLATFORM_PERK"           // Promotional / achievement-granted capability
  | string;

export type EntitlementScope =
  | "GLOBAL"      // Platform-wide entitlement (e.g. VIP platform status)
  | "CREATOR"     // Creator-specific entitlement (e.g. Subscribed to Creator A)
  | "LIVESTREAM"  // Stream-specific entitlement (e.g. Premium seat in Stream X)
  | "CONTENT"     // Specific media piece unlock (e.g. Purchased Video C)
  | "SESSION"     // Private video room entitlement (e.g. Private Session D)
  | "FEATURE";    // Feature flag / special capability

export type EntitlementSourceType =
  | "ORDER"             // Granted via authoritative Order completion
  | "SUBSCRIPTION"      // Granted via active recurring subscription
  | "DIRECT_PURCHASE"   // Direct purchase record
  | "ADMIN_GRANT"       // Granted by platform administrator
  | "GAME_REWARD"       // Non-monetary reward earned in game system
  | "CREATOR_OVERRIDE"  // Creator granting access to their own domain
  | "SYSTEM";           // System automatic grant

export interface EntitlementRecord {
  id: string;
  userId: string;
  key: EntitlementKey;
  scope: EntitlementScope;
  creatorProfileId?: string | null;
  resourceId?: string | null;       // contentId, livestreamId, bookingId, seatId, etc.
  orderId?: string | null;          // originating Order ID if applicable
  tierLevel?: number;               // 1 = Basic, 2 = VIP, 3 = Diamond, etc.
  grantedAt: Date;
  expiresAt?: Date | null;          // null = permanent / perpetual unlock
  isActive: boolean;
  sourceType: EntitlementSourceType;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface EntitlementCheckInput {
  userId?: string | null;
  key: EntitlementKey;
  scope?: EntitlementScope;
  creatorProfileId?: string | null;
  resourceId?: string | null;
  minimumTierLevel?: number;
  context?: {
    ipAddress?: string;
    userAgent?: string;
    livestreamId?: string;
    [key: string]: any;
  };
}

export interface EntitlementCheckResult {
  hasEntitlement: boolean;
  reason: string;
  statusCode: number;
  isBypassed?: boolean;             // true if creator self-access or admin bypass
  entitlement?: EntitlementRecord;  // matching record if found
  expiresAt?: Date | null;
  tierLevel?: number;
}

export interface GetUserEntitlementsInput {
  userId: string;
  creatorProfileId?: string | null;
  livestreamId?: string | null;
  contentId?: string | null;
  includeExpired?: boolean;
}

export interface UserEntitlementsSummary {
  userId: string;
  creatorProfileId?: string | null;
  livestreamId?: string | null;
  
  // Categorized flags for instantaneous frontend rendering
  isSubscriber: boolean;
  isVip: boolean;
  isDiamond: boolean;
  subscriptionTierLevel: number;
  
  hasPrivateSession: boolean;
  hasPremiumSeat: boolean;
  hasPriorityQueue: boolean;
  hasDirectMessageAccess: boolean;
  
  // Set of unlocked content IDs for quick O(1) membership check
  unlockedContentIds: string[];
  
  // Detailed list of active entitlements
  activeEntitlements: Array<{
    id: string;
    key: EntitlementKey;
    scope: EntitlementScope;
    creatorProfileId?: string | null;
    resourceId?: string | null;
    expiresAt?: string | null;
    sourceType: EntitlementSourceType;
    metadata?: Record<string, any>;
  }>;
  
  evaluatedAt: string;
}

export interface GrantEntitlementInput {
  userId: string;
  key: EntitlementKey;
  scope: EntitlementScope;
  creatorProfileId?: string | null;
  resourceId?: string | null;
  orderId?: string | null;
  tierLevel?: number;
  expiresAt?: Date | null;
  sourceType: EntitlementSourceType;
  metadata?: Record<string, any>;
}

export interface RevokeEntitlementInput {
  userId: string;
  key?: EntitlementKey;
  creatorProfileId?: string | null;
  resourceId?: string | null;
  orderId?: string | null;
  entitlementId?: string;
  reason?: string;
}
