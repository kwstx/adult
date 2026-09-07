/**
 * Analytics Domain Types and Contracts
 * 
 * Separates operational (OLTP) point lookups from analytical (OLAP) multi-dimensional
 * aggregations and pre-computed data marts.
 */

// ============================================================================
// 1. OPERATIONAL DATA CONTRACTS (OLTP - Point Lookups)
// ============================================================================

export interface WalletBalanceOperationalView {
  userId: string;
  walletId: string;
  status: "ACTIVE" | "LOCKED" | "SUSPENDED" | "SUSPENDED_CHARGEBACK" | "CLOSED";
  totalBalance: number;
  breakdown: {
    purchasedCredits: number;
    promotionalCredits: number;
    bonusCredits: number;
    lockedCredits: number;
    pendingCredits: number;
  };
  fiatEquivalentEur: number; // e.g. 100 credits = €1.00
  creditLots: Array<{
    lotId: string;
    type: "PURCHASED" | "PROMOTIONAL" | "BONUS";
    remainingCredits: number;
    expiresAt: string | null;
  }>;
  fetchedAt: string;
}

export interface ActiveSubscriptionItem {
  subscriptionId: string;
  fanId: string;
  fanUsername?: string;
  fanDisplayName?: string;
  creatorProfileId: string;
  creatorStageName?: string;
  creatorUsername?: string;
  tier: "BASIC" | "VIP" | "DIAMOND" | "CUSTOM";
  tierName: string;
  priceCredits: number;
  billingIntervalDays: number;
  status: "ACTIVE" | "PAST_DUE" | "PAUSED";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  autoRenew: boolean;
  daysRemaining: number;
  isGracePeriod: boolean;
}

export interface ActiveSubscriptionsOperationalView {
  totalActive: number;
  subscriptions: ActiveSubscriptionItem[];
  queriedFor: {
    userId?: string;
    creatorProfileId?: string;
  };
  fetchedAt: string;
}

export interface ContentOwnershipOperationalView {
  contentId: string;
  title: string;
  contentType: "PHOTO" | "VIDEO" | "AUDIO" | "ALBUM" | "POST" | "BUNDLE";
  creatorOwner: {
    creatorProfileId: string;
    creatorUserId: string;
    stageName: string;
    username: string;
  };
  accessLevel: "PUBLIC" | "FOLLOWERS_ONLY" | "SUBSCRIBERS_ONLY" | "PPV_PURCHASE" | "TIER_VIP_ONLY";
  priceCredits: number;
  isPublished: boolean;
  userEntitlement?: {
    userId: string;
    hasAccess: boolean;
    accessReason: "CREATOR_OWNER" | "PPV_PURCHASED" | "ACTIVE_SUBSCRIPTION" | "FREE_PUBLIC" | "NO_ACCESS";
    purchasedAt?: string;
    transactionId?: string;
  };
  fetchedAt: string;
}

// ============================================================================
// 2. ANALYTICAL DATA CONTRACTS (OLAP - Aggregations & Marts)
// ============================================================================

export type AnalyticsTimeframe = "LAST_24_HOURS" | "LAST_7_DAYS" | "LAST_30_DAYS" | "LAST_90_DAYS" | "CUSTOM";

export interface DateRange {
  startDate: string; // ISO 8601
  endDate: string;   // ISO 8601
}

// ----------------------------------------------------------------------------
// Question 1: How much revenue did interactive sessions generate last week?
// ----------------------------------------------------------------------------

export interface InteractiveSessionRevenueQuery {
  timeframe?: AnalyticsTimeframe;
  dateRange?: DateRange;
  creatorProfileId?: string;
  includeCategories?: Array<
    | "INTERACTIVE_SESSION"
    | "PRIVATE_SESSION"
    | "TOY_CONTROL"
    | "GOAL_CONTRIBUTION"
    | "PAID_MESSAGE"
    | "LIVE_TIP"
  >;
}

export interface DailyRevenueBreakdown {
  date: string; // YYYY-MM-DD
  interactiveSessionRevenueCredits: number;
  privateSessionRevenueCredits: number;
  goalContributionRevenueCredits: number;
  liveTipRevenueCredits: number;
  totalGrossCredits: number;
  platformRakeCredits: number;
  netCreatorCredits: number;
  completedSessionCount: number;
}

