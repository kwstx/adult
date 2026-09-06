import prisma from "@/lib/db";
import { redis } from "@/lib/redis";
import type {
  RecommendationEventType,
  RawEventPayload,
  IngestEventsRequest,
  IngestEventsResponse,
} from "./types";
import { RecommendationEventType as PrismaEventType } from "@prisma/client";

const VALID_EVENT_TYPES: Set<string> = new Set([
  "IMPRESSION",
  "SWIPE",
  "WATCH",
  "EXIT",
  "FOLLOW",
  "UNFOLLOW",
  "LIKE",
  "CHAT",
  "GIFT",
  "INTERACTION",
  "SUBSCRIPTION",
  "CONTENT_PURCHASE",
  "PRIVATE_SESSION",
  "SEARCH",
  "CREATOR_PROFILE_VIEW",
]);

/**
 * Maps incoming string event type to strict Prisma RecommendationEventType enum
 */
export function normalizeEventType(type: string): PrismaEventType | null {
  const upper = (type || "").toUpperCase().trim();
  
  // Handle legacy event aliases
  if (upper === "WATCH_3S" || upper === "WATCH_20S" || upper === "WATCH_90S" || upper === "WATCH_DURATION") {
    return PrismaEventType.WATCH;
  }
  if (upper === "IMMEDIATE_BOUNCE") {
    return PrismaEventType.EXIT;
  }
  if (upper === "TIP") {
    return PrismaEventType.GIFT;
  }
  if (upper === "STREAM_ENTER" || upper === "STREAM_LEAVE") {
    return upper === "STREAM_ENTER" ? PrismaEventType.IMPRESSION : PrismaEventType.EXIT;
  }
  if (upper === "CHAT_OPEN" || upper === "GIFT_OPEN" || upper === "PPV_OPEN" || upper === "INTERACTION_MENU_OPEN") {
    return PrismaEventType.INTERACTION;
  }

  if (VALID_EVENT_TYPES.has(upper)) {
    return upper as PrismaEventType;
  }

  return null;
}

/**
 * Normalized database record representation
 */
export interface NormalizedEventRecord {
  sessionId: string;
  userId: string | null;
  creatorProfileId: string | null;
  livestreamId: string | null;
  contentId: string | null;
  eventType: PrismaEventType;
  dwellTimeMs: number;
  watchDurationSeconds: number;
  searchQuery: string | null;
  category: string | null;
  tags: string | null;
  amountCredits: number | null;
  positionIndex: number | null;
  deviceType: string | null;
  metadataJson: string | null;
  createdAt: Date;
}

/**
 * Clean & validate raw input into strongly-typed DB records
 */
export function normalizeEvent(
  raw: RawEventPayload,
  defaultSessionId = "anonymous_session",
  defaultUserId: string | null = null
): NormalizedEventRecord | null {
  const normType = normalizeEventType(raw.eventType);
  if (!normType) return null;

  const creatorId = raw.creatorProfileId || raw.creatorId || null;
  const streamId = raw.livestreamId || raw.streamId || null;
  const contentId = raw.contentId || null;
  const userId = raw.userId || defaultUserId || null;
  const sessionId = raw.sessionId || defaultSessionId;

  // Dwell / Watch time calculations
  let dwellTimeMs = raw.dwellTimeMs || 0;
  let watchDurationSeconds = raw.watchDurationSeconds || 0;

  if (watchDurationSeconds > 0 && dwellTimeMs === 0) {
    dwellTimeMs = watchDurationSeconds * 1000;
  } else if (dwellTimeMs > 0 && watchDurationSeconds === 0) {
    watchDurationSeconds = Math.round(dwellTimeMs / 1000);
  }

  // Tags normalization
  let tagsStr: string | null = null;
  if (Array.isArray(raw.tags)) {
    tagsStr = raw.tags.join(",");
  } else if (typeof raw.tags === "string") {
    tagsStr = raw.tags;
  }

  // Timestamp parsing
  let createdAt = new Date();
  if (raw.timestamp) {
    const parsed = new Date(raw.timestamp);
    if (!isNaN(parsed.getTime())) {
      createdAt = parsed;
    }
  }

  return {
    sessionId,
    userId,
    creatorProfileId: creatorId,
    livestreamId: streamId,
    contentId,
    eventType: normType,
    dwellTimeMs,
    watchDurationSeconds,
    searchQuery: raw.searchQuery || null,
    category: raw.category || null,
    tags: tagsStr,
    amountCredits: typeof raw.amountCredits === "number" ? raw.amountCredits : null,
    positionIndex: typeof raw.positionIndex === "number" ? raw.positionIndex : null,
    deviceType: raw.deviceType || null,
    metadataJson: raw.metadata ? JSON.stringify(raw.metadata) : null,
    createdAt,
  };
}

/**
 * High-performance event ingestion pipeline:
 * 1. Validates and normalizes records
 * 2. Persists to PostgreSQL in chunked batches
 * 3. Streams to Redis Stream (XADD) for analytics pipelines
 * 4. Updates real-time Redis popularity counters & user affinity caches
 */
