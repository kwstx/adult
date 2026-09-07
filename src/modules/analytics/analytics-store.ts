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
  DateRange,
  AnalyticsTimeframe,
} from "./types";

export class AnalyticsStore {
  // In-memory analytical data marts (syncable with persistent storage or OLAP replica)
  private static sessionRevenueMart: Map<string, SessionRevenueMartRecord> = new Map();
  private static liveRoomFunnelMart: Map<string, LiveRoomFunnelMartRecord> = new Map();
  private static creatorRetentionMart: Map<string, CreatorRetentionMartRecord> = new Map();
  private static feedPositionMart: Map<string, FeedPositionMartRecord> = new Map();

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
  // RESET / TESTING UTILITIES
  // ==========================================================================

  public static resetForTesting(): void {
    this.sessionRevenueMart.clear();
    this.liveRoomFunnelMart.clear();
    this.creatorRetentionMart.clear();
    this.feedPositionMart.clear();
  }

  public static getMartStats() {
    return {
      sessionRevenueRecords: this.sessionRevenueMart.size,
      liveRoomFunnelRecords: this.liveRoomFunnelMart.size,
      creatorRetentionRecords: this.creatorRetentionMart.size,
      feedPositionRecords: this.feedPositionMart.size,
    };
  }
}
