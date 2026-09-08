/**
 * ============================================================================
 * AUTHORITATIVE PLATFORM METRICS REGISTRY & OBSERVABILITY ENGINE
 * ============================================================================
 * Production metrics collection, percentile calculation, rate estimation,
 * and Prometheus/OpenMetrics formatted export.
 * 
 * Required Core Metrics:
 * 1. Request Latency (p50, p90, p95, p99)
 * 2. Error Rate (4xx, 5xx ratio)
 * 3. Database Latency (p50, p95, p99)
 * 4. Database Connections (Active, Idle, Max, Utilization)
 * 5. Redis Latency (Command latency, Connection state)
 * 6. Queue Depth (Pending, Active, Delayed, Failed jobs)
 * 7. Livestream Failures (Ingest, WebRTC, Transcode, Room disconnects)
 * 8. WebSocket Connection Count (Active live room & notification sockets)
 * 9. Payment Failures (Declines, Gateway 5xx, Webhook failures)
 * 10. Wallet Errors (Insufficient funds, Lock timeouts, Ledger mismatches)
 * 11. Video Processing Failures (Transcoding errors, Thumbnail errors)
 * 12. Moderation Queue Size (Pending 2257 verifications, Reports, Safety cases)
 * 13. Payout Failures (Bank rejections, Compliance blocks, Gateway errors)
 */

export interface LatencyHistogramStats {
  count: number;
  minMs: number;
  maxMs: number;
  avgMs: number;
  p50Ms: number;
  p90Ms: number;
  p95Ms: number;
  p99Ms: number;
}

export class LatencyHistogram {
  private samples: number[] = [];
  private readonly maxSamples: number;

  constructor(maxSamples = 1000) {
    this.maxSamples = maxSamples;
  }

  public record(durationMs: number): void {
    if (isNaN(durationMs) || durationMs < 0) return;
    if (this.samples.length >= this.maxSamples) {
      this.samples.shift(); // sliding window
    }
    this.samples.push(durationMs);
  }

  public getStats(): LatencyHistogramStats {
    if (this.samples.length === 0) {
      return {
        count: 0,
        minMs: 0,
        maxMs: 0,
        avgMs: 0,
        p50Ms: 0,
        p90Ms: 0,
        p95Ms: 0,
        p99Ms: 0,
      };
    }

    const sorted = [...this.samples].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((acc, val) => acc + val, 0);

    const getPercentile = (p: number) => {
      const index = Math.min(Math.floor((p / 100) * count), count - 1);
      return sorted[index];
    };

    return {
      count,
      minMs: sorted[0],
      maxMs: sorted[count - 1],
      avgMs: Math.round((sum / count) * 100) / 100,
      p50Ms: getPercentile(50),
      p90Ms: getPercentile(90),
      p95Ms: getPercentile(95),
      p99Ms: getPercentile(99),
    };
  }

  public reset(): void {
    this.samples = [];
  }
}

export interface PlatformMetricsSnapshot {
  timestamp: string;
  uptimeSeconds: number;
  
  // 1. Request Latency
  requestLatency: LatencyHistogramStats;
  
  // 2. Error Rate
  httpRequests: {
    total: number;
    success2xx: number;
    redirect3xx: number;
    clientError4xx: number;
    serverError5xx: number;
    errorRatePercentage: number;
  };

  // 3. Database Latency
  databaseLatency: LatencyHistogramStats;

  // 4. Database Connections
  databaseConnections: {
    active: number;
    idle: number;
    maxConfigured: number;
    utilizationPercentage: number;
  };

  // 5. Redis Latency
  redisLatency: LatencyHistogramStats & {
    connected: boolean;
    totalCommands: number;
  };

  // 6. Queue Depth
  queueDepth: {
    pendingJobs: number;
    activeJobs: number;
    delayedJobs: number;
    failedJobs: number;
    completedJobsTotal: number;
  };

  // 7. Livestream Failures
  livestreamFailures: {
    total: number;
    ingestDrops: number;
    webrtcFailures: number;
    roomDisconnects: number;
    transcodeFailures: number;
  };

