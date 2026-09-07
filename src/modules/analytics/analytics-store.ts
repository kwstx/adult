/**
 * Analytical Data Store & Pre-Aggregated Data Marts (OLAP Layer)
 * 
 * Provides read-optimized analytical data storage and aggregation marts:
 * 1. Session Revenue Mart (Aggregations by category, date, and creator)
 * 2. Live Room Funnel Mart (Impressions, Entries, Chatters, Buyers, Conversion Rate)
 * 3. Creator Fan Retention Mart (Lifespan, D1/D7/D30/D90 return rates, Retention Score)
 * 4. Feed Position Performance Mart (Position index, Impressions, Entries, CTR, Conversions)
 * 
 * Purpose:
 * Prevents running heavy table scans, multi-table joins, and temporal aggregations
 * on primary transactional PostgreSQL tables during high-load live streaming.
 */

import {
  SessionRevenueMartRecord,
  LiveRoomFunnelMartRecord,
  CreatorRetentionMartRecord,
  FeedPositionMartRecord,
  CreatorOverviewMartRecord,
  ActivityAttributionMartRecord,
  ContentPerformanceMetrics,
  TopSupporterProfile,
  DateRange,
  AnalyticsTimeframe,
} from "./types";

export class AnalyticsStore {
  // In-memory analytical data marts (syncable with persistent storage or OLAP replica)
  private static sessionRevenueMart: Map<string, SessionRevenueMartRecord> = new Map();
  private static liveRoomFunnelMart: Map<string, LiveRoomFunnelMartRecord> = new Map();
  private static creatorRetentionMart: Map<string, CreatorRetentionMartRecord> = new Map();
  private static feedPositionMart: Map<string, FeedPositionMartRecord> = new Map();
  private static creatorOverviewMart: Map<string, CreatorOverviewMartRecord> = new Map();
  private static activityAttributionMart: Map<string, ActivityAttributionMartRecord> = new Map();
  private static contentPerformanceMart: Map<string, ContentPerformanceMetrics> = new Map();
  private static creatorSupportersMart: Map<string, TopSupporterProfile[]> = new Map();

  // Helper to generate timeframe date boundaries
  public static resolveTimeframeDates(
    timeframe: AnalyticsTimeframe = "LAST_7_DAYS",
    customRange?: DateRange
  ): { startDate: Date; endDate: Date } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    if (timeframe === "CUSTOM" && customRange) {
      return {
        startDate: new Date(customRange.startDate),
        endDate: new Date(customRange.endDate),
      };
    }

