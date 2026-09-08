/**
 * Standalone Microservice Runner & Universal HTTP/RPC Server
 * 
 * Usage:
 *   npx tsx src/services/standalone-server.ts --service=PAYMENTS_WALLET --port=4002
 *   or:
 *   npx tsx src/services/standalone-server.ts --all
 * 
 * When a domain hits its load or organizational threshold, this runner boots
 * the service as an independent microservice process without code duplication.
 */

import http from "http";
import { ServiceName } from "../core/service-boundary/types";
import {
  InProcessMediaOrchestrationService,
  InProcessPaymentWalletService,
  InProcessMessagingService,
  InProcessRecommendationService,
  InProcessNotificationService,
  InProcessModerationService,
  InProcessAnalyticsService,
  InProcessSearchService,
  InProcessCreatorPayoutService,
} from "../core/services";

export interface ServiceServerConfig {
  serviceName: ServiceName;
  port: number;
}

export class StandaloneServiceServer {
  private server: http.Server | null = null;
  private handlerInstance: any;
  private requestCount = 0;
  private startTime = Date.now();

  constructor(public readonly config: ServiceServerConfig) {
    this.handlerInstance = this.resolveServiceHandler(config.serviceName);
  }

  private resolveServiceHandler(serviceName: ServiceName): any {
    switch (serviceName) {
      case "MEDIA_ORCHESTRATION":
        return new InProcessMediaOrchestrationService();
      case "PAYMENTS_WALLET":
        return new InProcessPaymentWalletService();
      case "MESSAGING":
        return new InProcessMessagingService();
      case "RECOMMENDATION":
        return new InProcessRecommendationService();
      case "NOTIFICATIONS":
        return new InProcessNotificationService();
      case "MODERATION":
        return new InProcessModerationService();
      case "ANALYTICS":
        return new InProcessAnalyticsService();
      case "SEARCH":
        return new InProcessSearchService();
      case "CREATOR_PAYOUTS":
        return new InProcessCreatorPayoutService();
      default:
        throw new Error(`Unsupported standalone service: ${serviceName}`);
    }
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        this.requestCount++;
        const url = req.url || "/";
        const method = req.method || "GET";

        // Health Check Endpoint
        if (url === "/health" && method === "GET") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              status: "UP",
              service: this.config.serviceName,
              uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
              memoryUsage: process.memoryUsage(),
              timestamp: new Date().toISOString(),
            })
          );
          return;
        }

        // Metrics Endpoint
        if (url === "/metrics" && method === "GET") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              service: this.config.serviceName,
              totalRequests: this.requestCount,
              activeConnections: 1,
            })
          );
          return;
        }

        // RPC Dispatch Endpoint (POST)
        if (method === "POST") {
          let body = "";
          req.on("data", (chunk) => (body += chunk));
          req.on("end", async () => {
            try {
              const payload = body ? JSON.parse(body) : {};
              const actionPath = url.replace(/^\//, "").replace(/\//g, "_");

              // Route action to matching method on service handler
              const actionMethodMap: Record<string, string> = {
                "transcode": "requestTranscoding",
                "sign-url": "generateSignedMediaUrl",
                "live-egress-token": "createLiveEgressToken",
                "invalidate-cdn": "invalidateCdnCache",
                "get-balance": "getBalance",
                "reserve-credits": "reserveCredits",
                "transfer-credits": "transferCredits",
                "webhook": "processGatewayWebhook",
                "verify-ledger": "verifyLedgerIntegrity",
                "dm_send": "sendDirectMessage",
                "room_broadcast": "broadcastRoomChat",
                "history": "getRecentMessages",
                "moderation_mute": "muteUser",
                "feed_recommendations": "getLiveFeedRecommendations",
                "affinity_score": "calculateUserCreatorAffinity",
                "signals_ingest": "recordInteractionSignal",
                "dispatch": "dispatchNotification",
                "broadcast-live": "broadcastLiveAlert",
                "user_inbox": "getUserNotifications",
                "user_mark-read": "markRead",
                "screen_text": "screenText",
                "screen_media": "screenMedia",
                "sanctions_enforce": "enforceSanction",
                "compliance_2257": "verify2257Compliance",
                "events_track": "trackEvent",
                "events_batch": "trackBatch",
                "metrics_creator-revenue": "getCreatorRevenueMetrics",
                "metrics_live-viewers": "getLiveViewerStats",
                "query": "search",
                "index": "indexEntity",
                "tags": "searchTags",
                "earnings": "getPayableEarnings",
                "payouts_request": "requestPayout",
                "payouts_batch-process": "processBatchPayouts",
                "payouts_reconcile": "reconcilePayout",
              };

              const methodName = actionMethodMap[actionPath] || actionPath;

              if (typeof this.handlerInstance[methodName] === "function") {
                const result = await this.handlerInstance[methodName](payload);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify(result));
              } else {
                res.writeHead(404, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    error: `Method ${methodName} (path ${actionPath}) not implemented on service ${this.config.serviceName}`,
                  })
                );
              }
            } catch (err: any) {
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  error: err.message || "Internal RPC Server Error",
                })
              );
            }
          });
          return;
        }

        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not Found" }));
      });

      this.server.listen(this.config.port, () => {
        console.log(
          `[StandaloneService:${this.config.serviceName}] 🚀 Microservice running on http://localhost:${this.config.port}`
        );
        resolve();
      });

      this.server.on("error", (err) => reject(err));
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log(`[StandaloneService:${this.config.serviceName}] Stopped.`);
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// CLI Bootstrapper
if (require.main === module) {
  const args = process.argv.slice(2);
  const serviceArg = args.find((a) => a.startsWith("--service="))?.split("=")[1] as ServiceName;
  const portArg = parseInt(args.find((a) => a.startsWith("--port="))?.split("=")[1] || "4000", 10);
  const allArg = args.includes("--all");

  const servicePorts: Record<ServiceName, number> = {
    MEDIA_ORCHESTRATION: 4001,
    PAYMENTS_WALLET: 4002,
    MESSAGING: 4003,
    RECOMMENDATION: 4004,
    NOTIFICATIONS: 4005,
    MODERATION: 4006,
    ANALYTICS: 4007,
    SEARCH: 4008,
    CREATOR_PAYOUTS: 4009,
  };

  if (allArg) {
    console.log("================================================================");
    console.log("🌐 BOOTING ALL 9 STANDALONE MICROSERVICES");
    console.log("================================================================");
    Object.entries(servicePorts).forEach(async ([serviceName, port]) => {
      const server = new StandaloneServiceServer({
        serviceName: serviceName as ServiceName,
        port,
      });
      await server.start();
    });
  } else if (serviceArg) {
    const port = portArg || servicePorts[serviceArg] || 4000;
    const server = new StandaloneServiceServer({
      serviceName: serviceArg,
      port,
    });
    server.start().catch((err) => {
      console.error(`Failed to start standalone service ${serviceArg}:`, err);
      process.exit(1);
    });
  } else {
    console.log("Usage:");
    console.log("  npx tsx src/services/standalone-server.ts --service=PAYMENTS_WALLET --port=4002");
    console.log("  npx tsx src/services/standalone-server.ts --all");
  }
}