  // 8. WebSocket Connection Count
  websocketConnections: {
    totalActive: number;
    liveRoomSockets: number;
    notificationSockets: number;
    peakConcurrent: number;
  };

  // 9. Payment Failures
  paymentFailures: {
    total: number;
    cardDeclines: number;
    gatewayErrors: number;
    webhookSignatureMismatches: number;
    timeoutErrors: number;
  };

  // 10. Wallet Errors
  walletErrors: {
    total: number;
    insufficientFunds: number;
    concurrencyLockTimeouts: number;
    ledgerMismatches: number;
    negativeBalanceAttempts: number;
  };

  // 11. Video Processing Failures
  videoProcessingFailures: {
    total: number;
    transcodeErrors: number;
    thumbnailErrors: number;
    formatValidationErrors: number;
  };

  // 12. Moderation Queue Size
  moderationQueue: {
    totalPending: number;
    pending2257Verifications: number;
    unresolvedReports: number;
    flaggedLivestreams: number;
    criticalSafetyEscalations: number;
  };

  // 13. Payout Failures
  payoutFailures: {
    total: number;
    bankRejections: number;
    complianceHoldBlocks: number;
    gatewayErrors: number;
  };
}

export class MetricsRegistry {
  private static instance: MetricsRegistry;
  private startTime = Date.now();

  // Histograms
  private requestLatencyHistogram = new LatencyHistogram(2000);
  private databaseLatencyHistogram = new LatencyHistogram(1000);
  private redisLatencyHistogram = new LatencyHistogram(1000);

  // HTTP counters
  private httpTotal = 0;
  private http2xx = 0;
  private http3xx = 0;
  private http4xx = 0;
  private http5xx = 0;

  // Database Connection State
  private dbActiveConn = 0;
  private dbIdleConn = 0;
  private dbMaxConn = parseInt(process.env.DATABASE_MAX_CONNECTIONS || "50", 10);

  // Redis State
  private redisConnected = true;
  private redisCommandCount = 0;

  // Queue Depth State
  private queuePending = 0;
  private queueActive = 0;
  private queueDelayed = 0;
  private queueFailed = 0;
  private queueCompletedTotal = 0;

  // Livestream Failures
  private streamIngestDrops = 0;
  private streamWebRtcFailures = 0;
  private streamRoomDisconnects = 0;
  private streamTranscodeFailures = 0;

  // WebSocket Connection Count
  private wsActiveTotal = 0;
  private wsLiveRooms = 0;
  private wsNotifications = 0;
  private wsPeakConcurrent = 0;

  // Payment Failures
  private payCardDeclines = 0;
  private payGatewayErrors = 0;
  private payWebhookSigMismatches = 0;
  private payTimeouts = 0;

  // Wallet Errors
  private walletInsufficientFunds = 0;
  private walletLockTimeouts = 0;
  private walletLedgerMismatches = 0;
  private walletNegativeAttempts = 0;

  // Video Processing Failures
  private videoTranscodeErrors = 0;
  private videoThumbnailErrors = 0;
  private videoFormatErrors = 0;

  // Moderation Queue State
  private modPending2257 = 0;
  private modUnresolvedReports = 0;
  private modFlaggedStreams = 0;
  private modCriticalEscalations = 0;

  // Payout Failures
  private payoutBankRejections = 0;
  private payoutComplianceBlocks = 0;
  private payoutGatewayErrors = 0;

  private constructor() {}

  public static getInstance(): MetricsRegistry {
    if (!MetricsRegistry.instance) {
      MetricsRegistry.instance = new MetricsRegistry();
    }
    return MetricsRegistry.instance;
  }

  // --------------------------------------------------------------------------
  // 1. Request Latency & HTTP Counters
  // --------------------------------------------------------------------------
  public recordHttpRequest(durationMs: number, statusCode: number): void {
    this.requestLatencyHistogram.record(durationMs);
    this.httpTotal++;
    if (statusCode >= 200 && statusCode < 300) this.http2xx++;
    else if (statusCode >= 300 && statusCode < 400) this.http3xx++;
    else if (statusCode >= 400 && statusCode < 500) this.http4xx++;
    else if (statusCode >= 500) this.http5xx++;
  }

