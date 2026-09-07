"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  serverCache,
  ServerStateCache,
  QueryKey,
  QueryStatus,
  normalizeQueryKey,
  MutateOptions,
} from "./server-cache";

interface ServerStateContextType {
  cache: ServerStateCache;
  invalidate: (target: QueryKey | ((key: string) => boolean)) => Promise<void>;
  prefetch: <T>(key: QueryKey, fetcher: () => Promise<T>, staleTime?: number) => Promise<T>;
}

const ServerStateContext = createContext<ServerStateContextType | null>(null);

export function ServerStateProvider({
  children,
  cache = serverCache,
}: {
  children: React.ReactNode;
  cache?: ServerStateCache;
}) {
  const invalidate = useCallback(
    async (target: QueryKey | ((key: string) => boolean)) => {
      await cache.invalidate(target);
    },
    [cache]
  );

  const prefetch = useCallback(
    async <T,>(key: QueryKey, fetcher: () => Promise<T>, staleTime?: number) => {
      return cache.fetch<T>(key, fetcher, { staleTime });
    },
    [cache]
  );

  const value = useMemo(
    () => ({
      cache,
      invalidate,
      prefetch,
    }),
    [cache, invalidate, prefetch]
  );

  return (
    <ServerStateContext.Provider value={value}>
      {children}
    </ServerStateContext.Provider>
  );
}

export function useServerState() {
  const context = useContext(ServerStateContext);
  if (!context) {
    // Graceful fallback to singleton instance if provider is omitted
    return {
      cache: serverCache,
      invalidate: (target: QueryKey | ((key: string) => boolean)) =>
        serverCache.invalidate(target),
      prefetch: <T,>(key: QueryKey, fetcher: () => Promise<T>, staleTime?: number) =>
        serverCache.fetch<T>(key, fetcher, { staleTime }),
    };
  }
  return context;
}

