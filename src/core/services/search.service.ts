/**
 * Search Service Boundary
 * 
 * Candidate Service #8: Natural candidate for extraction when inverted indexing,
 * fuzzy matching, multi-attribute facet filtering, and full-text queries
 * demand a dedicated search cluster (e.g. OpenSearch, Typesense, Meilisearch).
 */

import { serviceRegistry } from "../service-boundary/service-registry";
import { RpcClient } from "../service-boundary/rpc-client";
import { ServiceContext } from "../service-boundary/types";
import { jobDispatcher } from "@/modules/workers/core/job-dispatcher";
import { redis } from "@/lib/redis";

export interface SearchQueryRequest {
  query: string;
  type?: "ALL" | "CREATORS" | "LIVESTREAMS" | "TAGS";
  category?: string;
  isLiveOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface SearchResultItem {
  id: string;
  type: "CREATOR" | "LIVESTREAM";
  title: string;
  subtitle?: string;
  avatarUrl?: string;
  thumbnailUrl?: string;
  isLive: boolean;
  viewerCount?: number;
  category: string;
  tags: string[];
  relevanceScore: number;
}

export interface IndexDocumentPayload {
  entityType: "CREATOR" | "LIVESTREAM";
  entityId: string;
  action: "UPSERT" | "DELETE" | "REINDEX_ALL";
  documentData?: Record<string, unknown>;
}

export interface ISearchService {
  search(
    request: SearchQueryRequest,
    context?: Partial<ServiceContext>
  ): Promise<{ results: SearchResultItem[]; totalHits: number; searchTimeMs: number }>;

  indexEntity(
    payload: IndexDocumentPayload,
    context?: Partial<ServiceContext>
  ): Promise<{ acknowledged: boolean; indexName: string }>;

  searchTags(
    query: string,
    limit?: number,
    context?: Partial<ServiceContext>
  ): Promise<{ tags: Array<{ name: string; count: number }> }>;
}

/**
 * In-Process Implementation (Modular Monolith Default via Redis + Postgres Index)
 */
export class InProcessSearchService implements ISearchService {
  public async search(request: SearchQueryRequest) {
    const start = Date.now();
    const queryLower = request.query.toLowerCase().trim();

    // Default mock discovery candidates
    const candidates: SearchResultItem[] = [
      {
        id: "creator_maya",
        type: "CREATOR",
        title: "Maya Lin",
        subtitle: "@mayalin",
        isLive: true,
        viewerCount: 245,
        category: "Interactive",
        tags: ["interactive", "vip", "cosplay"],
        relevanceScore: 0.95,
      },
      {
        id: "creator_elena",
        type: "CREATOR",
        title: "Elena Rostova",
        subtitle: "@elena_official",
        isLive: false,
        category: "Gaming",
        tags: ["gaming", "chat", "chill"],
        relevanceScore: 0.82,
      },
      {
        id: "stream_live_101",
        type: "LIVESTREAM",
        title: "VIP Interactive Room & Diamond Chat",
        subtitle: "by Maya Lin",
        isLive: true,
        viewerCount: 245,
        category: "Interactive",
        tags: ["interactive", "vip"],
        relevanceScore: 0.98,
      },
    ];

    let filtered = candidates;
    if (queryLower) {
      filtered = filtered.filter(
        (c) =>
          c.title.toLowerCase().includes(queryLower) ||
          c.subtitle?.toLowerCase().includes(queryLower) ||
          c.tags.some((t) => t.toLowerCase().includes(queryLower)) ||
          c.category.toLowerCase().includes(queryLower)
      );
    }

    if (request.isLiveOnly) {
      filtered = filtered.filter((c) => c.isLive);
    }

    if (request.type === "CREATORS") {
      filtered = filtered.filter((c) => c.type === "CREATOR");
    } else if (request.type === "LIVESTREAMS") {
      filtered = filtered.filter((c) => c.type === "LIVESTREAM");
    }

    const limit = request.limit || 20;
    const offset = request.offset || 0;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      results: paginated,
      totalHits: filtered.length,
      searchTimeMs: Date.now() - start,
    };
  }

  public async indexEntity(payload: IndexDocumentPayload) {
    // Asynchronously dispatch background indexing job
    await jobDispatcher.dispatchSearchIndexUpdate({
      entityType: payload.entityType,
      entityId: payload.entityId,
      action: payload.action,
      documentData: payload.documentData,
    });

    return {
      acknowledged: true,
      indexName: `search:${payload.entityType.toLowerCase()}`,
    };
  }

  public async searchTags(query: string, limit = 10) {
    const defaultTags = [
      { name: "interactive", count: 120 },
      { name: "vip", count: 95 },
      { name: "cosplay", count: 84 },
      { name: "gaming", count: 65 },
      { name: "chat", count: 50 },
    ];
    const filtered = defaultTags.filter((t) => t.name.includes(query.toLowerCase()));
    return { tags: filtered.slice(0, limit) };
  }
}

/**
 * Out-of-Process Client (Microservice Remote RPC Proxy)
 */
export class RpcSearchService implements ISearchService {
  private rpc: RpcClient;

  constructor() {
    this.rpc = new RpcClient({
      endpoint: serviceRegistry.getEndpoint("SEARCH"),
      timeoutMs: 3000,
      maxRetries: 2,
      retryDelayMs: 100,
    });
  }

  public async search(request: SearchQueryRequest, context?: Partial<ServiceContext>) {
    return this.rpc.call<{ results: SearchResultItem[]; totalHits: number; searchTimeMs: number }>(
      "query",
      request,
      context as ServiceContext
    );
  }

  public async indexEntity(payload: IndexDocumentPayload, context?: Partial<ServiceContext>) {
    return this.rpc.call<{ acknowledged: boolean; indexName: string }>(
      "index",
      payload,
      context as ServiceContext
    );
  }

  public async searchTags(query: string, limit?: number, context?: Partial<ServiceContext>) {
    return this.rpc.call<{ tags: Array<{ name: string; count: number }> }>(
      "tags",
      { query, limit },
      context as ServiceContext
    );
  }
}

// Register default in-process implementation
const inProcessInstance = new InProcessSearchService();
const rpcInstance = new RpcSearchService();
serviceRegistry.register("SEARCH", inProcessInstance);

/**
 * Unified Boundary Dispatcher
 */
export const searchService: ISearchService = {
  search: (request, context) => {
    const isRpc = serviceRegistry.getMode("SEARCH") === "OUT_OF_PROCESS_RPC";
    const service = isRpc ? rpcInstance : inProcessInstance;
    return service.search(request, context);
  },
  indexEntity: (payload, context) => {
    const isRpc = serviceRegistry.getMode("SEARCH") === "OUT_OF_PROCESS_RPC";
    const service = isRpc ? rpcInstance : inProcessInstance;
    return service.indexEntity(payload, context);
  },
  searchTags: (query, limit, context) => {
    const isRpc = serviceRegistry.getMode("SEARCH") === "OUT_OF_PROCESS_RPC";
    const service = isRpc ? rpcInstance : inProcessInstance;
    return service.searchTags(query, limit, context);
  },
};
