/**
 * Creator Analytics Event Hub Subscriber
 *
 * Real-time operational metric aggregator for Creator Control Rooms:
 * - Live stream gross and net earnings
 * - Viewer-to-payer conversion rates
 * - Top monetizing content & interaction breakdown
 * - Milestone goal completions
 */

import { eventBus } from "@/modules/realtime/event-bus";
import { UserJoinedLivePayload, UserSentGiftPayload, UserBoughtContentPayload, SessionBookedPayload, GoalProgressedPayload } from "../types";
import { StructuredLogger } from "@/core/observability";

export interface CreatorRealtimeMetrics {
  creatorProfileId: string;
  activeViewers: number;
  totalTipsGross: number;
  totalPpvGross: number;
  totalSessionsGross: number;
  totalRevenueNet: number;
  uniquePayerIds: Set<string>;
  conversionRatePercent: number;
  lastUpdated: Date;
}

const creatorRealtimeStore = new Map<string, CreatorRealtimeMetrics>();

export class CreatorAnalyticsHubSubscriber {
  private static registered = false;
  public static processedCount = 0;

  public static register(): void {
    if (this.registered) return;
    this.registered = true;

    // 1. Live Viewer Joined
    eventBus.on("USER_JOINED_LIVE", (event) => {
      this.processedCount++;
      const payload = event.payload as UserJoinedLivePayload;
      const m = this.getOrCreate(payload.creatorProfileId);
      m.activeViewers++;
      this.recomputeConversion(m);
    });

    // 2. Gift Received
    eventBus.on("USER_SENT_GIFT", (event) => {
      this.processedCount++;
      const payload = event.payload as UserSentGiftPayload;
      const m = this.getOrCreate(payload.creatorProfileId);
      m.totalTipsGross += payload.amountCredits;
      m.totalRevenueNet += payload.creatorNetCredits || Math.floor(payload.amountCredits * 0.8);
      m.uniquePayerIds.add(payload.userId);
      this.recomputeConversion(m);
    });

    // 3. PPV Content Unlocked
    eventBus.on("USER_BOUGHT_CONTENT", (event) => {
      this.processedCount++;
      const payload = event.payload as UserBoughtContentPayload;
      const m = this.getOrCreate(payload.creatorProfileId);
      m.totalPpvGross += payload.priceCreditsPaid;
      m.totalRevenueNet += Math.floor(payload.priceCreditsPaid * 0.8);
      m.uniquePayerIds.add(payload.userId);
      this.recomputeConversion(m);
    });

    // 4. Session Booked
    eventBus.on("SESSION_BOOKED", (event) => {
      this.processedCount++;
      const payload = event.payload as SessionBookedPayload;
      const m = this.getOrCreate(payload.creatorProfileId);
      m.totalSessionsGross += payload.totalCreditsEscrowed;
      m.totalRevenueNet += Math.floor(payload.totalCreditsEscrowed * 0.8);
      m.uniquePayerIds.add(payload.fanId);
      this.recomputeConversion(m);
    });
  }

  private static getOrCreate(creatorProfileId: string): CreatorRealtimeMetrics {
    let m = creatorRealtimeStore.get(creatorProfileId);
    if (!m) {
      m = {
        creatorProfileId,
        activeViewers: 0,
        totalTipsGross: 0,
        totalPpvGross: 0,
        totalSessionsGross: 0,
        totalRevenueNet: 0,
        uniquePayerIds: new Set(),
        conversionRatePercent: 0,
        lastUpdated: new Date(),
      };
      creatorRealtimeStore.set(creatorProfileId, m);
    }
    return m;
  }

  private static recomputeConversion(m: CreatorRealtimeMetrics): void {
    if (m.activeViewers > 0) {
      m.conversionRatePercent = Math.min(100, Math.round((m.uniquePayerIds.size / m.activeViewers) * 100));
    }
    m.lastUpdated = new Date();
  }

  public static getMetrics(creatorProfileId: string): CreatorRealtimeMetrics | null {
    return creatorRealtimeStore.get(creatorProfileId) || null;
  }

  public static _reset(): void {
    this.processedCount = 0;
    creatorRealtimeStore.clear();
  }
}