  // --------------------------------------------------------------------------
  // 3. Database Latency & Connections
  // --------------------------------------------------------------------------
  public recordDatabaseQuery(durationMs: number): void {
    this.databaseLatencyHistogram.record(durationMs);
  }

  public updateDatabaseConnections(active: number, idle: number, max?: number): void {
    this.dbActiveConn = Math.max(0, active);
    this.dbIdleConn = Math.max(0, idle);
    if (max) this.dbMaxConn = max;
  }

  // --------------------------------------------------------------------------
  // 5. Redis Latency & Connection
  // --------------------------------------------------------------------------
  public recordRedisCommand(durationMs: number, isConnected = true): void {
    this.redisLatencyHistogram.record(durationMs);
    this.redisCommandCount++;
    this.redisConnected = isConnected;
  }

  // --------------------------------------------------------------------------
  // 6. Queue Depth
  // --------------------------------------------------------------------------
  public updateQueueDepth(counts: {
    pending: number;
    active: number;
    delayed?: number;
    failed?: number;
    completedTotal?: number;
  }): void {
    this.queuePending = Math.max(0, counts.pending);
    this.queueActive = Math.max(0, counts.active);
    if (counts.delayed !== undefined) this.queueDelayed = Math.max(0, counts.delayed);
    if (counts.failed !== undefined) this.queueFailed = Math.max(0, counts.failed);
    if (counts.completedTotal !== undefined) this.queueCompletedTotal = counts.completedTotal;
  }

  // --------------------------------------------------------------------------
  // 7. Livestream Failures
  // --------------------------------------------------------------------------
  public recordLivestreamFailure(type: "INGEST_DROP" | "WEBRTC_ERROR" | "ROOM_DISCONNECT" | "TRANSCODE_ERROR"): void {
    switch (type) {
      case "INGEST_DROP":
        this.streamIngestDrops++;
        break;
      case "WEBRTC_ERROR":
        this.streamWebRtcFailures++;
        break;
      case "ROOM_DISCONNECT":
        this.streamRoomDisconnects++;
        break;
      case "TRANSCODE_ERROR":
        this.streamTranscodeFailures++;
        break;
    }
  }

  // --------------------------------------------------------------------------
  // 8. WebSocket Connection Count
  // --------------------------------------------------------------------------
  public updateWebSocketConnections(liveRooms: number, notifications: number): void {
    this.wsLiveRooms = Math.max(0, liveRooms);
    this.wsNotifications = Math.max(0, notifications);
    this.wsActiveTotal = this.wsLiveRooms + this.wsNotifications;
    if (this.wsActiveTotal > this.wsPeakConcurrent) {
      this.wsPeakConcurrent = this.wsActiveTotal;
    }
  }

  public incrementWebSocketConnection(type: "LIVE_ROOM" | "NOTIFICATION"): void {
    if (type === "LIVE_ROOM") this.wsLiveRooms++;
    else this.wsNotifications++;
    this.wsActiveTotal = this.wsLiveRooms + this.wsNotifications;
    if (this.wsActiveTotal > this.wsPeakConcurrent) {
      this.wsPeakConcurrent = this.wsActiveTotal;
    }
  }

  public decrementWebSocketConnection(type: "LIVE_ROOM" | "NOTIFICATION"): void {
    if (type === "LIVE_ROOM") this.wsLiveRooms = Math.max(0, this.wsLiveRooms - 1);
    else this.wsNotifications = Math.max(0, this.wsNotifications - 1);
    this.wsActiveTotal = this.wsLiveRooms + this.wsNotifications;
  }

  // --------------------------------------------------------------------------
  // 9. Payment Failures
  // --------------------------------------------------------------------------
  public recordPaymentFailure(reason: "CARD_DECLINED" | "GATEWAY_ERROR" | "WEBHOOK_SIG_MISMATCH" | "TIMEOUT"): void {
    switch (reason) {
      case "CARD_DECLINED":
        this.payCardDeclines++;
        break;
      case "GATEWAY_ERROR":
        this.payGatewayErrors++;
        break;
      case "WEBHOOK_SIG_MISMATCH":
        this.payWebhookSigMismatches++;
        break;
      case "TIMEOUT":
        this.payTimeouts++;
        break;
    }
  }

