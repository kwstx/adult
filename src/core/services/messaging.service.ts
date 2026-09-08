/**
 * Messaging Service Boundary
 * 
 * Candidate Service #3: Natural candidate for extraction when high-concurrency
 * WebSocket connections and ephemeral message fan-out exceed web application sizing.
 */

import { serviceRegistry } from "../service-boundary/service-registry";
import { RpcClient } from "../service-boundary/rpc-client";
import { ServiceContext } from "../service-boundary/types";
import { redis } from "@/lib/redis";

export interface DirectMessagePayload {
  senderId: string;
  recipientId: string;
  content: string;
  tipAmountCredits?: number;
  mediaAttachmentUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface ChatRoomBroadcastPayload {
  roomId: string;
  senderId: string;
  senderName: string;
  senderRole: "FAN" | "CREATOR" | "VIP" | "MODERATOR";
  content: string;
  highlightTier?: "NORMAL" | "SUPER_CHAT" | "DIAMOND";
}

export interface IMessagingService {
  sendDirectMessage(
    payload: DirectMessagePayload,
    context?: Partial<ServiceContext>
  ): Promise<{ messageId: string; deliveredAt: string; status: "SENT" | "PENDING_ACCEPTANCE" }>;

  broadcastRoomChat(
    payload: ChatRoomBroadcastPayload,
    context?: Partial<ServiceContext>
  ): Promise<{ broadcastId: string; recipientCount: number }>;

  getRecentMessages(
    channelId: string,
    limit?: number,
    context?: Partial<ServiceContext>
  ): Promise<{ messages: any[] }>;

  muteUser(
    roomId: string,
    userId: string,
    durationSeconds: number,
    context?: Partial<ServiceContext>
  ): Promise<{ isMuted: boolean; expiresAt: string }>;
}

/**
 * In-Process Implementation (Modular Monolith Default via Redis PubSub)
 */
export class InProcessMessagingService implements IMessagingService {
  public async sendDirectMessage(payload: DirectMessagePayload) {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const deliveredAt = new Date().toISOString();

    if (redis.status === "ready") {
      try {
        await redis.publish(
          `user:${payload.recipientId}:messages`,
          JSON.stringify({ messageId, ...payload, deliveredAt })
        );
      } catch {}
    }

    return {
      messageId,
      deliveredAt,
      status: "SENT" as const,
    };
  }

  public async broadcastRoomChat(payload: ChatRoomBroadcastPayload) {
    const broadcastId = `bcast_${Date.now()}`;
    if (redis.status === "ready") {
      try {
        await redis.publish(`room:${payload.roomId}:chat`, JSON.stringify(payload));
      } catch {}
    }
    return { broadcastId, recipientCount: 1 };
  }

  public async getRecentMessages(channelId: string, limit = 50) {
    return {
      messages: [
        {
          id: `msg_seed_1`,
          channelId,
          content: "Welcome to the live stream chat!",
          createdAt: new Date().toISOString(),
        },
      ],
    };
  }

  public async muteUser(roomId: string, userId: string, durationSeconds: number) {
    const expiresAt = new Date(Date.now() + durationSeconds * 1000).toISOString();
    if (redis.status === "ready") {
      try {
        await redis.setex(`mute:${roomId}:${userId}`, durationSeconds, "1");
      } catch {}
    }
    return { isMuted: true, expiresAt };
  }
}

/**
 * Out-of-Process Client (Microservice Remote RPC Proxy)
 */
export class RpcMessagingService implements IMessagingService {
  private rpc: RpcClient;

  constructor() {
    this.rpc = new RpcClient({
      endpoint: serviceRegistry.getEndpoint("MESSAGING"),
      timeoutMs: 4000,
      maxRetries: 2,
      retryDelayMs: 150,
    });
  }

  public async sendDirectMessage(payload: DirectMessagePayload, context?: Partial<ServiceContext>) {
    return this.rpc.call<{ messageId: string; deliveredAt: string; status: "SENT" | "PENDING_ACCEPTANCE" }>(
      "dm/send",
      payload,
      context as ServiceContext
    );
  }

  public async broadcastRoomChat(payload: ChatRoomBroadcastPayload, context?: Partial<ServiceContext>) {
    return this.rpc.call<{ broadcastId: string; recipientCount: number }>(
      "room/broadcast",
      payload,
      context as ServiceContext
    );
  }

  public async getRecentMessages(channelId: string, limit?: number, context?: Partial<ServiceContext>) {
    return this.rpc.call<{ messages: any[] }>(
      "history",
      { channelId, limit },
      context as ServiceContext
    );
  }

  public async muteUser(
    roomId: string,
    userId: string,
    durationSeconds: number,
    context?: Partial<ServiceContext>
  ) {
    return this.rpc.call<{ isMuted: boolean; expiresAt: string }>(
      "moderation/mute",
      { roomId, userId, durationSeconds },
      context as ServiceContext
    );
  }
}

// Register default in-process implementation
const inProcessInstance = new InProcessMessagingService();
const rpcInstance = new RpcMessagingService();
serviceRegistry.register("MESSAGING", inProcessInstance);

/**
 * Unified Boundary Dispatcher
 */
export const messagingService: IMessagingService = {
  sendDirectMessage: (payload, context) => {
    const isRpc = serviceRegistry.getMode("MESSAGING") === "OUT_OF_PROCESS_RPC";
    const service = isRpc ? rpcInstance : inProcessInstance;
    return service.sendDirectMessage(payload, context);
  },
  broadcastRoomChat: (payload, context) => {
    const isRpc = serviceRegistry.getMode("MESSAGING") === "OUT_OF_PROCESS_RPC";
    const service = isRpc ? rpcInstance : inProcessInstance;
    return service.broadcastRoomChat(payload, context);
  },
  getRecentMessages: (channelId, limit, context) => {
    const isRpc = serviceRegistry.getMode("MESSAGING") === "OUT_OF_PROCESS_RPC";
    const service = isRpc ? rpcInstance : inProcessInstance;
    return service.getRecentMessages(channelId, limit, context);
  },
  muteUser: (roomId, userId, durationSeconds, context) => {
    const isRpc = serviceRegistry.getMode("MESSAGING") === "OUT_OF_PROCESS_RPC";
    const service = isRpc ? rpcInstance : inProcessInstance;
    return service.muteUser(roomId, userId, durationSeconds, context);
  },
};