export async function ingestRecommendationEvents(
  payload: IngestEventsRequest
): Promise<IngestEventsResponse> {
  const events = payload.events || [];
  if (events.length === 0) {
    return {
      success: true,
      ingestedCount: 0,
      streamPublishedCount: 0,
      serverTimestamp: new Date().toISOString(),
    };
  }

  const normalizedRecords: NormalizedEventRecord[] = [];
  for (const raw of events) {
    const norm = normalizeEvent(raw, payload.sessionId, payload.userId);
    if (norm) {
      normalizedRecords.push(norm);
    }
  }

  if (normalizedRecords.length === 0) {
    return {
      success: true,
      ingestedCount: 0,
      streamPublishedCount: 0,
      serverTimestamp: new Date().toISOString(),
    };
  }

  // 1. Batch Insert into PostgreSQL (chunks of 100)
  const CHUNK_SIZE = 100;
  for (let i = 0; i < normalizedRecords.length; i += CHUNK_SIZE) {
    const chunk = normalizedRecords.slice(i, i + CHUNK_SIZE);
    await prisma.recommendationEvent.createMany({
      data: chunk,
    });
  }

  // 2. Stream to Redis & Real-time Aggregation (Non-blocking / resilient)
  let streamCount = 0;
  try {
    const pipeline = redis.pipeline();

    for (const record of normalizedRecords) {
      const serialized = JSON.stringify({
        ...record,
        timestamp: record.createdAt.toISOString(),
      });

      // A. Append to Redis Stream
      pipeline.xadd(
        "events:recommendations:stream",
        "*",
        "event",
        serialized
      );

      // B. Update Real-time Creator Popularity Metrics
      if (record.creatorProfileId) {
        const creatorKey = `creator:heat:${record.creatorProfileId}`;
        const hourlyZset = "creators:heat:hourly";

        let scoreDelta = 0.1; // Default impression
        if (record.eventType === "GIFT") scoreDelta = (record.amountCredits || 10) * 0.5 + 10;
        else if (record.eventType === "SUBSCRIPTION") scoreDelta = 50;
        else if (record.eventType === "CONTENT_PURCHASE") scoreDelta = 25;
        else if (record.eventType === "INTERACTION") scoreDelta = 15;
        else if (record.eventType === "CHAT") scoreDelta = 3;
        else if (record.eventType === "LIKE") scoreDelta = 1;
        else if (record.eventType === "WATCH") scoreDelta = Math.min(10, (record.watchDurationSeconds || 5) * 0.2);
        else if (record.eventType === "FOLLOW") scoreDelta = 20;
        else if (record.eventType === "UNFOLLOW") scoreDelta = -20;
        else if (record.eventType === "EXIT" && record.dwellTimeMs < 3000) scoreDelta = -5; // Bounce penalty

        pipeline.zincrby(hourlyZset, scoreDelta, record.creatorProfileId);
        pipeline.hincrby(creatorKey, `count_${record.eventType}`, 1);
        pipeline.expire(creatorKey, 86400); // 24 hours
      }

      // C. Update Real-time User Affinity Cache
      if (record.userId) {
        const userAffinityKey = `user:affinity:${record.userId}:categories`;
        if (record.category) {
          const cat = record.category.toLowerCase().trim();
          let catWeight = 1;
          if (record.eventType === "GIFT" || record.eventType === "SUBSCRIPTION") catWeight = 5;
          else if (record.eventType === "WATCH" && record.watchDurationSeconds >= 20) catWeight = 3;
          else if (record.eventType === "EXIT" && record.dwellTimeMs < 3000) catWeight = -2;

          pipeline.hincrby(userAffinityKey, cat, catWeight);
          pipeline.expire(userAffinityKey, 86400 * 7); // 7 days
        }

        // Track user-creator pair watch duration
        if (record.creatorProfileId && record.watchDurationSeconds > 0) {
          const pairKey = `user:history:${record.userId}:${record.creatorProfileId}`;
          pipeline.hincrby(pairKey, "watch_seconds", record.watchDurationSeconds);
          pipeline.hincrby(pairKey, "watch_count", 1);
          pipeline.hset(pairKey, "last_watch", Date.now());
          pipeline.expire(pairKey, 86400 * 30); // 30 days
        }
      }

      streamCount++;
    }

    // Execute Redis pipeline asynchronously
    pipeline.exec().catch((redisErr) => {
      console.warn("[Redis Telemetry Pipeline Warning]:", redisErr.message);
    });
  } catch (err: any) {
    console.warn("[Redis Stream Publish Skipped]:", err.message);
  }

  return {
    success: true,
    ingestedCount: normalizedRecords.length,
    streamPublishedCount: streamCount,
    serverTimestamp: new Date().toISOString(),
  };
}

/**
 * Server-side Programmatic Event Recorder
 * Enables other backend services (e.g. checkout, tip, follow, chat, private booking)
 * to effortlessly record authoritative recommendation events without HTTP calls.
 */
export async function recordRecommendationEvent(event: RawEventPayload): Promise<boolean> {
  try {
    await ingestRecommendationEvents({
      sessionId: event.sessionId || "server_session",
      userId: event.userId,
      events: [event],
    });
    return true;
  } catch (error) {
    console.error("[Record Recommendation Event Failed]:", error);
    return false;
  }
}

/**
 * Convenience helper to record batch events from backend services
 */
export async function recordRecommendationEventsBatch(
  events: RawEventPayload[],
  userId?: string | null,
  sessionId = "server_session"
): Promise<boolean> {
  try {
    await ingestRecommendationEvents({
      sessionId,
      userId,
      events,
    });
    return true;
  } catch (error) {
    console.error("[Record Batch Recommendation Events Failed]:", error);
    return false;
  }
}