export interface InteractiveSessionRevenueResult {
  timeframe: AnalyticsTimeframe;
  periodStart: string;
  periodEnd: string;
  totalInteractiveGrossCredits: number;
  totalInteractiveFiatEur: number;
  totalPlatformRakeCredits: number;
  totalNetCreatorCredits: number;
  totalCompletedSessions: number;
  averageRevenuePerSessionCredits: number;
  revenueByCategory: {
    interactiveSessions: number;
    privateSessions: number;
    goalContributions: number;
    liveTips: number;
    paidMessages: number;
  };
  dailyTrend: DailyRevenueBreakdown[];
  topEarningCreators: Array<{
    creatorProfileId: string;
    stageName: string;
    grossCredits: number;
    sessionCount: number;
  }>;
  computedFromMart: boolean;
  generatedAt: string;
}

// ----------------------------------------------------------------------------
// Question 2: What percentage of users who enter a live purchase something?
// ----------------------------------------------------------------------------

export interface LiveConversionQuery {
  timeframe?: AnalyticsTimeframe;
  dateRange?: DateRange;
  livestreamId?: string;
  creatorProfileId?: string;
}

export interface LiveConversionFunnelStage {
  stage: "IMPRESSIONS" | "ROOM_ENTRIES" | "ENGAGED_VIEWERS" | "PURCHASING_VIEWERS";
  count: number;
  dropOffRatePercent: number;
  conversionFromPreviousStagePercent: number;
}

export interface LiveConversionResult {
  livestreamId?: string;
  creatorProfileId?: string;
  timeframe: AnalyticsTimeframe;
  periodStart: string;
  periodEnd: string;
  totalRoomEntries: number;       // Denominator: Total unique viewers who entered the live room
  totalPurchasingViewers: number; // Numerator: Unique viewers who made at least 1 purchase/gift/tip/interaction
  conversionRatePercent: number;  // (totalPurchasingViewers / totalRoomEntries) * 100
  totalGrossCreditsSpent: number;
  averageSpendPerPurchaserCredits: number;
  averageSpendPerEnteredViewerCredits: number;
  purchaseTypeBreakdown: {
    giftsSentCount: number;
    giftsCredits: number;
    interactionsCount: number;
    interactionsCredits: number;
    goalsContributedCount: number;
    goalsCredits: number;
    ppvPurchasesCount: number;
    ppvCredits: number;
    subscriptionsPurchasedCount: number;
    subscriptionsCredits: number;
  };
  funnel: LiveConversionFunnelStage[];
  computedFromMart: boolean;
  generatedAt: string;
}

// ----------------------------------------------------------------------------
// Question 3: Which creators retain fans longest?
// ----------------------------------------------------------------------------

export interface CreatorRetentionQuery {
  timeframe?: AnalyticsTimeframe;
  dateRange?: DateRange;
  limit?: number;
  minFansThreshold?: number;
  sortBy?: "AVERAGE_LIFESPAN_DAYS" | "RETENTION_SCORE" | "D30_RETURN_RATE";
}

export interface CreatorRetentionMetrics {
  creatorProfileId: string;
  stageName: string;
  username: string;
  totalUniqueFans: number;
  activeSubscribersCount: number;
  averageFanLifespanDays: number; // Average duration fan remains active with this creator
  longestFanRelationshipDays: number;
  retentionRateD1Percent: number;  // Fans returning next day
  retentionRateD7Percent: number;  // Fans returning after 7 days
  retentionRateD30Percent: number; // Fans returning after 30 days
  retentionRateD90Percent: number; // Fans returning after 90 days
  churnRateMonthlyPercent: number;
  repeatPurchaseRatePercent: number; // % of paying fans who transact multiple times
  overallRetentionScore: number;    // 0 - 100 Composite retention quality score
  relationshipLevelDistribution: {
    level1To5: number;
    level6To15: number;
    level16To30: number;
    level31Plus: number;
  };
}

export interface CreatorRetentionResult {
  timeframe: AnalyticsTimeframe;
  periodStart: string;
  periodEnd: string;
  rankings: CreatorRetentionMetrics[];
  platformAverageFanLifespanDays: number;
  platformAverageD30ReturnRatePercent: number;
  computedFromMart: boolean;
  generatedAt: string;
}

// ----------------------------------------------------------------------------
// Question 4: Which feed positions generate the most room entries?
// ----------------------------------------------------------------------------

export interface FeedPositionQuery {
  timeframe?: AnalyticsTimeframe;
  dateRange?: DateRange;
  category?: string;
  deviceType?: string;
  maxPosition?: number;
}