  // --------------------------------------------------------------------------
  // 10. Wallet Errors
  // --------------------------------------------------------------------------
  public recordWalletError(type: "INSUFFICIENT_FUNDS" | "LOCK_TIMEOUT" | "LEDGER_MISMATCH" | "NEGATIVE_BALANCE_ATTEMPT"): void {
    switch (type) {
      case "INSUFFICIENT_FUNDS":
        this.walletInsufficientFunds++;
        break;
      case "LOCK_TIMEOUT":
        this.walletLockTimeouts++;
        break;
      case "LEDGER_MISMATCH":
        this.walletLedgerMismatches++;
        break;
      case "NEGATIVE_BALANCE_ATTEMPT":
        this.walletNegativeAttempts++;
        break;
    }
  }

  // --------------------------------------------------------------------------
  // 11. Video Processing Failures
  // --------------------------------------------------------------------------
  public recordVideoProcessingFailure(type: "TRANSCODE_ERROR" | "THUMBNAIL_ERROR" | "FORMAT_VALIDATION"): void {
    switch (type) {
      case "TRANSCODE_ERROR":
        this.videoTranscodeErrors++;
        break;
      case "THUMBNAIL_ERROR":
        this.videoThumbnailErrors++;
        break;
      case "FORMAT_VALIDATION":
        this.videoFormatErrors++;
        break;
    }
  }

  // --------------------------------------------------------------------------
  // 12. Moderation Queue Size
  // --------------------------------------------------------------------------
  public updateModerationQueue(counts: {
    pending2257: number;
    unresolvedReports: number;
    flaggedStreams: number;
    criticalEscalations: number;
  }): void {
    this.modPending2257 = Math.max(0, counts.pending2257);
    this.modUnresolvedReports = Math.max(0, counts.unresolvedReports);
    this.modFlaggedStreams = Math.max(0, counts.flaggedStreams);
    this.modCriticalEscalations = Math.max(0, counts.criticalEscalations);
  }

  // --------------------------------------------------------------------------
  // 13. Payout Failures
  // --------------------------------------------------------------------------
  public recordPayoutFailure(type: "BANK_REJECTION" | "COMPLIANCE_HOLD" | "GATEWAY_ERROR"): void {
    switch (type) {
      case "BANK_REJECTION":
        this.payoutBankRejections++;
        break;
      case "COMPLIANCE_HOLD":
        this.payoutComplianceBlocks++;
        break;
      case "GATEWAY_ERROR":
        this.payoutGatewayErrors++;
        break;
    }
  }

