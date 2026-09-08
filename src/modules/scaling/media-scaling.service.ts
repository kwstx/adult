import crypto from "crypto";
import { redis } from "@/lib/redis";
import {
  MediaScalingMetrics,
  SignedEdgePlaybackToken,
} from "./types";

const PRESENCE_HLL_PREFIX = "scaling:media:presence:hll:";
const PRESENCE_ZSET_PREFIX = "scaling:media:presence:zset:";

/**
 * Media Scaling & Edge Distribution Service
 * 
 * Core Architectural Invariant:
 * The application servers NEVER proxy or transport raw video/audio packets.
 * Video streams are distributed exclusively by dedicated media edge CDNs (Cloudflare / LiveKit / WHEP edge).
 * 
 * At 1,000 users: Direct media edge stream tokens.
 * At 100,000 users: Geo-distributed CDN edge distribution + Redis ZSET presence.
 * At Millions of users:
 *   1. Edge caching absorbs 99.9% of video egress bandwidth.
 *   2. Presence tracking switches to Redis HyperLogLog (HLL), reducing memory from gigabytes
 *      to a fixed ~12KB per stream for millions of viewers.
 */
export class MediaScalingService {
  private static sharedHllCounts: Map<string, Set<string>> = new Map();

  private mediaEdgeBaseUrl: string;
  private hmacSigningSecret: string;

  private metrics: MediaScalingMetrics = {
    totalViewers: 0,
    edgeEgressBandwidthGbps: 0,
    appServerVideoBandwidthBytes: 0, // ALWAYS 0
    activeLivestreams: 0,
    presenceMemoryBytes: 0,
    presenceAlgorithm: "HYPERLOGLOG",
  };

  constructor() {
    this.mediaEdgeBaseUrl = process.env.MEDIA_CDN_BASE_URL || "https://edge.cdn.streamplatform.local";
    this.hmacSigningSecret = process.env.MEDIA_TOKEN_SECRET || "sec_media_infrastructure_token_signing_key_2026";
  }

  /**
   * Generates a signed Edge CDN playback token for a viewer.
   * This authorizes the viewer to connect directly to the edge CDN (0 app server bandwidth).
   */
  public generateSignedEdgeToken(params: {
    streamId: string;
    userId: string;
    edgeRegion?: string;
    isVip?: boolean;
    ttlSeconds?: number;
  }): SignedEdgePlaybackToken {
    const {
      streamId,
      userId,
      edgeRegion = "us-east-edge",
      isVip = false,
      ttlSeconds = 21600, // 6 hours
    } = params;

    const expiresAt = Date.now() + ttlSeconds * 1000;
    const payload = {
      streamId,
      userId,
      isVip,
      edgeRegion,
      exp: expiresAt,
      nonce: crypto.randomBytes(8).toString("hex"),
    };

    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = crypto
      .createHmac("sha256", this.hmacSigningSecret)
      .update(encoded)
      .digest("base64url");

    const token = `${encoded}.${signature}`;

    return {
      token,
      streamId,
      userId,
      cdnEdgeUrl: `${this.mediaEdgeBaseUrl}/${edgeRegion}/hls/${streamId}/master.m3u8?token=${token}`,
      whepEdgeUrl: `${this.mediaEdgeBaseUrl}/${edgeRegion}/whep/${streamId}?token=${token}`,
      expiresAt,
      edgeRegion,
    };
  }

  /**
   * Records a viewer heartbeat using the appropriate presence algorithm.
   * For millions of viewers, utilizes HyperLogLog (PFADD) with fixed 12KB memory overhead.
   */
  public async recordViewerPresence(
    streamId: string,
    viewerId: string,
    estimatedAudienceSize: number = 1000
  ): Promise<void> {
    if (estimatedAudienceSize >= 10000) {
      // Massive scale: Use Redis HyperLogLog (constant 12KB memory)
      this.metrics.presenceAlgorithm = "HYPERLOGLOG";
      const hllKey = `${PRESENCE_HLL_PREFIX}${streamId}`;

      try {
        if (redis.status === "ready") {
          await redis.pfadd(hllKey, viewerId);
          await redis.expire(hllKey, 300); // 5 min TTL
          return;
        }
      } catch {}

      // In-memory fallback
      if (!MediaScalingService.sharedHllCounts.has(streamId)) {
        MediaScalingService.sharedHllCounts.set(streamId, new Set());
      }
      MediaScalingService.sharedHllCounts.get(streamId)!.add(viewerId);
    } else {
      // Normal scale: Use ZSET with timestamps for heartbeats
      this.metrics.presenceAlgorithm = "ZSET";
      const zsetKey = `${PRESENCE_ZSET_PREFIX}${streamId}`;
      const now = Date.now();

      try {
        if (redis.status === "ready") {
          await redis.zadd(zsetKey, now, viewerId);
          // Remove viewers inactive for > 60s
          await redis.zremrangebyscore(zsetKey, 0, now - 60000);
          await redis.expire(zsetKey, 300);
          return;
        }
      } catch {}

      if (!MediaScalingService.sharedHllCounts.has(streamId)) {
        MediaScalingService.sharedHllCounts.set(streamId, new Set());
      }
      MediaScalingService.sharedHllCounts.get(streamId)!.add(viewerId);
    }
  }

  /**
   * Retrieves current viewer count for a stream.
   */
  public async getViewerCount(
    streamId: string,
    estimatedAudienceSize: number = 1000
  ): Promise<number> {
    if (estimatedAudienceSize >= 10000) {
      const hllKey = `${PRESENCE_HLL_PREFIX}${streamId}`;
      try {
        if (redis.status === "ready") {
          return await redis.pfcount(hllKey);
        }
      } catch {}
    } else {
      const zsetKey = `${PRESENCE_ZSET_PREFIX}${streamId}`;
      const now = Date.now();
      try {
        if (redis.status === "ready") {
          return await redis.zcount(zsetKey, now - 60000, "+inf");
        }
      } catch {}
    }

    return MediaScalingService.sharedHllCounts.get(streamId)?.size || 0;
  }

  /**
   * Calculates telemetry metrics for edge distribution vs application server load.
   */
  public calculateTelemetry(totalViewers: number, avgBitrateMbps = 4.5): MediaScalingMetrics {
    const edgeBandwidthGbps = parseFloat(((totalViewers * avgBitrateMbps) / 1000).toFixed(2));
    const hllStreams = 10;
    // HyperLogLog takes ~12KB per stream in Redis
    const presenceBytes = hllStreams * 12288;

    this.metrics = {
      totalViewers,
      edgeEgressBandwidthGbps: edgeBandwidthGbps,
      appServerVideoBandwidthBytes: 0, // Invariant: Application server consumes ZERO video bandwidth
      activeLivestreams: hllStreams,
      presenceMemoryBytes: presenceBytes,
      presenceAlgorithm: totalViewers > 10000 ? "HYPERLOGLOG" : "ZSET",
    };

    return { ...this.metrics };
  }

  public getMetrics(): MediaScalingMetrics {
    return { ...this.metrics };
  }
}

// Global Singleton
const globalForMediaScale = globalThis as unknown as {
  __mediaScalingService?: MediaScalingService;
};

export const mediaScaling =
  globalForMediaScale.__mediaScalingService ?? new MediaScalingService();

if (process.env.NODE_ENV !== "production") {
  globalForMediaScale.__mediaScalingService = mediaScaling;
}
