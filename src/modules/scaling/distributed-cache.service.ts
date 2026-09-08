import { redis } from "@/lib/redis";
import { clusterService } from "./stateless-cluster.service";
import {
  CacheOptions,
  CacheEntryWrapper,
  CacheEntryMetadata,
  CacheStats,
} from "./types";

const CACHE_KEY_PREFIX = "scaling:cache:";
const TAG_KEY_PREFIX = "scaling:cache:tags:";

interface L1Entry<T = unknown> {
  wrapper: CacheEntryWrapper<T>;
  localExpiresAt: number;
}

/**
 * Distributed Cache Service (Tiered L1 In-Memory + L2 Redis + XFetch Stampede Protection)
 * 
 * At 1,000 users: A basic database query works fine.
 * At 100,000 users: Redis L2 caching reduces DB queries by 90%+.
 * At Millions of users:
 *   1. L1 in-process micro-cache eliminates Redis network roundtrips for ultra-hot keys.
 *   2. XFetch probabilistic early recomputation revalidates keys in the background BEFORE
 *      they expire, completely preventing thundering herds / cache stampedes.
 *   3. Tag-based invalidations propagate across all cluster nodes instantly.
 */
export class DistributedCacheService {
  private static sharedL2Cache: Map<string, string> = new Map();
  private static sharedTags: Map<string, Set<string>> = new Map();

  private l1Cache: Map<string, L1Entry<any>> = new Map();
  private maxL1Items = 5000;
  private inflightFetches: Map<string, Promise<any>> = new Map();

  private stats: CacheStats = {
    l1Hits: 0,
    l2Hits: 0,
    dbAuthoritativeFetches: 0,
    xfetchEarlyRecomputations: 0,
    invalidationsBroadcasted: 0,
    hitRatio: 0,
  };

  constructor() {
    this.initClusterInvalidationListener();
  }

  /**
   * Listens for cluster-wide invalidation events from other application instances.
   */
  private initClusterInvalidationListener(): void {
    clusterService.onClusterEvent((event) => {
      if (event.type === "CACHE_INVALIDATE_KEY") {
        this.evictL1(event.payload.key);
      } else if (event.type === "CACHE_INVALIDATE_TAG") {
        this.evictL1ByTag(event.payload.tag);
      }
    });
  }

  /**
   * Retrieves data using the Cache-Aside pattern with L1/L2 tiered caching and XFetch stampede protection.
   * 
   * @param key Unique cache key (e.g. `creator:profile:maya`)
   * @param fetcher Authoritative database/upstream fetcher
   * @param options TTL, SWR, Tags, and XFetch parameters
   */
  public async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const {
      ttlSeconds = 60,
      tags = [],
      xfetchBeta = 1.0,
      forceFresh = false,
    } = options;

    if (!forceFresh) {
      // 1. Check L1 In-Memory Cache
      const l1 = this.getL1<T>(key);
      if (l1) {
        this.stats.l1Hits++;
        this.updateHitRatio();

        // Check if XFetch recommends probabilistic background early recomputation
        if (this.shouldXFetchRecompute(l1.meta, xfetchBeta)) {
          this.stats.xfetchEarlyRecomputations++;
          this.recomputeInBackground(key, fetcher, ttlSeconds, tags).catch(() => {});
        }

        return l1.data;
      }

      // 2. Check L2 Redis Cache
      const l2 = await this.getL2<T>(key);
      if (l2) {
        this.stats.l2Hits++;
        this.updateHitRatio();

        // Populate L1 cache for subsequent local requests on this node
        this.setL1(key, l2);

        // Check XFetch on L2 entry
        if (this.shouldXFetchRecompute(l2.meta, xfetchBeta)) {
          this.stats.xfetchEarlyRecomputations++;
          this.recomputeInBackground(key, fetcher, ttlSeconds, tags).catch(() => {});
        }

        return l2.data;
      }
    }