export interface FeedPositionMetric {
  positionIndex: number; // 0, 1, 2, 3...
  impressions: number;
  roomEntries: number;   // Click-through into live stream
  clickThroughRatePercent: number; // (roomEntries / impressions) * 100
  averageDwellTimeSeconds: number;
  downstreamPurchases: number;
  downstreamRevenueCredits: number;
  entryToPurchaseConversionPercent: number;
}

export interface FeedPositionResult {
  timeframe: AnalyticsTimeframe;
  periodStart: string;
  periodEnd: string;
  topConvertingPositions: FeedPositionMetric[];
  bestPositionForRoomEntries: {
    positionIndex: number;
    roomEntries: number;
    clickThroughRatePercent: number;
  };
  totalFeedImpressions: number;
  totalRoomEntries: number;
  overallFeedCTRPercent: number;
  computedFromMart: boolean;
  generatedAt: string;
}

// ============================================================================
// 3. ANALYTICAL MART SCHEMAS (Pre-Aggregated Read-Optimized Records)
// ============================================================================

export interface SessionRevenueMartRecord {
  id: string;
  bucketDate: string; // YYYY-MM-DD
  creatorProfileId: string;
  category: "INTERACTIVE_SESSION" | "PRIVATE_SESSION" | "TOY_CONTROL" | "GOAL_CONTRIBUTION" | "PAID_MESSAGE" | "LIVE_TIP";
  grossCredits: number;
  platformRakeCredits: number;
  netCreatorCredits: number;
  transactionCount: number;
  uniqueBuyers: number;
  updatedAt: string;
}

export interface LiveRoomFunnelMartRecord {
  id: string;
  livestreamId: string;
  creatorProfileId: string;
  streamDate: string;
  totalImpressions: number;
  totalRoomEntries: number;
  uniqueViewers: number;
  engagedChatters: number;
  purchasingViewers: number;
  conversionRatePercent: number;
  totalGrossCredits: number;
  updatedAt: string;
}

export interface CreatorRetentionMartRecord {
  id: string;
  creatorProfileId: string;
  calculatedPeriodDate: string;
  totalFans: number;
  averageLifespanDays: number;
  d1ReturnRate: number;
  d7ReturnRate: number;
  d30ReturnRate: number;
  d90ReturnRate: number;
  churnRatePercent: number;
  repeatPurchaseRatePercent: number;
  retentionScore: number;
  updatedAt: string;
}

export interface FeedPositionMartRecord {
  id: string;
  bucketDate: string;
  positionIndex: number;
  impressions: number;
  roomEntries: number;
  ctrPercent: number;
  totalDwellMs: number;
  purchasesCount: number;
  revenueCredits: number;
  updatedAt: string;
}

// ============================================================================
// 4. CREATOR ANALYTICS & HIGH-VALUE FAN ATTRIBUTION CONTRACTS
// ============================================================================

export interface LiveStreamTelemetryMetrics {
  liveViewersCurrent: number;
  averageWatchDurationSeconds: number;
  averageWatchDurationFormatted: string;
  peakViewers: number;
  followersGained: number;
  totalStreamBroadcastMinutes: number;
  totalStreamCount: number;
}

export interface CreatorRevenueStreamMetrics {
  subscriptionsCredits: number;
  subscriptionsFiatEur: number;
  ppvRevenueCredits: number;
  ppvRevenueFiatEur: number;
  giftRevenueCredits: number;
  giftRevenueFiatEur: number;
  interactionRevenueCredits: number;
  interactionRevenueFiatEur: number;
  privateSessionRevenueCredits: number;
  privateSessionRevenueFiatEur: number;
  paidMessageRevenueCredits: number;
  paidMessageRevenueFiatEur: number;
  totalGrossRevenueCredits: number;
  totalGrossRevenueFiatEur: number;
  totalNetCreatorCredits: number;
  totalNetCreatorFiatEur: number;
  platformRakeCredits: number;
  activeSubscribersCount: number;
  payingFansCount: number;
  averageRevenuePerPayingFanCredits: number;
}

export interface TopSupporterProfile {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  relationshipTier: "STRANGER" | "SUPPORTER" | "SUPERFAN" | "VIP_DEVOTEE" | "SOULMATE" | "ROYAL_PATRON";
  relationshipLevel: number;
  totalSpentCredits: number;
  totalTransactionsCount: number;
  isRepeatPurchaser: boolean;
  isSubscriber: boolean;
  firstConversionActivity: string;
  daysActive: number;
  lastActiveAt: string;
}

