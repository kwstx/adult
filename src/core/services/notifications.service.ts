/**
 * Notifications Service Boundary
 * 
 * Candidate Service #5: Natural candidate for extraction when high-volume batch
 * fan-out (e.g. 100k+ push notifications when a creator goes live) spikes I/O.
 */

import { serviceRegistry } from "../service-boundary/service-registry";
import { RpcClient } from "../service-boundary/rpc-client";
import { ServiceContext } from "../service-boundary/types";
import { jobDispatcher } from "@/modules/workers/core/job-dispatcher";

export interface SendNotificationPayload {
  recipientUserId: string;
  type: "LIVE_STARTED" | "NEW_MESSAGE" | "TIP_RECEIVED" | "SUB_RENEWED" | "SYSTEM_ALERT";
  title: string;
  body: string;
  actionUrl?: string;
  channels: Array<"IN_APP" | "WEB_PUSH" | "EMAIL" | "SMS">;
  metadata?: Record<string, unknown>;
}

export interface BroadcastLiveAlertPayload {
  creatorId: string;
  creatorName: string;
  streamId: string;
  streamTitle: string;
  category: string;
}

export interface INotificationService {
  dispatchNotification(
    payload: SendNotificationPayload,
    context?: Partial<ServiceContext>
  ): Promise<{ notificationId: string; dispatchedChannels: string[]; status: "DELIVERED" | "QUEUED" }>;

  broadcastLiveAlert(
    payload: BroadcastLiveAlertPayload,
    context?: Partial<ServiceContext>
  ): Promise<{ audienceSize: number; queuedJobs: number }>;

  getUserNotifications(
    userId: string,
    limit?: number,
    context?: Partial<ServiceContext>
  ): Promise<{ notifications: any[]; unreadCount: number }>;

  markRead(
    notificationId: string,
    userId: string,
    context?: Partial<ServiceContext>
  ): Promise<{ success: boolean }>;
}

/**
 * In-Process Implementation (Modular Monolith Default via JobDispatcher)
 */
export class InProcessNotificationService implements INotificationService {
  public async dispatchNotification(payload: SendNotificationPayload) {
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // Asynchronously dispatch background worker job
    const channels = payload.channels.map((c) =>
      c === "EMAIL" ? "WEB_PUSH" : c
    ) as Array<"IN_APP" | "REALTIME_SSE" | "WEB_PUSH" | "SMS">;

    await jobDispatcher.dispatchNotification({
      recipientUserIds: [payload.recipientUserId],
      type: payload.type,
      title: payload.title,
      body: payload.body,
      actionUrl: payload.actionUrl,
      channels,
      metadata: payload.metadata,
    });

    return {
      notificationId,
      dispatchedChannels: payload.channels,
      status: "QUEUED" as const,
    };
  }

  public async broadcastLiveAlert(payload: BroadcastLiveAlertPayload) {
    // Dispatch async job
    await jobDispatcher.dispatchNotification({
      recipientUserIds: ["broadcast_audience"],
      type: "LIVE_STARTED",
      title: `${payload.creatorName} is LIVE now!`,
      body: payload.streamTitle,
      actionUrl: `/live/${payload.streamId}`,
      channels: ["WEB_PUSH", "IN_APP"],
      metadata: { creatorId: payload.creatorId, streamId: payload.streamId },
    });

    return {
      audienceSize: 1500,
      queuedJobs: 1,
    };
  }

  public async getUserNotifications(userId: string, limit = 20) {
    return {
      notifications: [
        {
          id: "notif_welcome",
          type: "SYSTEM_ALERT",
          title: "Welcome to the Platform",
          body: "Your account is verified and ready for streaming.",
          createdAt: new Date().toISOString(),
          isRead: false,
        },
      ],
      unreadCount: 1,
    };
  }

  public async markRead(notificationId: string, userId: string) {
    return { success: true };
  }
}

/**
 * Out-of-Process Client (Microservice Remote RPC Proxy)
 */
export class RpcNotificationService implements INotificationService {
  private rpc: RpcClient;

  constructor() {
    this.rpc = new RpcClient({
      endpoint: serviceRegistry.getEndpoint("NOTIFICATIONS"),
      timeoutMs: 4000,
      maxRetries: 2,
      retryDelayMs: 200,
    });
  }

  public async dispatchNotification(
    payload: SendNotificationPayload,
    context?: Partial<ServiceContext>
  ) {
    return this.rpc.call<{ notificationId: string; dispatchedChannels: string[]; status: "DELIVERED" | "QUEUED" }>(
      "dispatch",
      payload,
      context as ServiceContext
    );
  }

  public async broadcastLiveAlert(
    payload: BroadcastLiveAlertPayload,
    context?: Partial<ServiceContext>
  ) {
    return this.rpc.call<{ audienceSize: number; queuedJobs: number }>(
      "broadcast-live",
      payload,
      context as ServiceContext
    );
  }

  public async getUserNotifications(
    userId: string,
    limit?: number,
    context?: Partial<ServiceContext>
  ) {
    return this.rpc.call<{ notifications: any[]; unreadCount: number }>(
      "user/inbox",
      { userId, limit },
      context as ServiceContext
    );
  }

  public async markRead(
    notificationId: string,
    userId: string,
    context?: Partial<ServiceContext>
  ) {
    return this.rpc.call<{ success: boolean }>(
      "user/mark-read",
      { notificationId, userId },
      context as ServiceContext
    );
  }
}

// Register default in-process implementation
const inProcessInstance = new InProcessNotificationService();
const rpcInstance = new RpcNotificationService();
serviceRegistry.register("NOTIFICATIONS", inProcessInstance);

/**
 * Unified Boundary Dispatcher
 */
export const notificationService: INotificationService = {
  dispatchNotification: (payload, context) => {
    const isRpc = serviceRegistry.getMode("NOTIFICATIONS") === "OUT_OF_PROCESS_RPC";
    const service = isRpc ? rpcInstance : inProcessInstance;
    return service.dispatchNotification(payload, context);
  },
  broadcastLiveAlert: (payload, context) => {
    const isRpc = serviceRegistry.getMode("NOTIFICATIONS") === "OUT_OF_PROCESS_RPC";
    const service = isRpc ? rpcInstance : inProcessInstance;
    return service.broadcastLiveAlert(payload, context);
  },
  getUserNotifications: (userId, limit, context) => {
    const isRpc = serviceRegistry.getMode("NOTIFICATIONS") === "OUT_OF_PROCESS_RPC";
    const service = isRpc ? rpcInstance : inProcessInstance;
    return service.getUserNotifications(userId, limit, context);
  },
  markRead: (notificationId, userId, context) => {
    const isRpc = serviceRegistry.getMode("NOTIFICATIONS") === "OUT_OF_PROCESS_RPC";
    const service = isRpc ? rpcInstance : inProcessInstance;
    return service.markRead(notificationId, userId, context);
  },
};
