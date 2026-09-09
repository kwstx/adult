/**
 * ============================================================================
 * FAN ONBOARDING TYPES & CONTRACTS
 * ============================================================================
 */

import { UserRole, KYCStatus, AccountModerationState } from "@prisma/client";

export type FanOnboardingStepKey =
  | "LANDING"
  | "AGE_GATE"
  | "ACCOUNT"
  | "USERNAME"
  | "INTERESTS"
  | "CATEGORIES"
  | "NOTIFICATIONS"
  | "FINDING_LIVE"
  | "COMPLETE";

export interface InterestOption {
  id: string;
  name: string;
  emoji: string;
  tag: string;
  category: string;
  description: string;
  popularityScore: number;
}

export interface FeaturedCreatorOption {
  id: string; // CreatorProfile ID
  userId: string;
  stageName: string;
  displayName: string;
  avatarUrl: string;
  bannerUrl?: string;
  category: string;
  tags: string[];
  isLive: boolean;
  viewerCount: number;
  bio?: string;
  isFollowing?: boolean;
}

export interface FanOnboardingInput {
  email: string;
  password?: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  ageVerified: boolean;
  ageAssuranceMethod?: "SELF_ATTESTATION" | "CREDIT_CARD_ASSURANCE" | "ID_DOCUMENT_KYC" | "FACIAL_AGE_ESTIMATION";
  countryCode?: string;
  selectedInterests: string[]; // e.g. ["cosplay", "interactive", "gaming"]
  selectedCategory?: string;
  followedCreatorProfileIds?: string[];
  notificationsEnabled: boolean;
  notificationTier?: "ALL" | "LIVE_ONLY" | "NONE";
}

export interface FanOnboardingResult {
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string;
    role: UserRole;
    avatarUrl: string | null;
    bannerUrl: string | null;
    bio: string | null;
    kycStatus: KYCStatus;
    moderationState: AccountModerationState;
    walletBalance: number;
  };
  token: string;
  ageAssuranceId: string;
  interestsCount: number;
  followedCreatorsCount: number;
  firstLiveMatch: {
    creatorProfileId: string;
    streamTitle: string;
    category: string;
    viewerCount: number;
    streamUrl?: string;
    playbackHlsUrl?: string;
  } | null;
}

export interface UsernameCheckResult {
  username: string;
  isAvailable: boolean;
  suggestions: string[];
}

export const ONBOARDING_INTERESTS: InterestOption[] = [
  {
    id: "gaming",
    name: "Gaming & Late Night",
    emoji: "🎮",
    tag: "gaming",
    category: "Gaming",
    description: "Late night gaming sessions, party games, and interactive gameplay",
    popularityScore: 98,
  },
  {
    id: "cosplay",
    name: "Cosplay & Anime",
    emoji: "🎭",
    tag: "cosplay",
    category: "Cosplay",
    description: "Anime characters, fantasy outfits, costume reveals and themed shows",
    popularityScore: 95,
  },
  {
    id: "interactive",
    name: "Toy Control & Haptic",
    emoji: "⚡",
    tag: "interactive",
    category: "Interactive",
    description: "Direct real-time haptic toy control, buzz alerts, and tip goals",
    popularityScore: 99,
  },
  {
    id: "asmr",
    name: "ASMR & Whispers",
    emoji: "💋",
    tag: "asmr",
    category: "ASMR",
    description: "Binaural audio, gentle whispers, ear cleaning, and close-up relaxation",
    popularityScore: 92,
  },
  {
    id: "dance",
    name: "Dance & Music",
    emoji: "💃",
    tag: "dance",
    category: "Performance",
    description: "Choreography, music requests, private dances, and club vibes",
    popularityScore: 90,
  },
  {
    id: "vip",
    name: "VIP & 1-on-1 Shows",
    emoji: "💎",
    tag: "vip",
    category: "VIP",
    description: "Exclusive private camera sessions, high-roller rooms, and direct DM access",
    popularityScore: 97,
  },
  {
    id: "chill",
    name: "Chill & Deep Chat",
    emoji: "🍸",
    tag: "chill",
    category: "Lounge",
    description: "Candid conversations, late-night Q&A, relationship advice and relaxed banter",
    popularityScore: 88,
  },
  {
    id: "battles",
    name: "Contests & Spin Wheel",
    emoji: "🏆",
    tag: "battles",
    category: "Interactive",
    description: "Wheel spins, dare challenges, fan battles, and collective stream goals",
    popularityScore: 94,
  },
];

export const PRESET_FEATURED_CREATORS: FeaturedCreatorOption[] = [
  {
    id: "creator_maya",
    userId: "user_maya",
    stageName: "Maya Velvet ✨",
    displayName: "Maya Velvet ✨",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80",
    category: "Interactive",
    tags: ["interactive", "vip", "cosplay", "dance"],
    isLive: true,
    viewerCount: 2840,
    bio: "Top interactive performer ✨ Haptic toy connected! Come say hi & control the vibe.",
  },
  {
    id: "creator_chloe",
    userId: "user_chloe",
    stageName: "Chloe Star 🌟",
    displayName: "Chloe Star 🌟",
    avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80",
    category: "Cosplay",
    tags: ["cosplay", "gaming", "anime", "chill"],
    isLive: true,
    viewerCount: 1950,
    bio: "Cosplayer & late night gamer 🎮 New outfit drops every stream session.",
  },
  {
    id: "creator_lexi",
    userId: "user_lexi",
    stageName: "Lexi Nova 💜",
    displayName: "Lexi Nova 💜",
    avatarUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop&q=80",
    category: "ASMR",
    tags: ["asmr", "chill", "whisper", "vip"],
    isLive: true,
    viewerCount: 1420,
    bio: "Binaural 3Dio ASMR & intimate late-night talks 🎧 Headphones recommended.",
  },
  {
    id: "creator_seraphina",
    userId: "user_seraphina",
    stageName: "Seraphina Dark 🖤",
    displayName: "Seraphina Dark 🖤",
    avatarUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80",
    category: "Performance",
    tags: ["dance", "music", "battles", "vip"],
    isLive: true,
    viewerCount: 3110,
    bio: "Club DJ, pole flow, and live wheel spin challenges! VIP requests open.",
  },
];