    switch (timeframe) {
      case "LAST_24_HOURS":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "LAST_7_DAYS":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "LAST_30_DAYS":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "LAST_90_DAYS":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate };
  }

  // ==========================================================================
  // 1. SESSION REVENUE MART
  // ==========================================================================

  public static upsertSessionRevenueRecord(record: SessionRevenueMartRecord): void {
    const key = `${record.bucketDate}:${record.creatorProfileId}:${record.category}`;
    const existing = this.sessionRevenueMart.get(key);

    if (existing) {
      existing.grossCredits += record.grossCredits;
      existing.platformRakeCredits += record.platformRakeCredits;
      existing.netCreatorCredits += record.netCreatorCredits;
      existing.transactionCount += record.transactionCount;
      existing.uniqueBuyers = Math.max(existing.uniqueBuyers, record.uniqueBuyers);
      existing.updatedAt = new Date().toISOString();
    } else {
      this.sessionRevenueMart.set(key, { ...record, id: key });
    }
  }

  public static querySessionRevenueMart(params: {
    startDate: Date;
    endDate: Date;
    creatorProfileId?: string;
    categories?: string[];
  }): SessionRevenueMartRecord[] {
    const results: SessionRevenueMartRecord[] = [];
    const startIso = params.startDate.toISOString().slice(0, 10);
    const endIso = params.endDate.toISOString().slice(0, 10);

    for (const record of this.sessionRevenueMart.values()) {
      if (record.bucketDate >= startIso && record.bucketDate <= endIso) {
        if (params.creatorProfileId && record.creatorProfileId !== params.creatorProfileId) {
          continue;
        }
        if (params.categories && params.categories.length > 0 && !params.categories.includes(record.category)) {
          continue;
        }
        results.push(record);
      }
    }

    return results;
  }

  // ==========================================================================
  // 2. LIVE ROOM FUNNEL MART
  // ==========================================================================

  public static upsertLiveRoomFunnelRecord(record: LiveRoomFunnelMartRecord): void {
    const key = record.livestreamId;
    this.liveRoomFunnelMart.set(key, { ...record, id: key });
  }

  public static queryLiveRoomFunnelMart(params: {
    startDate: Date;
    endDate: Date;
    livestreamId?: string;
    creatorProfileId?: string;
  }): LiveRoomFunnelMartRecord[] {
    const results: LiveRoomFunnelMartRecord[] = [];
    const startIso = params.startDate.toISOString().slice(0, 10);
    const endIso = params.endDate.toISOString().slice(0, 10);

    for (const record of this.liveRoomFunnelMart.values()) {
      if (params.livestreamId && record.livestreamId !== params.livestreamId) {
        continue;
      }
      if (params.creatorProfileId && record.creatorProfileId !== params.creatorProfileId) {
        continue;
      }
      if (record.streamDate >= startIso && record.streamDate <= endIso) {
        results.push(record);
      }
    }

    return results;
  }

  // ==========================================================================
  // 3. CREATOR RETENTION MART
  // ==========================================================================

  public static upsertCreatorRetentionRecord(record: CreatorRetentionMartRecord): void {
    const key = record.creatorProfileId;
    this.creatorRetentionMart.set(key, { ...record, id: key });
  }

  public static queryCreatorRetentionMart(params: {
    limit?: number;
    minFans?: number;
    creatorProfileId?: string;
  }): CreatorRetentionMartRecord[] {
    let records = Array.from(this.creatorRetentionMart.values());

    if (params.creatorProfileId) {
      records = records.filter((r) => r.creatorProfileId === params.creatorProfileId);
    }

    if (params.minFans) {
      records = records.filter((r) => r.totalFans >= (params.minFans || 0));
    }

    return records;
  }

  // ==========================================================================
  // 4. FEED POSITION MART
  // ==========================================================================

  public static upsertFeedPositionRecord(record: FeedPositionMartRecord): void {
    const key = `${record.bucketDate}:${record.positionIndex}`;
    const existing = this.feedPositionMart.get(key);

    if (existing) {
      existing.impressions += record.impressions;
      existing.roomEntries += record.roomEntries;
      existing.totalDwellMs += record.totalDwellMs;
      existing.purchasesCount += record.purchasesCount;
      existing.revenueCredits += record.revenueCredits;
      existing.ctrPercent =
        existing.impressions > 0
          ? Number(((existing.roomEntries / existing.impressions) * 100).toFixed(2))
          : 0;
      existing.updatedAt = new Date().toISOString();
    } else {
      this.feedPositionMart.set(key, { ...record, id: key });
    }
  }

  public static queryFeedPositionMart(params: {
    startDate: Date;
    endDate: Date;
    maxPosition?: number;
  }): FeedPositionMartRecord[] {
    const results: FeedPositionMartRecord[] = [];
    const startIso = params.startDate.toISOString().slice(0, 10);
    const endIso = params.endDate.toISOString().slice(0, 10);

    for (const record of this.feedPositionMart.values()) {
      if (record.bucketDate >= startIso && record.bucketDate <= endIso) {
        if (params.maxPosition !== undefined && record.positionIndex > params.maxPosition) {
          continue;
        }
        results.push(record);
      }
    }

    return results;
  }

  // ==========================================================================
  // 5. CREATOR OVERVIEW MART
  // ==========================================================================

  public static upsertCreatorOverviewRecord(record: CreatorOverviewMartRecord): void {
    const key = `${record.bucketDate}:${record.creatorProfileId}`;
    const existing = this.creatorOverviewMart.get(key);

    if (existing) {
      existing.liveViewersCurrent = record.liveViewersCurrent;
      existing.peakViewers = Math.max(existing.peakViewers, record.peakViewers);
      existing.avgWatchDurationSeconds = Math.round(
        (existing.avgWatchDurationSeconds + record.avgWatchDurationSeconds) / 2
      );
      existing.followersGained += record.followersGained;
      existing.subscriptionsCredits += record.subscriptionsCredits;
      existing.ppvCredits += record.ppvCredits;
      existing.giftCredits += record.giftCredits;
      existing.interactionCredits += record.interactionCredits;
      existing.privateSessionCredits += record.privateSessionCredits;
      existing.paidMessageCredits += record.paidMessageCredits;
      existing.totalGrossCredits += record.totalGrossCredits;
      existing.platformRakeCredits += record.platformRakeCredits;
      existing.netCreatorCredits += record.netCreatorCredits;
      existing.activeSubscribers = Math.max(existing.activeSubscribers, record.activeSubscribers);
      existing.payingFans += record.payingFans;
      existing.repeatPurchasers += record.repeatPurchasers;
      existing.updatedAt = new Date().toISOString();
    } else {
      this.creatorOverviewMart.set(key, { ...record, id: key });
    }
  }

  public static queryCreatorOverviewMart(params: {
    startDate: Date;
    endDate: Date;
    creatorProfileId: string;
  }): CreatorOverviewMartRecord[] {
    const results: CreatorOverviewMartRecord[] = [];
    const startIso = params.startDate.toISOString().slice(0, 10);
    const endIso = params.endDate.toISOString().slice(0, 10);

    for (const record of this.creatorOverviewMart.values()) {
      if (
        record.creatorProfileId === params.creatorProfileId &&
        record.bucketDate >= startIso &&
        record.bucketDate <= endIso
      ) {
        results.push(record);
      }
    }

    return results;
  }

  // ==========================================================================
  // 6. ACTIVITY ATTRIBUTION MART (NORTH STAR: VIEWER -> REPEAT HIGH-VALUE FAN)
  // ==========================================================================

  public static upsertActivityAttributionRecord(record: ActivityAttributionMartRecord): void {
    const key = `${record.creatorProfileId}:${record.activityType}`;
    const existing = this.activityAttributionMart.get(key);

    if (existing) {
      existing.firstTouchFans += record.firstTouchFans;
      existing.convertedHighValueFans += record.convertedHighValueFans;
      existing.totalLtvCredits += record.totalLtvCredits;
      existing.totalRepeatPurchases += record.totalRepeatPurchases;
      existing.totalDaysToSecondPurchase += record.totalDaysToSecondPurchase;
      existing.updatedAt = new Date().toISOString();
    } else {
      this.activityAttributionMart.set(key, { ...record, id: key });
    }
  }

  public static queryActivityAttributionMart(creatorProfileId: string): ActivityAttributionMartRecord[] {
    const results: ActivityAttributionMartRecord[] = [];
    for (const record of this.activityAttributionMart.values()) {
      if (record.creatorProfileId === creatorProfileId) {
        results.push(record);
      }
    }
    return results;
  }

  // ==========================================================================
  // 7. CONTENT PERFORMANCE MART
  // ==========================================================================

  public static upsertContentPerformanceRecord(creatorProfileId: string, record: ContentPerformanceMetrics): void {
    const key = `${creatorProfileId}:${record.contentId}`;
    this.contentPerformanceMart.set(key, record);
  }

  public static queryContentPerformanceMart(creatorProfileId: string): ContentPerformanceMetrics[] {
    const results: ContentPerformanceMetrics[] = [];
    const prefix = `${creatorProfileId}:`;
    for (const [key, record] of this.contentPerformanceMart.entries()) {
      if (key.startsWith(prefix)) {
        results.push(record);
      }
    }
    return results;
  }

  // ==========================================================================
  // 8. CREATOR TOP SUPPORTERS MART
  // ==========================================================================

  public static setCreatorTopSupporters(creatorProfileId: string, supporters: TopSupporterProfile[]): void {
    this.creatorSupportersMart.set(creatorProfileId, supporters);
  }

  public static queryCreatorTopSupporters(creatorProfileId: string): TopSupporterProfile[] {
    return this.creatorSupportersMart.get(creatorProfileId) || [];
  }

  // ==========================================================================
  // RESET / TESTING UTILITIES
  // ==========================================================================

  public static resetForTesting(): void {
    this.sessionRevenueMart.clear();
    this.liveRoomFunnelMart.clear();
    this.creatorRetentionMart.clear();
    this.feedPositionMart.clear();
    this.creatorOverviewMart.clear();
    this.activityAttributionMart.clear();
    this.contentPerformanceMart.clear();
    this.creatorSupportersMart.clear();
  }

  public static getMartStats() {
    return {
      sessionRevenueRecords: this.sessionRevenueMart.size,
      liveRoomFunnelRecords: this.liveRoomFunnelMart.size,
      creatorRetentionRecords: this.creatorRetentionMart.size,
      feedPositionRecords: this.feedPositionMart.size,
      creatorOverviewRecords: this.creatorOverviewMart.size,
      activityAttributionRecords: this.activityAttributionMart.size,
      contentPerformanceRecords: this.contentPerformanceMart.size,
      creatorSupportersRecords: this.creatorSupportersMart.size,
    };
  }
}