export interface FanRetentionAnalysis {
  totalUniqueFans: number;
  averageFanLifespanDays: number;
  retentionRateD1Percent: number;
  retentionRateD7Percent: number;
  retentionRateD30Percent: number;
  retentionRateD90Percent: number;
  churnRateMonthlyPercent: number;
  repeatPurchaserRatePercent: number; // % of paying fans who transact 2+ times
  retentionScore: number; // 0 - 100 composite score
}

export interface RelationshipDistribution {
  strangers: number;
  supporters: number;
  superfans: number;
  vipDevotees: number;
  soulmates: number;
  royalPatrons: number;
  totalRelationships: number;
}

export interface ContentPerformanceMetrics {
  contentId: string;
  title: string;
  contentType: "PHOTO" | "VIDEO" | "AUDIO" | "ALBUM" | "POST" | "BUNDLE";
  thumbnailUrl: string | null;
  priceCredits: number;
  totalViews: number;
  totalPurchases: number;
  grossRevenueCredits: number;
  conversionRatePercent: number;
  isPublished: boolean;
  createdAt: string;
}

export interface ConversionAndRepeatFunnel {
  totalImpressions: number;
  totalRoomEntries: number;
  totalEngagedChatters: number;
  firstTimePurchasers: number;
  repeatPurchasers: number; // 2+ purchases
  highValueFansCount: number; // >500 credits LTV or Superfan+ status
  overallConversionRatePercent: number;
  repeatConversionRatePercent: number;
  highValueYieldPercent: number;
}

export interface ActivityAttributionMetric {
  activityType: string;
  displayName: string;
  category: "INTERACTION" | "PPV" | "PRIVATE_SESSION" | "GOAL" | "TIP" | "PAID_MESSAGE" | "FREE_GAME";
  firstTouchFansCount: number;
  convertedToRepeatHighValueCount: number;
  conversionToHighValueRatePercent: number;
  averageFanLtvCredits: number;
  repeatPurchaseFrequencyAvg: number;
  liftMultiplier: number; // e.g. 4.2x higher than baseline
  averageDaysToSecondPurchase: number;
  recommendationScore: number; // 1-100
  marketplaceInsight: string;
}

export interface HighValueFanAttributionResult {
  headlineInsight: string;
  highValueDefinition: string;
  totalHighValueFansIdentified: number;
  baselineConversionRatePercent: number;
  activitiesAttribution: ActivityAttributionMetric[];
  topActivityForRepeatConversion: {
    activityType: string;
    displayName: string;
    conversionRatePercent: number;
    liftMultiplier: number;
  };
  marketplaceRecommendations: string[];
}

export interface CreatorAnalyticsOverviewResult {
  creatorProfileId: string;
  stageName: string;
  username: string;
  timeframe: AnalyticsTimeframe;
  periodStart: string;
  periodEnd: string;
  liveTelemetry: LiveStreamTelemetryMetrics;
  revenueStreams: CreatorRevenueStreamMetrics;
  topSupporters: TopSupporterProfile[];
  fanRetention: FanRetentionAnalysis;
  relationshipDistribution: RelationshipDistribution;
  contentPerformance: ContentPerformanceMetrics[];
  conversionAndRepeatFunnel: ConversionAndRepeatFunnel;
  highValueFanAttribution: HighValueFanAttributionResult;
  computedFromMart: boolean;
  generatedAt: string;
}

export interface CreatorOverviewMartRecord {
  id: string;
  creatorProfileId: string;
  bucketDate: string;
  liveViewersCurrent: number;
  peakViewers: number;
  avgWatchDurationSeconds: number;
  followersGained: number;
  subscriptionsCredits: number;
  ppvCredits: number;
  giftCredits: number;
  interactionCredits: number;
  privateSessionCredits: number;
  paidMessageCredits: number;
  totalGrossCredits: number;
  platformRakeCredits: number;
  netCreatorCredits: number;
  activeSubscribers: number;
  payingFans: number;
  repeatPurchasers: number;
  updatedAt: string;
}

export interface ActivityAttributionMartRecord {
  id: string;
  creatorProfileId: string;
  activityType: string;
  displayName: string;
  category: "INTERACTION" | "PPV" | "PRIVATE_SESSION" | "GOAL" | "TIP" | "PAID_MESSAGE" | "FREE_GAME";
  firstTouchFans: number;
  convertedHighValueFans: number;
  totalLtvCredits: number;
  totalRepeatPurchases: number;
  totalDaysToSecondPurchase: number;
  updatedAt: string;
}
