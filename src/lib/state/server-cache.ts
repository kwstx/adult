/**
 * Server State Cache Engine
 * Authoritative client-side cache manager for backend data.
 * Features:
 * - Query key normalization and deduplication
 * - Stale-while-revalidate (SWR) semantics
 * - Event-driven & tag-based cache invalidation
 * - Optimistic updates with snapshot rollback
 * - Pub/Sub subscription notifications for React components
 */

export type QueryKeyPrimitive = string | number | boolean | null | undefined;
export type QueryKey = QueryKeyPrimitive | QueryKeyPrimitive[];

export type QueryStatus = "idle" | "loading" | "success" | "error";

export interface CacheEntry<T = any> {
  key: string;
  data: T | null;
  error: Error | null;
  status: QueryStatus;
  updatedAt: number;
  staleTime: number;
  isFetching: boolean;
  tags: string[];
  subscribers: Set<(entry: CacheEntry<T>) => void>;
}

export interface SetCacheOptions {
  staleTime?: number;
  tags?: string[];
}

export interface FetchOptions<T = any> {
  staleTime?: number;
  tags?: string[];
  force?: boolean;
  optimisticData?: T;
}

export interface MutateOptions<T = any> {
  rollbackOnError?: boolean;
  revalidate?: boolean;
  optimisticData?: T;
}

/**
 * Normalizes query keys into a consistent string identifier.
 * e.g., ['wallet', 'usr_123'] -> 'wallet:usr_123'
 *       ['creators', 'maya', { detail: true }] -> 'creators:maya:{"detail":true}'
 */
export function normalizeQueryKey(key: QueryKey): string {
  if (Array.isArray(key)) {
    return key
      .filter((k) => k !== null && k !== undefined)
      .map((k) => (typeof k === "object" ? JSON.stringify(k) : String(k)))
      .join(":");
  }
  return String(key ?? "");
}

export class ServerStateCache {
  private static instance: ServerStateCache;
  private entries: Map<string, CacheEntry<any>> = new Map();
  private inflightRequests: Map<string, Promise<any>> = new Map();
  private fetchers: Map<string, () => Promise<any>> = new Map();

  private constructor() {}

  public static getInstance(): ServerStateCache {
    if (!ServerStateCache.instance) {
      ServerStateCache.instance = new ServerStateCache();
    }
    return ServerStateCache.instance;
  }

  /**
   * Retrieves a cache entry by key.
   */
  public get<T = any>(key: QueryKey): CacheEntry<T> | undefined {
    const normalizedKey = normalizeQueryKey(key);
    return this.entries.get(normalizedKey);
  }

  /**
   * Retrieves cached data if available and fresh.
   */
  public getData<T = any>(key: QueryKey): T | null {
    const entry = this.get<T>(key);
    return entry ? entry.data : null;
  }

  /**
   * Checks if an entry is considered stale.
   */
  public isStale(key: QueryKey): boolean {
    const entry = this.get(key);
    if (!entry || entry.updatedAt === 0) return true;
    return Date.now() - entry.updatedAt > entry.staleTime;
  }

  /**
   * Manually registers or updates data in the cache.
   */
  public set<T = any>(
    key: QueryKey,
    data: T,
    options: SetCacheOptions = {}
  ): CacheEntry<T> {
    const normalizedKey = normalizeQueryKey(key);
    const existing = this.entries.get(normalizedKey);

    const staleTime = options.staleTime ?? existing?.staleTime ?? 30000; // Default 30s TTL
    const tags = Array.from(
      new Set([...(existing?.tags ?? []), ...(options.tags ?? [normalizedKey.split(":")[0]])])
    );

    const entry: CacheEntry<T> = {
      key: normalizedKey,
      data,
      error: null,
      status: "success",
      updatedAt: Date.now(),
      staleTime,
      isFetching: false,
      tags,
      subscribers: existing?.subscribers ?? new Set(),
    };

    this.entries.set(normalizedKey, entry);
    this.notifySubscribers(entry);
    return entry;
  }

  /**
   * Subscribes a listener to updates for a specific cache entry.
   * Returns an unsubscribe function.
   */
  public subscribe<T = any>(
    key: QueryKey,
    listener: (entry: CacheEntry<T>) => void
  ): () => void {
    const normalizedKey = normalizeQueryKey(key);
    let entry = this.entries.get(normalizedKey);

    if (!entry) {
      entry = {
        key: normalizedKey,
        data: null,
        error: null,
        status: "idle",
        updatedAt: 0,
        staleTime: 30000,
        isFetching: false,
        tags: [normalizedKey.split(":")[0]],
        subscribers: new Set(),
      };
      this.entries.set(normalizedKey, entry);
    }

    entry.subscribers.add(listener);

    return () => {
      const currentEntry = this.entries.get(normalizedKey);
      if (currentEntry) {
        currentEntry.subscribers.delete(listener);
      }
    };
  }

  /**
   * Registers a fetcher function for a specific query key.
   */
  public registerFetcher<T = any>(
    key: QueryKey,
    fetcher: () => Promise<T>
  ): void {
    const normalizedKey = normalizeQueryKey(key);
    this.fetchers.set(normalizedKey, fetcher);
  }

