/**
 * Media Orchestration Service Boundary
 * 
 * Candidate Service #1: Natural candidate for extraction when GPU transcoding
 * and WebRTC/SFU egress bandwidth require dedicated compute clusters.
 */

import { serviceRegistry } from "../service-boundary/service-registry";
import { RpcClient } from "../service-boundary/rpc-client";
import { ServiceContext, ServiceResult } from "../service-boundary/types";
import { jobDispatcher } from "@/modules/workers/core/job-dispatcher";
import { prisma } from "@/lib/db";

export interface TranscodeJobOptions {
  mediaId: string;
  sourceUrl: string;
  renditions: Array<"1080p" | "720p" | "480p" | "360p">;
  generateThumbnails?: boolean;
}

export interface MediaEgressTokenOptions {
  streamId: string;
  userId: string;
  role: "BROADCASTER" | "SUBSCRIBER" | "VIEWER";
  protocol: "WEBRTC_WHEP" | "HLS_LL" | "RTMP";
}

export interface IMediaOrchestrationService {
  requestTranscoding(
    options: TranscodeJobOptions,
    context?: Partial<ServiceContext>
  ): Promise<{ jobId: string; status: "QUEUED" | "PROCESSING" }>;

  generateSignedMediaUrl(
    mediaId: string,
    userId: string,
    expiresInSeconds?: number,
    context?: Partial<ServiceContext>
  ): Promise<{ signedUrl: string; expiresAt: string }>;

  createLiveEgressToken(
    options: MediaEgressTokenOptions,
    context?: Partial<ServiceContext>
  ): Promise<{ streamToken: string; playbackUrl: string; expiresAt: string }>;

  invalidateCdnCache(
    paths: string[],
    context?: Partial<ServiceContext>
  ): Promise<{ invalidatedCount: number; purgedAt: string }>;
}

/**
 * In-Process Implementation (Modular Monolith Default)
 */
export class InProcessMediaOrchestrationService implements IMediaOrchestrationService {
  public async requestTranscoding(
    options: TranscodeJobOptions
  ): Promise<{ jobId: string; status: "QUEUED" | "PROCESSING" }> {
    const job = await jobDispatcher.dispatchVideoProcessing({
      contentId: options.mediaId,
      creatorId: "creator_system",
      sourceFileKey: options.sourceUrl,
      sourceUrl: options.sourceUrl,
      mimeType: "video/mp4",
      renditions: options.renditions,
      generateHls: true,
    });
    return { jobId: job.jobId, status: "QUEUED" };
  }

  public async generateSignedMediaUrl(
    mediaId: string,
    userId: string,
    expiresInSeconds = 3600
  ): Promise<{ signedUrl: string; expiresAt: string }> {
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
    const token = Buffer.from(`${mediaId}:${userId}:${Date.now()}`).toString("base64url");
    const signedUrl = `https://cdn.platform.local/protected/${mediaId}/master.m3u8?token=${token}&exp=${expiresAt}`;
    return { signedUrl, expiresAt };
  }

  public async createLiveEgressToken(
    options: MediaEgressTokenOptions
  ): Promise<{ streamToken: string; playbackUrl: string; expiresAt: string }> {
    const expiresAt = new Date(Date.now() + 86400 * 1000).toISOString();
    const token = `live_tk_${options.streamId}_${options.userId}_${Math.random().toString(36).substring(2, 8)}`;
    const playbackUrl = `https://live-edge.platform.local/hls/${options.streamId}/index.m3u8`;
    return { streamToken: token, playbackUrl, expiresAt };
  }

  public async invalidateCdnCache(
    paths: string[]
  ): Promise<{ invalidatedCount: number; purgedAt: string }> {
    return {
      invalidatedCount: paths.length,
      purgedAt: new Date().toISOString(),
    };
  }
}

/**
 * Out-of-Process Client (Microservice Remote RPC Proxy)
 */
export class RpcMediaOrchestrationService implements IMediaOrchestrationService {
  private rpc: RpcClient;

  constructor() {
    this.rpc = new RpcClient({
      endpoint: serviceRegistry.getEndpoint("MEDIA_ORCHESTRATION"),
      timeoutMs: 8000,
      maxRetries: 2,
      retryDelayMs: 300,
    });
  }

  public async requestTranscoding(
    options: TranscodeJobOptions,
    context?: Partial<ServiceContext>
  ) {
    return this.rpc.call<{ jobId: string; status: "QUEUED" | "PROCESSING" }>(
      "transcode",
      options,
      context as ServiceContext
    );
  }

  public async generateSignedMediaUrl(
    mediaId: string,
    userId: string,
    expiresInSeconds?: number,
    context?: Partial<ServiceContext>
  ) {
    return this.rpc.call<{ signedUrl: string; expiresAt: string }>(
      "sign-url",
      { mediaId, userId, expiresInSeconds },
      context as ServiceContext
    );
  }

  public async createLiveEgressToken(
    options: MediaEgressTokenOptions,
    context?: Partial<ServiceContext>
  ) {
    return this.rpc.call<{ streamToken: string; playbackUrl: string; expiresAt: string }>(
      "live-egress-token",
      options,
      context as ServiceContext
    );
  }

  public async invalidateCdnCache(
    paths: string[],
    context?: Partial<ServiceContext>
  ) {
    return this.rpc.call<{ invalidatedCount: number; purgedAt: string }>(
      "invalidate-cdn",
      { paths },
      context as ServiceContext
    );
  }
}

// Register default in-process implementation
const inProcessInstance = new InProcessMediaOrchestrationService();
const rpcInstance = new RpcMediaOrchestrationService();
serviceRegistry.register("MEDIA_ORCHESTRATION", inProcessInstance);

/**
 * Unified Boundary Dispatcher
 */
export const mediaOrchestrationService: IMediaOrchestrationService = {
  requestTranscoding: (options, context) => {
    const isRpc = serviceRegistry.getMode("MEDIA_ORCHESTRATION") === "OUT_OF_PROCESS_RPC";
    const service = isRpc ? rpcInstance : inProcessInstance;
    return service.requestTranscoding(options, context);
  },
  generateSignedMediaUrl: (mediaId, userId, expiresInSeconds, context) => {
    const isRpc = serviceRegistry.getMode("MEDIA_ORCHESTRATION") === "OUT_OF_PROCESS_RPC";
    const service = isRpc ? rpcInstance : inProcessInstance;
    return service.generateSignedMediaUrl(mediaId, userId, expiresInSeconds, context);
  },
  createLiveEgressToken: (options, context) => {
    const isRpc = serviceRegistry.getMode("MEDIA_ORCHESTRATION") === "OUT_OF_PROCESS_RPC";
    const service = isRpc ? rpcInstance : inProcessInstance;
    return service.createLiveEgressToken(options, context);
  },
  invalidateCdnCache: (paths, context) => {
    const isRpc = serviceRegistry.getMode("MEDIA_ORCHESTRATION") === "OUT_OF_PROCESS_RPC";
    const service = isRpc ? rpcInstance : inProcessInstance;
    return service.invalidateCdnCache(paths, context);
  },
};
