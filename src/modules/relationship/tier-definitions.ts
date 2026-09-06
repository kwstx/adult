// ============================================================================
// RELATIONSHIP TIER DEFINITIONS & CONFIGURATION
// Default authoritative 6-tier progression hierarchy for creators & fans
// ============================================================================

import { RelationshipTierCode, TierDefinition } from "./types";

export const RELATIONSHIP_TIERS: TierDefinition[] = [
  {
    tier: "NEW_FAN",
    name: "New Fan",
    subtitle: "Welcome to the Journey",
    minXp: 0,
    maxXp: 500,
    levelRange: [1, 2],
    badgeColor: "#71717A",
    gradientClass: "from-zinc-600 to-zinc-400 text-white",
    glowColor: "rgba(113, 113, 122, 0.4)",
    icon: "Sparkles",
    perks: [
      {
        id: "new_fan_chat",
        title: "Public Live Chat",
        description: "Participate in open room chat with standard font",
        iconName: "MessageSquare",
        isUnlocked: true,
      },
      {
        id: "new_fan_stream",
        title: "Public Broadcast Access",
        description: "Watch open livestreams in full HD",
        iconName: "Eye",
        isUnlocked: true,
      },
      {
        id: "new_fan_emotes",
        title: "Standard Emote Set",
        description: "Access universal platform emotes in chat",
        iconName: "Smile",
        isUnlocked: true,
      },
    ],
  },
  {
    tier: "SUPPORTER",
    name: "Supporter",
    subtitle: "Active Contributor",
    minXp: 500,
    maxXp: 2000,
    levelRange: [3, 5],
    badgeColor: "#3B82F6",
    gradientClass: "from-blue-600 to-cyan-400 text-white",
    glowColor: "rgba(59, 130, 246, 0.45)",
    icon: "Shield",
    perks: [
      {
        id: "supporter_badge",
        title: "Supporter Chat Badge",
        description: "Verified blue supporter icon next to your name in stream chat",
        iconName: "BadgeCheck",
        isUnlocked: true,
      },
      {
        id: "supporter_discount",
        title: "5% Tip Menu Discount",
        description: "Save 5% on interactive toy actions and wheel spins",
        iconName: "Percent",
        isUnlocked: true,
      },
      {
        id: "supporter_highlight",
        title: "Highlighted Chat Messages",
        description: "Subtle glow highlighting your messages to the creator",
        iconName: "Sparkle",
        isUnlocked: true,
      },
    ],
  },
  {
    tier: "REGULAR",
    name: "Regular",
    subtitle: "Loyal Community Member",
    minXp: 2000,
    maxXp: 5000,
    levelRange: [6, 9],
    badgeColor: "#10B981",
    gradientClass: "from-emerald-600 to-teal-400 text-white",
    glowColor: "rgba(16, 185, 129, 0.45)",
    icon: "HeartHandshake",
    perks: [
      {
        id: "regular_badge",
        title: "Regular Emerald Badge",
        description: "Emerald loyalty badge reflecting ongoing dedication",
        iconName: "Award",
        isUnlocked: true,
      },
      {
        id: "regular_vods",
        title: "Stream Replays & VOD Archives",
        description: "Full on-demand access to past livestream recordings",
        iconName: "Film",
        isUnlocked: true,
      },
      {
        id: "regular_priority_chat",
        title: "Priority Chat Queue",
        description: "Fast-track chat messages during fast-scrolling broadcasts",
        iconName: "Zap",
        isUnlocked: true,
      },
    ],
  },
  {
    tier: "VIP",
    name: "VIP",
    subtitle: "Distinguished Devotee",
    minXp: 5000,
    maxXp: 15000,
    levelRange: [10, 15],
    badgeColor: "#A855F7",
    gradientClass: "from-purple-600 to-pink-500 text-white",
    glowColor: "rgba(168, 85, 247, 0.5)",
    icon: "Crown",
    perks: [
      {
        id: "vip_badge",
        title: "Glowing Purple VIP Badge",
        description: "Luminous VIP badge with prestige broadcast announcement",
        iconName: "Crown",
        isUnlocked: true,
      },
      {
        id: "vip_ppv_discount",
        title: "10% PPV Media Discount",
        description: "10% credit discount across all PPV photo and video posts",
        iconName: "Tag",
        isUnlocked: true,
      },
      {
        id: "vip_dm_inbox",
        title: "Priority DM Inbox",
        description: "Your direct messages appear in the creator's top VIP priority tab",
        iconName: "MailCheck",
        isUnlocked: true,
      },
      {
        id: "vip_stage_seat",
        title: "Stage Seat VIP Box Access",
        description: "Access front-row VIP seating boxes during live video shows",
        iconName: "Armchair",
        isUnlocked: true,
      },
    ],
  },
  {
    tier: "INNER_CIRCLE",
    name: "Inner Circle",
    subtitle: "Privileged Confidant",
    minXp: 15000,
    maxXp: 50000,
    levelRange: [16, 24],
    badgeColor: "#EC4899",
    gradientClass: "from-pink-500 via-rose-500 to-purple-600 text-white",
    glowColor: "rgba(236, 72, 153, 0.6)",
    icon: "Flame",
    perks: [
      {
        id: "inner_circle_badge",
        title: "Holographic Inner Circle Aura",
        description: "Animated holographic badge and room entrance animation",
        iconName: "Sparkles",
        isUnlocked: true,
      },
      {
        id: "inner_circle_secret_content",
        title: "Secret Stories & Behind-the-Scenes",
        description: "Unfiltered private backstage content, stories, and audio diaries",
        iconName: "LockOpen",
        isUnlocked: true,
      },
      {
        id: "inner_circle_voice_notes",
        title: "Direct Voice Message Responses",
        description: "Creator can send personalized audio notes in private chat",
        iconName: "Mic",
        isUnlocked: true,
      },
      {
        id: "inner_circle_1on1_priority",
        title: "Private Booking Fast Track",
        description: "Priority queue for 1-on-1 private video bookings",
        iconName: "Clock",
        isUnlocked: true,
      },
    ],
  },
  {
    tier: "ELITE",
    name: "Elite",
    subtitle: "Sovereign Patron",
    minXp: 50000,
    maxXp: null,
    levelRange: [25, 99],
    badgeColor: "#F59E0B",
    gradientClass: "from-amber-400 via-yellow-300 to-amber-600 text-amber-950",
    glowColor: "rgba(245, 158, 11, 0.7)",
    icon: "Trophy",
    perks: [
      {
        id: "elite_crown",
        title: "Sovereign Golden Crown",
        description: "Legendary animated crown with room-wide gold entrance flare",
        iconName: "Crown",
        isUnlocked: true,
      },
      {
        id: "elite_wall_of_fame",
        title: "Permanent Donor Hall of Fame",
        description: "Your name engraved on the creator's profile leaderboard monument",
        iconName: "Trophy",
        isUnlocked: true,
      },
      {
        id: "elite_monthly_shoutout",
        title: "Monthly Custom Video Shoutout",
        description: "Receive a personalized 4K dedicated video from the creator every month",
        iconName: "Video",
        isUnlocked: true,
      },
      {
        id: "elite_custom_greeting",
        title: "Custom Soundboard Entrance",
        description: "Custom audio sound plays when you enter the livestream",
        iconName: "Volume2",
        isUnlocked: true,
      },
      {
        id: "elite_vip_all_access",
        title: "20% Master Discount Across Platform",
        description: "20% off all tips, media, merchandise, and subscriptions with this creator",
        iconName: "Gem",
        isUnlocked: true,
      },
    ],
  },
];