export interface UseServerQueryOptions<T> {
  enabled?: boolean;
  staleTime?: number;
  tags?: string[];
  initialData?: T;
  refetchOnWindowFocus?: boolean;
  refetchInterval?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export interface UseServerQueryResult<T> {
  data: T | null;
  error: Error | null;
  status: QueryStatus;
  isLoading: boolean;
  isFetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  isStale: boolean;
  refetch: () => Promise<T>;
  mutate: (
    updater: (current: T | null) => T | null | Promise<T | null>,
    options?: MutateOptions<T>
  ) => Promise<T | null>;
  invalidate: () => Promise<void>;
  key: string;
}

/**
 * Core React Hook for Server State
 * Manages caching, background revalidation, subscriber notifications, and optimistic mutations.
 */
export function useServerQuery<T = any>(
  key: QueryKey,
  fetcher: () => Promise<T>,
  options: UseServerQueryOptions<T> = {}
): UseServerQueryResult<T> {
  const { cache } = useServerState();
  const normalizedKey = normalizeQueryKey(key);

  const {
    enabled = true,
    staleTime = 30000,
    tags,
    initialData,
    refetchOnWindowFocus = true,
    refetchInterval,
  } = options;

  // Initialize state from existing cache entry if present
  const initialEntry = cache.get<T>(normalizedKey);
  const [state, setState] = useState<{
    data: T | null;
    error: Error | null;
    status: QueryStatus;
    isFetching: boolean;
    updatedAt: number;
  }>(() => ({
    data: (initialEntry?.data !== undefined ? initialEntry.data : initialData) ?? null,
    error: initialEntry?.error ?? null,
    status: (initialEntry?.status ?? (initialData ? "success" : "idle")) as QueryStatus,
    isFetching: initialEntry?.isFetching ?? false,
    updatedAt: initialEntry?.updatedAt ?? 0,
  }));

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Subscribe to cache updates
  useEffect(() => {
    if (!normalizedKey) return;

    const unsubscribe = cache.subscribe<T>(normalizedKey, (entry) => {
      setState({
        data: entry.data,
        error: entry.error,
        status: entry.status,
        isFetching: entry.isFetching,
        updatedAt: entry.updatedAt,
      });

      if (entry.status === "success" && entry.data !== null) {
        optionsRef.current.onSuccess?.(entry.data);
      } else if (entry.status === "error" && entry.error !== null) {
        optionsRef.current.onError?.(entry.error);
      }
    });

    return unsubscribe;
  }, [cache, normalizedKey]);

  // Initial and reactive fetch execution
  const executeFetch = useCallback(
    async (force = false): Promise<T> => {
      if (!normalizedKey) throw new Error("Cannot fetch with empty query key");
      return cache.fetch<T>(normalizedKey, () => fetcherRef.current(), {
        staleTime,
        tags,
        force,
      });
    },
    [cache, normalizedKey, staleTime, tags]
  );

  useEffect(() => {
    if (enabled && normalizedKey) {
      executeFetch(false).catch(() => {
        // Errors are captured inside cache entry
      });
    }
  }, [enabled, normalizedKey, executeFetch]);

  // Polling / Refetch Interval if specified
  useEffect(() => {
    if (!enabled || !refetchInterval || refetchInterval <= 0) return;

    const timer = setInterval(() => {
      executeFetch(true).catch(() => {});
    }, refetchInterval);

    return () => clearInterval(timer);
  }, [enabled, refetchInterval, executeFetch]);

  // Window Focus Revalidation
  useEffect(() => {
    if (!enabled || !refetchOnWindowFocus) return;

    const handleFocus = () => {
      if (cache.isStale(normalizedKey)) {
        executeFetch(true).catch(() => {});
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [enabled, refetchOnWindowFocus, cache, normalizedKey, executeFetch]);

  // Optimistic Mutator
  const mutate = useCallback(
    async (
      updater: (current: T | null) => T | null | Promise<T | null>,
      mutateOptions?: MutateOptions<T>
    ): Promise<T | null> => {
      return cache.mutate<T>(normalizedKey, updater, mutateOptions);
    },
    [cache, normalizedKey]
  );

  // Invalidate query directly
  const invalidate = useCallback(async () => {
    await cache.invalidate(normalizedKey);
  }, [cache, normalizedKey]);

  const isStale = cache.isStale(normalizedKey);

  return {
    data: state.data,
    error: state.error,
    status: state.status,
    isLoading: state.status === "loading" || (state.status === "idle" && enabled && state.data === null),
    isFetching: state.isFetching,
    isSuccess: state.status === "success" && state.data !== null,
    isError: state.status === "error",
    isStale,
    refetch: () => executeFetch(true),
    mutate,
    invalidate,
    key: normalizedKey,
  };
}

export interface UseServerMutationOptions<TData, TVariables> {
  onMutate?: (variables: TVariables) => Promise<any> | any;
  onSuccess?: (data: TData, variables: TVariables, context: any) => Promise<void> | void;
  onError?: (error: Error, variables: TVariables, context: any) => Promise<void> | void;
  onSettled?: (
    data: TData | null,
    error: Error | null,
    variables: TVariables,
    context: any
  ) => Promise<void> | void;
  invalidateQueries?: QueryKey[];
}

export function useServerMutation<TData = any, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: UseServerMutationOptions<TData, TVariables> = {}
) {
  const { cache } = useServerState();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<TData | null>(null);

  const mutate = useCallback(
    async (variables: TVariables): Promise<TData> => {
      setIsLoading(true);
      setError(null);
      let context: any;

      try {
        if (options.onMutate) {
          context = await options.onMutate(variables);
        }

        const result = await mutationFn(variables);
        setData(result);

        if (options.onSuccess) {
          await options.onSuccess(result, variables, context);
        }

        if (options.invalidateQueries) {
          await Promise.all(
            options.invalidateQueries.map((key) => cache.invalidate(key))
          );
        }

        if (options.onSettled) {
          await options.onSettled(result, null, variables, context);
        }

        return result;
      } catch (err: any) {
        const mutationError = err instanceof Error ? err : new Error(String(err));
        setError(mutationError);

        if (options.onError) {
          await options.onError(mutationError, variables, context);
        }

        if (options.onSettled) {
          await options.onSettled(null, mutationError, variables, context);
        }

        throw mutationError;
      } finally {
        setIsLoading(false);
      }
    },
    [mutationFn, options, cache]
  );

  return {
    mutate,
    data,
    error,
    isLoading,
    isSuccess: data !== null && !error,
    isError: error !== null,
    reset: () => {
      setData(null);
      setError(null);
      setIsLoading(false);
    },
  };
}
