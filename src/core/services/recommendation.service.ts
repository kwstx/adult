/**
 * Recommendation Service Boundary
 * 
 * Candidate Service #4: Natural candidate for extraction when ML inference,
 * vector embedding similarity, and collaborative filtering overload web application CPUs.
 */

import { serviceRegistry } from "../service-boundary/service-registry";
import { RpcClient } from "../service-boundary/rpc-client";
import { ServiceContext } from "../service-boundary/types";
import { calculateCandidateScore } from "@/lib/recommendations/scoring-engine";

export interface FeedRecommendationRequest {
  userId?: string;
  category?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface RecommendationCandidate {
  streamId: string;
  creatorId: string;
  score: number;
  reasons: string[];
}

export interface IRecommendationService {
  getLiveFeedRecommendations(
    request: FeedRecommendationRequest,
    context?: Partial<ServiceContext>
  ): Promise<{ items: RecommendationCandidate[]; algorithmVersion: string }>;

  calculateUserCreatorAffinity(
    userId: string,
    creatorId: string,
    context?: Partial<ServiceContext>
  ): Promise<{ affinityScore: number; tier: "LOW" | "MEDIUM" | "HIGH" | "ULTRA" }>;

  recordInteractionSignal(
    userId: string,
    creatorId: string,
    signalType: "WATCH_TIME" | "CHAT" | "GIFT" | "TIP" | "SUBSCRIBE",
    magnitude?: number,
    context?: Partial<ServiceContext>
  ): Promise<{ acknowledged: boolean }>;
}

/**
 * In-Process Implementation (Modular Monolith Default)
 */
export class InProcessRecommendationService implements IRecommendationService {
  public async getLiveFeedRecommendations(request: FeedRecommendationRequest) {
    const limit = request.limit || 20;
    try {
      const liveStreams = [
        {
          streamId: "stream_1",
          creatorId: "creator_maya",
          score: 0.95,
          reasons: ["trending", "high_retention"],
        },
        {
          streamId: "stream_2",
          creatorId: "creator_elena",
          score: 0.88,
          reasons: ["category_match"],
        },
      ];
      return {
        items: liveStreams.slice(0, limit),
        algorithmVersion: "v1.2-inproc",
      };
    } catch {
      return {
        items: [],
        algorithmVersion: "v1.0-fallback",
      };
    }
  }

  public async calculateUserCreatorAffinity(userId: string, creatorId: string) {
    return {
      affinityScore: 78,
      tier: "HIGH" as const,
    };
  }

  public async recordInteractionSignal(
    userId: string,
    creatorId: string,
    signalType: "WATCH_TIME" | "CHAT" | "GIFT" | "TIP" | "SUBSCRIBE",
    magnitude = 1
  ) {
    return { acknowledged: true };
  }
}

/**
 * Out-of-Process Client (Microservice Remote RPC Proxy)
 */
export class RpcRecommendationService implements IRecommendationService {
  private rpc: RpcClient;

  constructor() {
    this.rpc = new RpcClient({
      endpoint: serviceRegistry.getEndpoint("RECOMMENDATION"),
      timeoutMs: 3000,
      maxRetries: 1,
      retryDelayMs: 100,
    });
  }

  public async getLiveFeedRecommendations(
    request: FeedRecommendationRequest,
    context?: Partial<ServiceContext>
  ) {
    return this.rpc.call<{ items: RecommendationCandidate[]; algorithmVersion: string }>(
      "feed/recommendations",
      request,
      context as ServiceContext
    );
  }

  public async calculateUserCreatorAffinity(
    userId: string,
    creatorId: string,
    context?: Partial<ServiceContext>
  ) {
    return this.rpc.call<{ affinityScore: number; tier: "LOW" | "MEDIUM" | "HIGH" | "ULTRA" }>(
      "affinity/score",
      { userId, creatorId },
      context as ServiceContext
    );
  }

  public async recordInteractionSignal(
    userId: string,
    creatorId: string,
    signalType: "WATCH_TIME" | "CHAT" | "GIFT" | "TIP" | "SUBSCRIBE",
    magnitude?: number,
    context?: Partial<ServiceContext>
  ) {
    return this.rpc.call<{ acknowledged: boolean }>(
      "signals/ingest",
      { userId, creatorId, signalType, magnitude },
      context as ServiceContext
    );
  }
}

// Register default in-process implementation
const inProcessInstance = new InProcessRecommendationService();
const rpcInstance = new RpcRecommendationService();
serviceRegistry.register("RECOMMENDATION", inProcessInstance);

/**
 * Unified Boundary Dispatcher
 */
export const recommendationService: IRecommendationService = {
  getLiveFeedRecommendations: (request, context) => {
    const isRpc = serviceRegistry.getMode("RECOMMENDATION") === "OUT_OF_PROCESS_RPC";
    const service = isRpc ? rpcInstance : inProcessInstance;
    return service.getLiveFeedRecommendations(request, context);
  },
  calculateUserCreatorAffinity: (userId, creatorId, context) => {
    const isRpc = serviceRegistry.getMode("RECOMMENDATION") === "OUT_OF_PROCESS_RPC";
    const service = isRpc ? rpcInstance : inProcessInstance;
    return service.calculateUserCreatorAffinity(userId, creatorId, context);
  },
  recordInteractionSignal: (userId, creatorId, signalType, magnitude, context) => {
    const isRpc = serviceRegistry.getMode("RECOMMENDATION") === "OUT_OF_PROCESS_RPC";
    const service = isRpc ? rpcInstance : inProcessInstance;
    return service.recordInteractionSignal(userId, creatorId, signalType, magnitude, context);
  },
};
