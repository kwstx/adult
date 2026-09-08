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
