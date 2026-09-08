/**
 * Scaling Architecture Types & Contracts
 * 
 * Defines data structures and operational interfaces for:
 * 1. Stateless horizontal application instances
 * 2. PostgreSQL authoritative storage & read replicas
 * 3. Redis shared temporary state (L2 cache, locks, rate limits, pub/sub)
 * 4. Decoupled media infrastructure & edge CDN delivery
 * 5. Independent scalable background worker pools
 * 6. Scaling operational regimes (1K, 100K, Millions)
 */

export type ScalingTier = "TIER_1K" | "TIER_100K" | "TIER_MILLIONS";

export interface ScalingTierConfig {
  tier: ScalingTier;
  targetConcurrency: number;
  appInstanceCount: number;
  workerConcurrency: number;
  cacheLayer: "NONE" | "L2_REDIS" | "TIERED_L1_L2_XFETCH";
  mediaRouting: "DIRECT_EDGE" | "GEO_DISTRIBUTED_CDN";
  presenceMechanism: "SET" | "ZSET" | "HYPERLOGLOG";
  dbStrategy: "SINGLE_PRIMARY" | "PRIMARY_WITH_READ_REPLICAS" | "PARTITIONED_POOL";
}

// ----------------------------------------------------------------------------
// 1. STATELESS APPLICATION CLUSTER
// ----------------------------------------------------------------------------

export type AppNodeStatus = "STARTING" | "HEALTHY" | "DRAINING" | "OFFLINE";

export interface AppNodeInfo {
  nodeId: string;
  hostname: string;
  pid: number;
  port: number;
  region: string;
  status: AppNodeStatus;
  startedAt: number;
  lastHeartbeat: number;
  activeRequests: number;
  totalRequestsHandled: number;
  memoryUsageMb: number;
}

export interface ClusterState {
  totalNodes: number;
  healthyNodes: number;
  nodes: AppNodeInfo[];
  clusterRps: number;
  leaderNodeId: string;
}

export interface StatelessSession {
  sessionId: string;
  userId: string;
  role: "FAN" | "CREATOR" | "ADMIN";
  claims: Record<string, unknown>;
  createdAt: number;
  expiresAt: number;
  lastActiveAt: number;
}

// ----------------------------------------------------------------------------
// 2. DISTRIBUTED CACHING (L1 IN-MEMORY + L2 REDIS + XFETCH STAMPEDE PROTECTION)
// ----------------------------------------------------------------------------

export interface CacheOptions {
  ttlSeconds?: number;
  staleWhileRevalidateSeconds?: number;
  tags?: string[];
  /**
   * Delta parameter for XFetch probabilistic early recomputation algorithm.
   * Prevents cache stampede / thundering herds at millions of users.
   */
  xfetchBeta?: number;
  forceFresh?: boolean;
}

export interface CacheEntryMetadata {
  key: string;
  createdAt: number;
  ttlSeconds: number;
  computationTimeMs: number;
  tags: string[];
  version: number;
}

export interface CacheEntryWrapper<T = unknown> {
  data: T;
  meta: CacheEntryMetadata;
}

export interface CacheStats {
  l1Hits: number;
  l2Hits: number;
  dbAuthoritativeFetches: number;
  xfetchEarlyRecomputations: number;
  invalidationsBroadcasted: number;
  hitRatio: number;
}

// ----------------------------------------------------------------------------
// 3. DISTRIBUTED LOCKS (REDLOCK / ATOMIC LEASES)
// ----------------------------------------------------------------------------

export interface LockLease {
  resource: string;
  lockToken: string;
  acquiredAt: number;
  expiresAt: number;
  ttlMs: number;
  isHeld: boolean;
}

export interface LockOptions {
  ttlMs?: number;
  acquireTimeoutMs?: number;
  retryDelayMs?: number;
  autoRenew?: boolean;
}

// ----------------------------------------------------------------------------
// 4. DISTRIBUTED RATE LIMITING (SLIDING WINDOW)
// ----------------------------------------------------------------------------

export interface RateLimitConfig {
  keyPrefix: string;
  limit: number;
  windowSeconds: number;
  burstCapacity?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
  retryAfterSeconds: number;
  currentCount: number;
}

// ----------------------------------------------------------------------------
// 5. AUTHORITATIVE PERSISTENCE LAYER (POSTGRESQL & POOLING)
// ----------------------------------------------------------------------------

export interface DatabaseOperationMetrics {
  totalWritesAuthoritative: number;
  totalReadsReplica: number;
  totalReadsPrimary: number;
  activeConnections: number;
  poolSaturationPercent: number;
  averageQueryDurationMs: number;
}

// ----------------------------------------------------------------------------
// 6. DECOUPLED MEDIA DISTRIBUTION & PRESENCE SCALING
// ----------------------------------------------------------------------------

export interface MediaScalingMetrics {
  totalViewers: number;
  edgeEgressBandwidthGbps: number;
  appServerVideoBandwidthBytes: number; // Invariant: ALWAYS 0
  activeLivestreams: number;
  presenceMemoryBytes: number;
  presenceAlgorithm: "HYPERLOGLOG" | "ZSET" | "SET";
}

export interface SignedEdgePlaybackToken {
  token: string;
  streamId: string;
  userId: string;
  cdnEdgeUrl: string;
  whepEdgeUrl: string;
  expiresAt: number;
  edgeRegion: string;
}

// ----------------------------------------------------------------------------
// 7. INDEPENDENT WORKER FLEET SCALING
// ----------------------------------------------------------------------------

export interface WorkerScalingMetrics {
  activeWorkerInstances: number;
  concurrencyPerInstance: number;
  totalWorkerCapacity: number;
  queueDepth: number;
  slaLagSeconds: number;
  targetWorkerInstances: number;
  lastScaleAction: "SCALE_UP" | "SCALE_DOWN" | "STEADY";
  throughputJobsPerSecond: number;
}
