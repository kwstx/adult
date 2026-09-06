export interface CreatorIdentity {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  stageName: string;
  avatarUrl: string;
  bannerUrl: string;
  bio: string;
  tags: string[];
  category: string;
  totalFollowers: number;
  totalViews: number;
  rating: string;
  responseTimeMinutes: number;
  is2257Approved: boolean;
}

export interface LivePillarData {
  isLive: boolean;
  streamTitle: string;
  viewerCount: number;
  streamMode: string;
  ticketPriceCredits: number;
  playbackHlsUrl: string;
  activeGoal: {
    id: string;
    title: string;
    targetCredits: number;
    currentCredits: number;
    contributorCount: number;
    percentage: number;
  };
  interactionMenu: Array<{
    id: string;
    title: string;
    description: string;
    actionType: string;
    priceCredits: number;
    durationSeconds: number;
    iconUrl?: string;
    isEnabled?: boolean;
    sortOrder?: number;
  }>;
  stageSeats: Array<{
    seatIndex: number;
    seatTier: string;
    pricePerMinuteCredits: number;
    isOccupied: boolean;
    currentUser?: {
      displayName: string;
      avatarUrl?: string;
    } | null;
  }>;
}

export interface SubscriptionTierItem {
  id: string;
  name: string;
  tier: string;
  tierLevel: number;
  description: string;
  priceFiatCents: number;
  priceFiatFormatted: string;
  creditPriceMonthly: number;
  currency: string;
  billingInterval: string;
  entitlements: string[];
  badgeIconUrl?: string;
  badgeColorHex?: string;
  isPopular?: boolean;
}

export interface SubscriptionPillarData {
  tiers: SubscriptionTierItem[];
  isSubscribed: boolean;
  activeSubscription?: any | null;
  grandfatherGuarantee: boolean;
}

export interface ContentMediaItem {
  id: string;
  title: string;
  description: string;
  contentType: "PHOTO" | "VIDEO" | "AUDIO" | "ALBUM" | "POST" | "BUNDLE";
  accessLevel: "PUBLIC" | "FOLLOWERS_ONLY" | "SUBSCRIBERS_ONLY" | "PPV_PURCHASE" | "TIER_VIP_ONLY";
  priceCredits: number;
  previewUrl: string;
  mediaUrl: string;
  mediaDurationSeconds?: number;
  viewCount: number;
  likeCount: number;
  purchaseCount: number;
  isUnlocked: boolean;
}

export interface ContentPillarData {
  items: ContentMediaItem[];
}

export interface PrivateDurationTier {
  durationMinutes: number;
  totalCredits: number;
  priceFiatFormatted: string;
  title: string;
  desc: string;
  popular?: boolean;
}

export interface PrivatePillarData {
  creditRatePerMinute: number;
  rateFormatted: string;
  paidMessagesEnabled: boolean;
  messagePriceCredits: number;
  durationTiers: PrivateDurationTier[];
  availableDays: Array<{
    day: string;
    slots: string[];
  }>;
}

export interface ExperienceProductItem {
  id: string;
  title: string;
  description: string;
  productType: "DIGITAL_DOWNLOAD" | "PHYSICAL_MERCH" | "CUSTOM_SERVICE" | "SHOUTOUT" | "VIP_PASS" | "TOY_CONTROL_PASS";
  priceCredits: number;
  priceFiatCents?: number;
  priceFiatFormatted: string;
  inventoryCount?: number | null;
  thumbnailUrl?: string;
}

export interface ExperiencesPillarData {
  products: ExperienceProductItem[];
}

export interface FanStorefrontState {
  isFollowing: boolean;
  notificationTier: string;
  activeSubscription?: any | null;
  unlockedContentIds: string[];
  relationship: {
    tier: string;
    currentLevel: number;
    totalCreditsSpent: number;
    currentStreakDays: number;
  };
  walletBalance: number;
}

export interface StorefrontData {
  creator: CreatorIdentity;
  live: LivePillarData;
  subscription: SubscriptionPillarData;
  content: ContentPillarData;
  private: PrivatePillarData;
  experiences: ExperiencesPillarData;
  fanState: FanStorefrontState;
}

export type StorefrontPillarTab = "live" | "subscription" | "content" | "private" | "experiences";

export interface CheckoutItemPayload {
  checkoutType: "INTERACTION" | "SUBSCRIPTION" | "PPV_CONTENT" | "PRIVATE_BOOKING" | "PRODUCT_EXPERIENCE";
  title: string;
  subtitle?: string;
  priceCredits: number;
  priceFiatFormatted?: string;
  badge?: string;
  icon?: string;
  creatorProfileId: string;
  productId?: string;
  contentId?: string;
  interactionDefinitionId?: string;
  durationMinutes?: number;
  slotTime?: string;
  livestreamId?: string;
  customNotesRequired?: boolean;
  customNotesLabel?: string;
}