  /**
   * Executes a fetch with deduplication, caching, and stale-while-revalidate semantics.
   */
  public async fetch<T = any>(
    key: QueryKey,
    fetcher: () => Promise<T>,
    options: FetchOptions<T> = {}
  ): Promise<T> {
    const normalizedKey = normalizeQueryKey(key);
    this.fetchers.set(normalizedKey, fetcher);

    let entry = this.entries.get(normalizedKey);

    // If cache is fresh and force is false, return cached data immediately
    if (
      entry &&
      entry.status === "success" &&
      entry.data !== null &&
      !options.force &&
      !this.isStale(key)
    ) {
      return entry.data;
    }

    // Deduplicate in-flight requests for the exact same key
    if (this.inflightRequests.has(normalizedKey)) {
      return this.inflightRequests.get(normalizedKey)!;
    }

    // Prepare entry for fetching
    if (!entry) {
      entry = {
        key: normalizedKey,
        data: options.optimisticData ?? null,
        error: null,
        status: options.optimisticData ? "success" : "loading",
        updatedAt: options.optimisticData ? Date.now() : 0,
        staleTime: options.staleTime ?? 30000,
        isFetching: true,
        tags: options.tags ?? [normalizedKey.split(":")[0]],
        subscribers: new Set(),
      };
      this.entries.set(normalizedKey, entry);
    } else {
      entry.isFetching = true;
      if (options.tags) {
        entry.tags = Array.from(new Set([...entry.tags, ...options.tags]));
      }
    }

    this.notifySubscribers(entry);

    const promise = (async () => {
      try {
        const result = await fetcher();

        const updatedEntry: CacheEntry<T> = {
          ...entry!,
          data: result,
          error: null,
          status: "success",
          updatedAt: Date.now(),
          staleTime: options.staleTime ?? entry!.staleTime,
          isFetching: false,
        };

        this.entries.set(normalizedKey, updatedEntry);
        this.notifySubscribers(updatedEntry);
        return result;
      } catch (err: any) {
        const error = err instanceof Error ? err : new Error(String(err));
        const failedEntry: CacheEntry<T> = {
          ...entry!,
          error,
          status: "error",
          isFetching: false,
        };
        this.entries.set(normalizedKey, failedEntry);
        this.notifySubscribers(failedEntry);
        throw error;
      } finally {
        this.inflightRequests.delete(normalizedKey);
      }
    })();

    this.inflightRequests.set(normalizedKey, promise);
    return promise;
  }

  /**
   * Invalidates one or multiple queries matching a key, tag, or predicate.
   * Forces a background revalidation for any active queries.
   */
  public async invalidate(
    target: QueryKey | ((key: string, entry: CacheEntry) => boolean)
  ): Promise<void> {
    const keysToInvalidate: string[] = [];

    if (typeof target === "function") {
      this.entries.forEach((entry, key) => {
        if (target(key, entry)) {
          keysToInvalidate.push(key);
        }
      });
    } else {
      const normalizedTarget = normalizeQueryKey(target);

      this.entries.forEach((entry, key) => {
        // Match exact key, prefix match (e.g., 'wallet' matches 'wallet:fan_alex'), or tag match
        if (
          key === normalizedTarget ||
          key.startsWith(normalizedTarget + ":") ||
          entry.tags.includes(normalizedTarget)
        ) {
          keysToInvalidate.push(key);
        }
      });
    }

    const revalidationPromises = keysToInvalidate.map(async (key) => {
      const entry = this.entries.get(key);
      if (!entry) return;

      // Mark stale
      entry.updatedAt = 0;

      // If there are active subscribers and a registered fetcher, trigger revalidation
      const fetcher = this.fetchers.get(key);
      if (entry.subscribers.size > 0 && fetcher) {
        try {
          await this.fetch(key, fetcher, { force: true });
        } catch {
          // Revalidation failures are captured inside cache entry
        }
      } else {
        this.notifySubscribers(entry);
      }
    });

    await Promise.all(revalidationPromises);
  }

  /**
   * Performs an optimistic mutation on a cache entry with automatic rollback on error.
   */
  public async mutate<T = any>(
    key: QueryKey,
    updater: (current: T | null) => T | null | Promise<T | null>,
    options: MutateOptions<T> = {}
  ): Promise<T | null> {
    const normalizedKey = normalizeQueryKey(key);
    const entry = this.entries.get(normalizedKey);
    const previousData = entry?.data ?? null;

    try {
      // 1. Calculate optimistic value
      const optimisticData =
        options.optimisticData !== undefined
          ? options.optimisticData
          : await updater(previousData);

      // 2. Apply optimistic update to cache
      if (optimisticData !== null) {
        this.set(normalizedKey, optimisticData);
      }

      // 3. Optional revalidation
      if (options.revalidate) {
        const fetcher = this.fetchers.get(normalizedKey);
        if (fetcher) {
          await this.fetch(normalizedKey, fetcher, { force: true });
        }
      }

      return optimisticData;
    } catch (err: any) {
      // 4. Rollback to previous state on error if configured
      if (options.rollbackOnError !== false && previousData !== null) {
        this.set(normalizedKey, previousData);
      }
      throw err;
    }
  }

  /**
   * Removes a specific entry or clears all entries.
   */
  public remove(key: QueryKey): void {
    const normalizedKey = normalizeQueryKey(key);
    this.entries.delete(normalizedKey);
    this.fetchers.delete(normalizedKey);
    this.inflightRequests.delete(normalizedKey);
  }

  public clear(): void {
    this.entries.clear();
    this.fetchers.clear();
    this.inflightRequests.clear();
  }

  /**
   * Retrieves telemetry stats about current cache health.
   */
  public getStats() {
    let subscriberCount = 0;
    this.entries.forEach((e) => {
      subscriberCount += e.subscribers.size;
    });

    return {
      totalEntries: this.entries.size,
      activeSubscribers: subscriberCount,
      inflightRequests: this.inflightRequests.size,
      keys: Array.from(this.entries.keys()),
    };
  }

  private notifySubscribers<T>(entry: CacheEntry<T>): void {
    entry.subscribers.forEach((listener) => {
      try {
        listener(entry);
      } catch (err) {
        console.error("Error notifying cache subscriber:", err);
      }
    });
  }
}

export const serverCache = ServerStateCache.getInstance();