/**
 * Mapping legacy or alternate tier names to standardized RelationshipTierCode
 */
export function normalizeRelationshipTier(rawTier: string | null | undefined): RelationshipTierCode {
  if (!rawTier) return "NEW_FAN";
  const upper = rawTier.toUpperCase().replace(/\s+/g, "_");
  
  switch (upper) {
    case "NEW_FAN":
    case "STRANGER":
    case "NEW":
      return "NEW_FAN";
    case "SUPPORTER":
      return "SUPPORTER";
    case "REGULAR":
    case "SUPERFAN":
      return "REGULAR";
    case "VIP":
    case "VIP_DEVOTEE":
      return "VIP";
    case "INNER_CIRCLE":
    case "SOULMATE":
      return "INNER_CIRCLE";
    case "ELITE":
    case "ROYAL_PATRON":
      return "ELITE";
    default:
      return "NEW_FAN";
  }
}

/**
 * Get tier definition by code
 */
export function getTierDefinition(tierCode: RelationshipTierCode): TierDefinition {
  const tier = RELATIONSHIP_TIERS.find((t) => t.tier === tierCode);
  return tier || RELATIONSHIP_TIERS[0];
}

/**
 * Calculate Tier, Level, and Progress from raw total XP
 */
export function calculateProgressionFromXp(totalXp: number): {
  tier: RelationshipTierCode;
  level: number;
  tierDef: TierDefinition;
  nextTierDef: TierDefinition | null;
  xpInCurrentTier: number;
  xpRequiredForNextTier: number;
  progressPercent: number;
  isMaxTier: boolean;
  xpRemainingToNextTier: number;
} {
  const safeXp = Math.max(0, Math.floor(totalXp));

  // Determine which tier safeXp belongs to
  let currentTierIndex = 0;
  for (let i = RELATIONSHIP_TIERS.length - 1; i >= 0; i--) {
    if (safeXp >= RELATIONSHIP_TIERS[i].minXp) {
      currentTierIndex = i;
      break;
    }
  }

  const tierDef = RELATIONSHIP_TIERS[currentTierIndex];
  const nextTierDef =
    currentTierIndex < RELATIONSHIP_TIERS.length - 1
      ? RELATIONSHIP_TIERS[currentTierIndex + 1]
      : null;

  const isMaxTier = nextTierDef === null;

  let xpInCurrentTier = 0;
  let xpRequiredForNextTier = 0;
  let progressPercent = 0;
  let xpRemainingToNextTier = 0;

  if (nextTierDef) {
    const tierSpan = nextTierDef.minXp - tierDef.minXp;
    xpInCurrentTier = safeXp - tierDef.minXp;
    xpRequiredForNextTier = tierSpan;
    progressPercent = Math.min(100, Math.max(0, Math.round((xpInCurrentTier / tierSpan) * 100)));
    xpRemainingToNextTier = Math.max(0, nextTierDef.minXp - safeXp);
  } else {
    // Max tier
    xpInCurrentTier = safeXp - tierDef.minXp;
    xpRequiredForNextTier = 50000;
    progressPercent = 100;
    xpRemainingToNextTier = 0;
  }

  // Level calculation: 1 level roughly every 1000 XP, with tier lower bound
  const [minLvl, maxLvl] = tierDef.levelRange;
  let computedLevel = minLvl;
  if (nextTierDef) {
    const tierSpan = nextTierDef.minXp - tierDef.minXp;
    const fraction = xpInCurrentTier / tierSpan;
    computedLevel = minLvl + Math.floor(fraction * (maxLvl - minLvl + 1));
    computedLevel = Math.min(maxLvl, Math.max(minLvl, computedLevel));
  } else {
    // Elite tier can scale up to 99
    computedLevel = Math.min(99, minLvl + Math.floor(xpInCurrentTier / 5000));
  }

  return {
    tier: tierDef.tier,
    level: computedLevel,
    tierDef,
    nextTierDef,
    xpInCurrentTier,
    xpRequiredForNextTier,
    progressPercent,
    isMaxTier,
    xpRemainingToNextTier,
  };
}

