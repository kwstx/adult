import { UserRole, KYCStatus, AccountModerationState } from "@prisma/client";

// ============================================================================
// 1. CLIENT PLATFORM & DEVICE CONTEXT
// ============================================================================

export type ClientPlatform = "ios" | "android" | "web" | "desktop" | "unknown";

export interface MobileDeviceContext {
  platform: ClientPlatform;
  appVersion: string;
  buildNumber: number;
  deviceId: string;
  deviceModel?: string;
  osVersion?: string;
  locale?: string;
  ipAddress?: string;
  userAgent?: string;
  idempotencyKey?: string;
  pushToken?: string;
  pushProvider?: "APNS" | "FCM";
}

export interface AppVersionPolicy {
  minimumSupportedVersion: string;
  latestVersion: string;
  isUpdateRequired: boolean;
  isUpdateRecommended: boolean;
  upgradeUrl?: {
    ios?: string;
    android?: string;
  };
}

// ============================================================================
// 2. MOBILE AUTHENTICATION & SESSIONS
// ============================================================================

export interface MobileAuthTokens {
  tokenType: "Bearer";
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

export interface MobileAuthSession {
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
    creatorProfileId?: string | null;
    walletBalance: number;
  };
  tokens: MobileAuthTokens;
  device: {
    deviceId: string;
    platform: ClientPlatform;
    registeredAt: string;
  };
}

export interface MobileDeviceSessionRecord {
  sessionId: string;
  userId: string;
  deviceId: string;
  platform: ClientPlatform;
  deviceModel?: string;
  osVersion?: string;
  appVersion?: string;
  pushToken?: string;
  pushProvider?: "APNS" | "FCM";
  refreshTokenHash: string;
  refreshTokenExpiresAt: Date;
  lastActiveAt: Date;
  createdAt: Date;
  isRevoked: boolean;
  biometricPublicKey?: string;
}

export interface BiometricChallengePayload {
  challengeId: string;
  userId: string;
  deviceId: string;
  nonce: string;
  expiresAt: string;
}

export interface BiometricVerificationInput {
  challengeId: string;
  deviceId: string;
  signature: string;
}

// ============================================================================
// 3. MOBILE WALLET & IN-APP PURCHASES (IAP)
// ============================================================================

export interface MobileStorefrontPackage {
  packageId: string;
  credits: number;
  bonusCredits: number;
  totalCredits: number;
  priceFiatCents: number;
  currency: string;
  formattedPrice: string;
  badgeText?: string;
  isPopular?: boolean;
  isBestValue?: boolean;
  appStoreProductId: string; // e.g. "com.platform.credits.tier100"
  playStoreSku: string;      // e.g. "credits_tier100"
}

export type IapStoreType = "APPLE_APP_STORE" | "GOOGLE_PLAY_STORE";

export interface VerifyIapReceiptInput {
  userId: string;
  store: IapStoreType;
  packageId: string;
  productId: string;
  transactionId: string; // Apple transactionId / Google orderId
  receiptOrToken: string; // Apple signedTransactionInfo / Google purchaseToken
  currency?: string;
  amountFiatCents?: number;
  idempotencyKey?: string;
}

export interface MobileIapVerificationResult {
  success: boolean;
  transactionId: string;
  packageId: string;
  creditsPurchased: number;
  bonusCredits: number;
  totalCreditsAdded: number;
  newBalance: number;
  store: IapStoreType;
  storeTransactionId: string;
  purchasedAt: string;
}

export interface MobileSpendCreditsInput {
  userId: string;
  credits: number;
  targetType: "TIP" | "PAID_MESSAGE" | "PPV_UNLOCK" | "INTERACTION" | "PRIVATE_BOOKING";
  targetId: string; // creatorProfileId, contentId, interactionId, bookingId
  idempotencyKey: string;
  customMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface MobileSpendResult {
  success: boolean;
  transactionId: string;
  targetType: string;
  targetId: string;
  creditsSpent: number;
  remainingBalance: number;
  purchasedBalance: number;
  bonusBalance: number;
  promotionalBalance: number;
  timestamp: string;
}

// ============================================================================
// 4. MOBILE LIVESTREAM AUTHORIZATION & MEDIA
// ============================================================================

export type MobilePlayerType = "AVPLAYER_IOS" | "EXOPLAYER_ANDROID" | "WEBRTC_WHEP" | "STANDARD_HLS";

export interface MobileStreamAuthRequest {
  creatorId: string;
  userId?: string;
  playerType?: MobilePlayerType;
  preferLowLatency?: boolean;
  networkType?: "WIFI" | "CELLULAR_5G" | "CELLULAR_4G" | "UNKNOWN";
}

export interface MobileStreamAuthResult {
  allowed: boolean;
  reason?: string;
  room: {
    creatorId: string;
    streamTitle: string;
    category: string;
    isLive: boolean;
    viewerCount: number;
    streamMode: string;
  };
  playback: {
    token: string;
    expiresAt: number;
    playerType: MobilePlayerType;
    primaryPlaybackUrl: string;
    fallbackPlaybackUrl?: string;
    lowLatencyHlsUrl?: string;
    webrtcWhepUrl?: string;
    iceServers?: Array<{
      urls: string | string[];
      username?: string;
      credential?: string;
    }>;
    suggestedBitrateKbps: number;
    isVipAccess: boolean;
  };
}

export interface MobileBroadcasterAuthRequest {
  creatorUserId: string;
  streamTitle?: string;
  category?: string;
  resolution?: "1080p" | "720p" | "480p";
  framerate?: 30 | 60;
}

export interface MobileBroadcasterAuthResult {
  success: boolean;
  streamId: string;
  creatorProfileId: string;
  ingest: {
    streamKey: string;
    whipEndpoint: string;
    rtmpEndpoint: string;
    recommendedSettings: {
      videoBitrateKbps: number;
      audioBitrateKbps: number;
      keyframeIntervalSeconds: number;
      maxResolution: string;
      targetFps: number;
    };
  };
}

// ============================================================================
// 5. MOBILE REAL-TIME EVENT PROTOCOL & SEQUENCE REPLAY
// ============================================================================

export interface MobileSequencedEvent<T = unknown> {
  seq: number;
  eventId: string;
  channel: string;
  type: string;
  timestamp: number;
  payload: T;
  isReplay?: boolean;
}

export interface MobileRealtimeSyncRequest {
  channel: string;
  lastKnownSeq: number;
  limit?: number;
}

export interface MobileRealtimeSyncResponse {
  channel: string;
  currentSeq: number;
  hasMore: boolean;
  missedEvents: MobileSequencedEvent[];
}
