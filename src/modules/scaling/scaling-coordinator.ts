import { clusterService } from "./stateless-cluster.service";
import { distributedCache } from "./distributed-cache.service";
import { distributedLock } from "./distributed-lock.service";
import { distributedRateLimiter } from "./distributed-rate-limiter.service";
import { authoritativeDatastore } from "./authoritative-datastore.service";
import { mediaScaling } from "./media-scaling.service";
import { workerScaling } from "./worker-scaling.service";
import {
  ScalingTier,
  ScalingTierConfig,
} from "./types";

export const SCALING_TIER_CONFIGS: Record<ScalingTier, ScalingTierConfig> = {
  TIER_1K: {
    tier: "TIER_1K",
    targetConcurrency: 1000,
    appInstanceCount: 2,
    workerConcurrency: 10,
    cacheLayer: "NONE",
    mediaRouting: "DIRECT_EDGE",
    presenceMechanism: "SET",
    dbStrategy: "SINGLE_PRIMARY",
  },
  TIER_100K: {
    tier: "TIER_100K",
    targetConcurrency: 100000,
    appInstanceCount: 8,
    workerConcurrency: 50,
    cacheLayer: "L2_REDIS",
    mediaRouting: "GEO_DISTRIBUTED_CDN",
    presenceMechanism: "ZSET",
    dbStrategy: "PRIMARY_WITH_READ_REPLICAS",
  },
  TIER_MILLIONS: {
    tier: "TIER_MILLIONS",
    targetConcurrency: 1000000,
    appInstanceCount: 32,
    workerConcurrency: 250,
    cacheLayer: "TIERED_L1_L2_XFETCH",
    mediaRouting: "GEO_DISTRIBUTED_CDN",
    presenceMechanism: "HYPERLOGLOG",
    dbStrategy: "PARTITIONED_POOL",
  },
};

/**
 * Scaling Coordinator
 * 
 * Orchestrates platform scaling across all architectural tiers:
 * 1. 1,000 Users: Minimal operational overhead, single database, direct streaming edge.
 * 2. 100,000 Users: Redis L2 caching, pub/sub fanout, background worker offload.
 * 3. Millions of Users: Stateless horizontal app layer, L1+L2 tiered cache with XFetch,
 *    Redlock distributed locking, HyperLogLog presence, and decoupled media CDN distribution.
 */
export class ScalingCoordinator {
  private currentTier: ScalingTier = "TIER_MILLIONS";

  public getTierConfig(tier: ScalingTier = this.currentTier): ScalingTierConfig {
    return SCALING_TIER_CONFIGS[tier];
  }

  public setTier(tier: ScalingTier): void {
    this.currentTier = tier;
  }

  /**
   * Generates comprehensive telemetry across all scaling subsystems.
   */
  public async getComprehensiveTelemetry() {
    const cluster = await clusterService.getClusterState();
    const cache = distributedCache.getStats();
    const db = authoritativeDatastore.getMetrics();
    const media = mediaScaling.getMetrics();
    const workers = await workerScaling.evaluateAutoScaling();

    return {
      activeTier: this.currentTier,
      config: SCALING_TIER_CONFIGS[this.currentTier],
      cluster: {
        totalNodes: cluster.totalNodes,
        healthyNodes: cluster.healthyNodes,
        clusterRps: cluster.clusterRps,
        leaderNodeId: cluster.leaderNodeId,
      },
      cache: {
        l1Hits: cache.l1Hits,
        l2Hits: cache.l2Hits,
        dbAuthoritativeFetches: cache.dbAuthoritativeFetches,
        hitRatioPercent: cache.hitRatio,
        xfetchEarlyRecomputations: cache.xfetchEarlyRecomputations,
      },
      database: {
        authoritativeWrites: db.totalWritesAuthoritative,
        replicaReads: db.totalReadsReplica,
        avgQueryDurationMs: db.averageQueryDurationMs,
        poolSaturation: `${db.poolSaturationPercent}%`,
      },
      media: {
        totalViewers: media.totalViewers,
        edgeEgressGbps: media.edgeEgressBandwidthGbps,
        appServerVideoBandwidthBytes: media.appServerVideoBandwidthBytes, // ALWAYS 0
        presenceMemoryBytes: media.presenceMemoryBytes,
        presenceAlgorithm: media.presenceAlgorithm,
      },
      workers: {
        activeInstances: workers.activeWorkerInstances,
        totalCapacity: workers.totalWorkerCapacity,
        queueDepth: workers.queueDepth,
        slaLagSeconds: workers.slaLagSeconds,
        lastScaleAction: workers.lastScaleAction,
      },
    };
  }
}

// Global Singleton
const globalForScalingCoord = globalThis as unknown as {
  __scalingCoordinator?: ScalingCoordinator;
};

export const scalingCoordinator =
  globalForScalingCoord.__scalingCoordinator ?? new ScalingCoordinator();

if (process.env.NODE_ENV !== "production") {
  globalForScalingCoord.__scalingCoordinator = scalingCoordinator;
}
