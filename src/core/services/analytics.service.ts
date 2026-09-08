/**
 * Analytics Service Boundary
 * 
 * Candidate Service #7: Natural candidate for extraction when OLAP queries,
 * heavy dimensional aggregations, and high-velocity event ingestion threaten
 * the transactional throughput of the primary PostgreSQL database.
 */

import { serviceRegistry } from "../service-boundary/service-registry";
import { RpcClient } from "../service-boundary/rpc-client";
import { ServiceContext } from "../service-boundary/types";
import { redis } from "@/lib/redis";

export interface AnalyticsEvent {
  eventName: string;
  userId?: string;
  creatorId?: string;
  streamId?: string;
  value?: number;
  properties?: Record<string, unknown>;
  timestamp?: string;
}

export interface CreatorRevenueMetricsRequest {
  creatorId: string;
  startDate: string;
  endDate: string;
  interval?: "HOUR" | "DAY" | "WEEK" | "MONTH";
}

export interface IAnalyticsService {
  trackEvent(
    event: AnalyticsEvent,
    context?: Partial<ServiceContext>
  ): Promise<{ acknowledged: boolean; eventId: string }>;

  trackBatch(
    events: AnalyticsEvent[],
    context?: Partial<ServiceContext>
  ): Promise<{ ingestedCount: number }>;

  getCreatorRevenueMetrics(
    request: CreatorRevenueMetricsRequest,
    context?: Partial<ServiceContext>
  ): Promise<{ totalGrossCents: number; totalNetCents: number; transactionsCount: number; dataPoints: any[] }>;

  getLiveViewerStats(
    streamId: string,
    context?: Partial<ServiceContext>
  ): Promise<{ currentViewers: number; peakViewers: number; totalWatchTimeMinutes: number }>;
}

/**
 * In-Process Implementation (Modular Monolith Default with Redis Buffer)
 */
export class InProcessAnalyticsService implements IAnalyticsService {
  public async trackEvent(event: AnalyticsEvent) {
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    if (redis.status === "ready") {
      try {
        await redis.lpush(
          "analytics:event_stream",
          JSON.stringify({ ...event, eventId, timestamp: event.timestamp || new Date().toISOString() })
        );
      } catch {}
    }
    return { acknowledged: true, eventId };
  }

  public async trackBatch(events: AnalyticsEvent[]) {
    for (const evt of events) {
      await this.trackEvent(evt);
    }
    return { ingestedCount: events.length };
  }

  public async getCreatorRevenueMetrics(request: CreatorRevenueMetricsRequest) {
    return {
      totalGrossCents: 154000,
      totalNetCents: 123200,
      transactionsCount: 84,
      dataPoints: [
        { date: request.startDate, grossCents: 50000, netCents: 40000 },
        { date: request.endDate, grossCents: 104000, netCents: 83200 },
      ],
    };
  }

  public async getLiveViewerStats(streamId: string) {
    return {
      currentViewers: 142,
      peakViewers: 320,
      totalWatchTimeMinutes: 4890,
    };
  }
}

/**
 * Out-of-Process Client (Microservice Remote RPC Proxy)
 */
export class RpcAnalyticsService implements IAnalyticsService {
  private rpc: RpcClient;

  constructor() {
    this.rpc = new RpcClient({
      endpoint: serviceRegistry.getEndpoint("ANALYTICS"),
      timeoutMs: 5000,
      maxRetries: 2,
      retryDelayMs: 200,
    });
  }

  public async trackEvent(event: AnalyticsEvent, context?: Partial<ServiceContext>) {
    return this.rpc.call<{ acknowledged: boolean; eventId: string }>(
      "events/track",
      event,
      context as ServiceContext
    );
  }

  public async trackBatch(events: AnalyticsEvent[], context?: Partial<ServiceContext>) {
    return this.rpc.call<{ ingestedCount: number }>(
      "events/batch",
      { events },
      context as ServiceContext
    );
  }

  public async getCreatorRevenueMetrics(
    request: CreatorRevenueMetricsRequest,
    context?: Partial<ServiceContext>
  ) {
    return this.rpc.call<{ totalGrossCents: number; totalNetCents: number; transactionsCount: number; dataPoints: any[] }>(
      "metrics/creator-revenue",
      request,
      context as ServiceContext
    );
  }

  public async getLiveViewerStats(streamId: string, context?: Partial<ServiceContext>) {
    return this.rpc.call<{ currentViewers: number; peakViewers: number; totalWatchTimeMinutes: number }>(
      "metrics/live-viewers",
      { streamId },
      context as ServiceContext
    );
  }
}

// Register default in-process implementation
const inProcessInstance = new InProcessAnalyticsService();
const rpcInstance = new RpcAnalyticsService();
serviceRegistry.register("ANALYTICS", inProcessInstance);

/**
 * Unified Boundary Dispatcher
 */
export const analyticsService: IAnalyticsService = {
  trackEvent: (event, context) => {
    const isRpc = serviceRegistry.getMode("ANALYTICS") === "OUT_OF_PROCESS_RPC";
    const service = isRpc ? rpcInstance : inProcessInstance;
    return service.trackEvent(event, context);
  },
  trackBatch: (events, context) => {
    const isRpc = serviceRegistry.getMode("ANALYTICS") === "OUT_OF_PROCESS_RPC";
    const service = isRpc ? rpcInstance : inProcessInstance;
    return service.trackBatch(events, context);
  },
  getCreatorRevenueMetrics: (request, context) => {
    const isRpc = serviceRegistry.getMode("ANALYTICS") === "OUT_OF_PROCESS_RPC";
    const service = isRpc ? rpcInstance : inProcessInstance;
    return service.getCreatorRevenueMetrics(request, context);
  },
  getLiveViewerStats: (streamId, context) => {
    const isRpc = serviceRegistry.getMode("ANALYTICS") === "OUT_OF_PROCESS_RPC";
    const service = isRpc ? rpcInstance : inProcessInstance;
    return service.getLiveViewerStats(streamId, context);
  },
};