  // --------------------------------------------------------------------------
  // Aggregated Snapshot
  // --------------------------------------------------------------------------
  public getSnapshot(): PlatformMetricsSnapshot {
    const errorCount = this.http4xx + this.http5xx;
    const errorRatePercentage = this.httpTotal > 0
      ? Math.round((errorCount / this.httpTotal) * 10000) / 100
      : 0;

    const dbUtil = this.dbMaxConn > 0
      ? Math.round((this.dbActiveConn / this.dbMaxConn) * 10000) / 100
      : 0;

    return {
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),

      requestLatency: this.requestLatencyHistogram.getStats(),
      httpRequests: {
        total: this.httpTotal,
        success2xx: this.http2xx,
        redirect3xx: this.http3xx,
        clientError4xx: this.http4xx,
        serverError5xx: this.http5xx,
        errorRatePercentage,
      },

      databaseLatency: this.databaseLatencyHistogram.getStats(),
      databaseConnections: {
        active: this.dbActiveConn,
        idle: this.dbIdleConn,
        maxConfigured: this.dbMaxConn,
        utilizationPercentage: dbUtil,
      },

      redisLatency: {
        ...this.redisLatencyHistogram.getStats(),
        connected: this.redisConnected,
        totalCommands: this.redisCommandCount,
      },

      queueDepth: {
        pendingJobs: this.queuePending,
        activeJobs: this.queueActive,
        delayedJobs: this.queueDelayed,
        failedJobs: this.queueFailed,
        completedJobsTotal: this.queueCompletedTotal,
      },

      livestreamFailures: {
        total: this.streamIngestDrops + this.streamWebRtcFailures + this.streamRoomDisconnects + this.streamTranscodeFailures,
        ingestDrops: this.streamIngestDrops,
        webrtcFailures: this.streamWebRtcFailures,
        roomDisconnects: this.streamRoomDisconnects,
        transcodeFailures: this.streamTranscodeFailures,
      },

      websocketConnections: {
        totalActive: this.wsActiveTotal,
        liveRoomSockets: this.wsLiveRooms,
        notificationSockets: this.wsNotifications,
        peakConcurrent: this.wsPeakConcurrent,
      },

      paymentFailures: {
        total: this.payCardDeclines + this.payGatewayErrors + this.payWebhookSigMismatches + this.payTimeouts,
        cardDeclines: this.payCardDeclines,
        gatewayErrors: this.payGatewayErrors,
        webhookSignatureMismatches: this.payWebhookSigMismatches,
        timeoutErrors: this.payTimeouts,
      },

      walletErrors: {
        total: this.walletInsufficientFunds + this.walletLockTimeouts + this.walletLedgerMismatches + this.walletNegativeAttempts,
        insufficientFunds: this.walletInsufficientFunds,
        concurrencyLockTimeouts: this.walletLockTimeouts,
        ledgerMismatches: this.walletLedgerMismatches,
        negativeBalanceAttempts: this.walletNegativeAttempts,
      },

      videoProcessingFailures: {
        total: this.videoTranscodeErrors + this.videoThumbnailErrors + this.videoFormatErrors,
        transcodeErrors: this.videoTranscodeErrors,
        thumbnailErrors: this.videoThumbnailErrors,
        formatValidationErrors: this.videoFormatErrors,
      },

      moderationQueue: {
        totalPending: this.modPending2257 + this.modUnresolvedReports + this.modFlaggedStreams + this.modCriticalEscalations,
        pending2257Verifications: this.modPending2257,
        unresolvedReports: this.modUnresolvedReports,
        flaggedLivestreams: this.modFlaggedStreams,
        criticalSafetyEscalations: this.modCriticalEscalations,
      },

      payoutFailures: {
        total: this.payoutBankRejections + this.payoutComplianceBlocks + this.payoutGatewayErrors,
        bankRejections: this.payoutBankRejections,
        complianceHoldBlocks: this.payoutComplianceBlocks,
        gatewayErrors: this.payoutGatewayErrors,
      },
    };
  }

  // --------------------------------------------------------------------------
  // Prometheus / OpenMetrics Formatted Output
  // --------------------------------------------------------------------------
  public toPrometheusMetrics(): string {
    const snap = this.getSnapshot();
    const lines: string[] = [];

    // Helper
    const addMetric = (name: string, type: "counter" | "gauge" | "summary", help: string, value: number, labels: Record<string, string> = {}) => {
      lines.push(`# HELP ${name} ${help}`);
      lines.push(`# TYPE ${name} ${type}`);
      const labelEntries = Object.entries(labels);
      const labelStr = labelEntries.length > 0
        ? labelEntries.map(([k, v]) => `${k}="${v}"`).join(",")
        : "";
      lines.push(`${name}${labelStr ? `{${labelStr}}` : ""} ${value}`);
    };

    // 1. HTTP Latency & Requests
    addMetric("http_requests_total", "counter", "Total HTTP requests handled", snap.httpRequests.total);
    addMetric("http_requests_by_status", "counter", "HTTP requests by status code category", snap.httpRequests.success2xx, { status_category: "2xx" });
    addMetric("http_requests_by_status", "counter", "HTTP requests by status code category", snap.httpRequests.clientError4xx, { status_category: "4xx" });
    addMetric("http_requests_by_status", "counter", "HTTP requests by status code category", snap.httpRequests.serverError5xx, { status_category: "5xx" });
    addMetric("http_error_rate_percentage", "gauge", "Calculated HTTP error rate percentage (4xx + 5xx)", snap.httpRequests.errorRatePercentage);
    addMetric("http_request_latency_p50_ms", "gauge", "HTTP request latency 50th percentile in ms", snap.requestLatency.p50Ms);
    addMetric("http_request_latency_p95_ms", "gauge", "HTTP request latency 95th percentile in ms", snap.requestLatency.p95Ms);
    addMetric("http_request_latency_p99_ms", "gauge", "HTTP request latency 99th percentile in ms", snap.requestLatency.p99Ms);

    // 2. Database
    addMetric("db_query_latency_p95_ms", "gauge", "Database query latency 95th percentile in ms", snap.databaseLatency.p95Ms);
    addMetric("db_connections_active", "gauge", "Active database connections", snap.databaseConnections.active);
    addMetric("db_connections_idle", "gauge", "Idle database connections", snap.databaseConnections.idle);
    addMetric("db_connections_utilization_percent", "gauge", "Database connection pool utilization %", snap.databaseConnections.utilizationPercentage);

    // 3. Redis
    addMetric("redis_command_latency_p95_ms", "gauge", "Redis command latency 95th percentile in ms", snap.redisLatency.p95Ms);
    addMetric("redis_connected", "gauge", "Redis connection status (1 = connected, 0 = disconnected)", snap.redisLatency.connected ? 1 : 0);

    // 4. Queues & Workers
    addMetric("queue_depth_pending", "gauge", "Pending jobs waiting for execution in worker queues", snap.queueDepth.pendingJobs);
    addMetric("queue_depth_active", "gauge", "Currently running jobs across workers", snap.queueDepth.activeJobs);
    addMetric("queue_jobs_failed_total", "counter", "Total failed background jobs", snap.queueDepth.failedJobs);

    // 5. Livestreams & WebSockets
    addMetric("livestream_failures_total", "counter", "Total livestream failures", snap.livestreamFailures.total);
    addMetric("websocket_connections_active", "gauge", "Active WebSocket / SSE connection count", snap.websocketConnections.totalActive);
    addMetric("websocket_connections_live_rooms", "gauge", "Connected viewers in live rooms", snap.websocketConnections.liveRoomSockets);

    // 6. Payments & Wallet
    addMetric("payment_failures_total", "counter", "Total payment gateway failures and declines", snap.paymentFailures.total);
    addMetric("wallet_errors_total", "counter", "Total wallet transaction errors and concurrency issues", snap.walletErrors.total);

    // 7. Video Processing
    addMetric("video_processing_failures_total", "counter", "Total video transcode and thumbnail failures", snap.videoProcessingFailures.total);

    // 8. Moderation & Payouts
    addMetric("moderation_queue_depth", "gauge", "Total pending items in moderation and 2257 review queues", snap.moderationQueue.totalPending);
    addMetric("payout_failures_total", "counter", "Total failed creator payout transactions", snap.payoutFailures.total);

    return lines.join("\n") + "\n";
  }

  public reset(): void {
    this.requestLatencyHistogram.reset();
    this.databaseLatencyHistogram.reset();
    this.redisLatencyHistogram.reset();
    this.httpTotal = 0;
    this.http2xx = 0;
    this.http3xx = 0;
    this.http4xx = 0;
    this.http5xx = 0;
    this.streamIngestDrops = 0;
    this.streamWebRtcFailures = 0;
    this.streamRoomDisconnects = 0;
    this.streamTranscodeFailures = 0;
    this.payCardDeclines = 0;
    this.payGatewayErrors = 0;
    this.payWebhookSigMismatches = 0;
    this.payTimeouts = 0;
    this.walletInsufficientFunds = 0;
    this.walletLockTimeouts = 0;
    this.walletLedgerMismatches = 0;
    this.walletNegativeAttempts = 0;
    this.videoTranscodeErrors = 0;
    this.videoThumbnailErrors = 0;
    this.videoFormatErrors = 0;
    this.payoutBankRejections = 0;
    this.payoutComplianceBlocks = 0;
    this.payoutGatewayErrors = 0;
  }
}

export const platformMetrics = MetricsRegistry.getInstance();