/**
 * Standard XP Award Calculation based on interaction type and values
 */
export function calculateXpToAward(
  eventType: string,
  options?: {
    creditsSpent?: number;
    minutesWatched?: number;
    messagesCount?: number;
    customXpAmount?: number;
    streakDays?: number;
  }
): number {
  if (options?.customXpAmount && options.customXpAmount > 0) {
    return options.customXpAmount;
  }

  const streakMultiplier = 1.0 + Math.min(0.5, ((options?.streakDays || 0) * 0.05)); // up to 1.5x

  switch (eventType) {
    case "LIVE_TIP":
    case "PPV_PURCHASE":
    case "GOAL_CONTRIBUTION":
    case "PAID_MESSAGE": {
      const credits = options?.creditsSpent || 0;
      return Math.round(credits * 10); // 1 credit = 10 XP
    }
    case "STREAM_WATCH_TIME": {
      const minutes = options?.minutesWatched || 0;
      // 5 XP per minute watched * streak multiplier
      return Math.round(minutes * 5 * streakMultiplier);
    }
    case "CHAT_MESSAGE": {
      const count = options?.messagesCount || 1;
      // 2 XP per verified message
      return Math.round(count * 2 * streakMultiplier);
    }
    case "SUBSCRIPTION_RENEWAL": {
      // Basic 1000, VIP 2500, Diamond 5000
      const credits = options?.creditsSpent || 200;
      return Math.max(1000, Math.round(credits * 10));
    }
    case "GAME_PARTICIPATION": {
      const credits = options?.creditsSpent || 10;
      return Math.round(credits * 10);
    }
    default:
      return 50;
  }
}