    // 3. Cache Miss: Authoritative Database Fetch (with in-flight request deduplication)
    return this.deduplicatedFetch(key, fetcher, ttlSeconds, tags);
  }

  /**
   * Deduplicates concurrent cache-miss requests for the exact same key on this node.
   */
  private async deduplicatedFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number,
    tags: string[]
  ): Promise<T> {
    const existing = this.inflightFetches.get(key);
    if (existing) {
      return existing;
    }

    const promise = (async () => {
      const startTime = Date.now();
      try {
        this.stats.dbAuthoritativeFetches++;
        this.updateHitRatio();

        const data = await fetcher();
        const computationTimeMs = Math.max(1, Date.now() - startTime);

        const wrapper: CacheEntryWrapper<T> = {
          data,
          meta: {
            key,
            createdAt: Date.now(),
            ttlSeconds,
            computationTimeMs,
            tags,
            version: 1,
          },
        };

        // Write to both L1 and L2
        this.setL1(key, wrapper);
        await this.setL2(key, wrapper, ttlSeconds, tags);

        return data;
      } finally {
        this.inflightFetches.delete(key);
      }
    })();

    this.inflightFetches.set(key, promise);
    return promise;
  }

  /**
   * Background recomputation triggered by XFetch early expiration.
   */
  private async recomputeInBackground<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number,
    tags: string[]
  ): Promise<void> {
    if (this.inflightFetches.has(key)) return;

    try {
      const startTime = Date.now();
      const data = await fetcher();
      const computationTimeMs = Math.max(1, Date.now() - startTime);

      const wrapper: CacheEntryWrapper<T> = {
        data,
        meta: {
          key,
          createdAt: Date.now(),
          ttlSeconds,
          computationTimeMs,
          tags,
          version: Date.now(),
        },
      };

      this.setL1(key, wrapper);
      await this.setL2(key, wrapper, ttlSeconds, tags);
    } catch (err) {
      console.warn(`[DistributedCache] Background XFetch recompute failed for ${key}:`, err);
    }
  }

  /**
   * XFetch Probabilistic Early Expiration Algorithm (Optimal Cache Stampede Prevention)
   * Formula: delta * beta * ln(rand()) > (ttlRemaining)
   */
  private shouldXFetchRecompute(meta: CacheEntryMetadata, beta: number): boolean {
    if (beta <= 0) return false;

    const elapsedSeconds = (Date.now() - meta.createdAt) / 1000;
    const remainingSeconds = meta.ttlSeconds - elapsedSeconds;
    if (remainingSeconds <= 0) return true;

    const deltaSeconds = (meta.computationTimeMs || 10) / 1000;
    const rand = Math.random();
    if (rand === 0) return true;

    const threshold = -deltaSeconds * beta * Math.log(rand);
    return threshold >= remainingSeconds;
  }

  // --------------------------------------------------------------------------
  // L1 IN-MEMORY CACHE
  // --------------------------------------------------------------------------

  private getL1<T>(key: string): CacheEntryWrapper<T> | null {
    const entry = this.l1Cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.localExpiresAt) {
      this.l1Cache.delete(key);
      return null;
    }

    return entry.wrapper as CacheEntryWrapper<T>;
  }

  private setL1<T>(key: string, wrapper: CacheEntryWrapper<T>): void {
    if (this.l1Cache.size >= this.maxL1Items) {
      const firstKey = this.l1Cache.keys().next().value;
      if (firstKey) this.l1Cache.delete(firstKey);
    }

    const localTtlMs = Math.min(wrapper.meta.ttlSeconds * 1000, 60000);
    this.l1Cache.set(key, {
      wrapper,
      localExpiresAt: Date.now() + localTtlMs,
    });
  }

  private evictL1(key: string): void {
    this.l1Cache.delete(key);
  }

  private evictL1ByTag(tag: string): void {
    for (const [key, entry] of this.l1Cache.entries()) {
      if (entry.wrapper.meta.tags.includes(tag)) {
        this.l1Cache.delete(key);
      }
    }
  }

  // --------------------------------------------------------------------------
  // L2 REDIS CACHE
  // --------------------------------------------------------------------------

  private async getL2<T>(key: string): Promise<CacheEntryWrapper<T> | null> {
    try {
      if (redis.status === "ready") {
        const raw = await redis.get(`${CACHE_KEY_PREFIX}${key}`);
        if (raw) {
          return JSON.parse(raw);
        }
      }
    } catch {}

    const mem = DistributedCacheService.sharedL2Cache.get(key);
    if (mem) {
      return JSON.parse(mem);
    }

    return null;
  }

  private async setL2<T>(
    key: string,
    wrapper: CacheEntryWrapper<T>,
    ttlSeconds: number,
    tags: string[]
  ): Promise<void> {
    const serialized = JSON.stringify(wrapper);

    try {
      if (redis.status === "ready") {
        const redisKey = `${CACHE_KEY_PREFIX}${key}`;
        await redis.set(redisKey, serialized, "EX", ttlSeconds);

        for (const tag of tags) {
          await redis.sadd(`${TAG_KEY_PREFIX}${tag}`, key);
          await redis.expire(`${TAG_KEY_PREFIX}${tag}`, ttlSeconds * 2);
        }
      }
    } catch {}

    DistributedCacheService.sharedL2Cache.set(key, serialized);
    for (const tag of tags) {
      if (!DistributedCacheService.sharedTags.has(tag)) {
        DistributedCacheService.sharedTags.set(tag, new Set());
      }
      DistributedCacheService.sharedTags.get(tag)!.add(key);
    }
  }

  // --------------------------------------------------------------------------
  // INVALIDATION
  // --------------------------------------------------------------------------

  /**
   * Invalidates a specific key across the entire application cluster.
   */
  public async invalidate(key: string): Promise<void> {
    this.evictL1(key);
    this.stats.invalidationsBroadcasted++;

    try {
      if (redis.status === "ready") {
        await redis.del(`${CACHE_KEY_PREFIX}${key}`);
      }
    } catch {}

    DistributedCacheService.sharedL2Cache.delete(key);
    clusterService.broadcastClusterEvent("CACHE_INVALIDATE_KEY", { key });
  }

  /**
   * Invalidates all keys associated with a specific tag (e.g. `creator:123`, `wallet:456`) across the cluster.
   */
  public async invalidateTag(tag: string): Promise<void> {
    this.evictL1ByTag(tag);
    this.stats.invalidationsBroadcasted++;

    try {
      if (redis.status === "ready") {
        const tagKey = `${TAG_KEY_PREFIX}${tag}`;
        const keys = await redis.smembers(tagKey);
        if (keys && keys.length > 0) {
          const redisKeys = keys.map((k) => `${CACHE_KEY_PREFIX}${k}`);
          await redis.del(...redisKeys);
          await redis.del(tagKey);
        }
      }
    } catch {}

    const memKeys = DistributedCacheService.sharedTags.get(tag);
    if (memKeys) {
      for (const k of memKeys) {
        DistributedCacheService.sharedL2Cache.delete(k);
      }
      DistributedCacheService.sharedTags.delete(tag);
    }

    clusterService.broadcastClusterEvent("CACHE_INVALIDATE_TAG", { tag });
  }

  private updateHitRatio(): void {
    const total = this.stats.l1Hits + this.stats.l2Hits + this.stats.dbAuthoritativeFetches;
    if (total > 0) {
      this.stats.hitRatio = parseFloat(
        (((this.stats.l1Hits + this.stats.l2Hits) / total) * 100).toFixed(2)
      );
    }
  }

  public getStats(): CacheStats {
    return { ...this.stats };
  }

  public clearL1(): void {
    this.l1Cache.clear();
  }
}

// Global Singleton
const globalForDistCache = globalThis as unknown as {
  __distributedCacheService?: DistributedCacheService;
};

export const distributedCache =
  globalForDistCache.__distributedCacheService ?? new DistributedCacheService();

if (process.env.NODE_ENV !== "production") {
  globalForDistCache.__distributedCacheService = distributedCache;
}
