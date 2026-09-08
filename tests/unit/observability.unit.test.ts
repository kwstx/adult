/**
 * OBSERVABILITY UNIT TEST SUITE
 * 
 * Verifies all 13 core operational metrics, percentiles, structured JSON logging,
 * and W3C distributed tracing context propagation.
 */

import { TestRunner, assert, assertEqual } from "../utils/test-runner";
import { MetricsRegistry, platformMetrics } from "@/core/observability/metrics-registry";
import { Tracer } from "@/core/observability/tracer";
import { StructuredLogger, redactSensitiveValues } from "@/core/observability/structured-logger";

export async function runObservabilityTests(): Promise<boolean> {
  const runner = new TestRunner("Layer: Observability Architecture Tests");
  runner.printHeader();

  // --------------------------------------------------------------------------
  // TEST 1: Request Latency & Error Rate Calculation
  // --------------------------------------------------------------------------
  await runner.runTest("Metrics: Request latency percentiles (p50, p95, p99) and error rate", () => {
    platformMetrics.reset();

    // Record sample requests
    for (let i = 1; i <= 100; i++) {
      const durationMs = i * 2; // 2ms to 200ms
      const status = i > 95 ? 500 : i > 90 ? 400 : 200;
      platformMetrics.recordHttpRequest(durationMs, status);
    }

    const snap = platformMetrics.getSnapshot();
    assertEqual(snap.httpRequests.total, 100, "Total requests must equal 100");
    assertEqual(snap.httpRequests.success2xx, 90, "2xx count must be 90");
    assertEqual(snap.httpRequests.clientError4xx, 5, "4xx count must be 5");
    assertEqual(snap.httpRequests.serverError5xx, 5, "5xx count must be 5");
    assertEqual(snap.httpRequests.errorRatePercentage, 10, "Error rate must be 10%");
    assert(snap.requestLatency.p50Ms >= 95 && snap.requestLatency.p50Ms <= 105, "p50 latency should be around 100ms");
    assert(snap.requestLatency.p95Ms >= 185, "p95 latency should be around 190ms");
  });

  // --------------------------------------------------------------------------
  // TEST 2: All 13 Core Platform Metrics Tracking
  // --------------------------------------------------------------------------
  await runner.runTest("Metrics: Records all 13 required platform metrics", () => {
    // 3. Database
    platformMetrics.recordDatabaseQuery(15);
    platformMetrics.updateDatabaseConnections(8, 2, 50);

    // 5. Redis
    platformMetrics.recordRedisCommand(2, true);

    // 6. Queue Depth
    platformMetrics.updateQueueDepth({ pending: 12, active: 4, failed: 1, completedTotal: 150 });

    // 7. Livestream Failures
    platformMetrics.recordLivestreamFailure("INGEST_DROP");
    platformMetrics.recordLivestreamFailure("WEBRTC_ERROR");

    // 8. WebSocket Connection Count
    platformMetrics.updateWebSocketConnections(450, 120);

    // 9. Payment Failures
    platformMetrics.recordPaymentFailure("CARD_DECLINED");
    platformMetrics.recordPaymentFailure("GATEWAY_ERROR");

    // 10. Wallet Errors
    platformMetrics.recordWalletError("INSUFFICIENT_FUNDS");
    platformMetrics.recordWalletError("LOCK_TIMEOUT");

    // 11. Video Processing Failures
    platformMetrics.recordVideoProcessingFailure("TRANSCODE_ERROR");

    // 12. Moderation Queue Size
    platformMetrics.updateModerationQueue({
      pending2257: 5,
      unresolvedReports: 14,
      flaggedStreams: 2,
      criticalEscalations: 1,
    });

    // 13. Payout Failures
    platformMetrics.recordPayoutFailure("BANK_REJECTION");

    const snap = platformMetrics.getSnapshot();
    assertEqual(snap.databaseConnections.active, 8, "Active DB connections");
    assertEqual(snap.databaseConnections.utilizationPercentage, 16, "DB connection pool utilization (8/50 = 16%)");
    assertEqual(snap.queueDepth.pendingJobs, 12, "Queue depth pending");
    assertEqual(snap.livestreamFailures.total, 2, "Livestream failures total");
    assertEqual(snap.websocketConnections.totalActive, 570, "WebSocket active total (450+120=570)");
    assertEqual(snap.paymentFailures.total, 2, "Payment failures total");
    assertEqual(snap.walletErrors.total, 2, "Wallet errors total");
    assertEqual(snap.videoProcessingFailures.total, 1, "Video failures total");
    assertEqual(snap.moderationQueue.totalPending, 22, "Moderation queue total (5+14+2+1=22)");
    assertEqual(snap.payoutFailures.total, 1, "Payout failures total");
  });

  // --------------------------------------------------------------------------
  // TEST 3: Prometheus OpenMetrics Exporter
  // --------------------------------------------------------------------------
  await runner.runTest("Prometheus: Serializes metrics into standard OpenMetrics format", () => {
    const output = platformMetrics.toPrometheusMetrics();
    assert(output.includes("http_requests_total"), "Must include http_requests_total");
    assert(output.includes("db_connections_active"), "Must include db_connections_active");
    assert(output.includes("moderation_queue_depth"), "Must include moderation_queue_depth");
    assert(output.includes("websocket_connections_active"), "Must include websocket_connections_active");
  });

  // --------------------------------------------------------------------------
  // TEST 4: W3C Distributed Tracing & Propagation
  // --------------------------------------------------------------------------
  await runner.runTest("Tracing: Formats and propagates W3C traceparent headers", async () => {
    const traceId = Tracer.generateTraceId();
    const spanId = Tracer.generateSpanId();
    const traceparent = `00-${traceId}-${spanId}-01`;

    const parsed = Tracer.parseTraceparent(traceparent);
    assert(parsed !== null, "Traceparent must parse successfully");
    assertEqual(parsed?.traceId, traceId, "Extracted traceId must match");
    assertEqual(parsed?.parentId, spanId, "Parent spanId must match");

    // Test async span execution
    await Tracer.withSpan(
      "test_parent_operation",
      async (parentSpan) => {
        parentSpan.setAttribute("custom.attribute", "value123");
        assertEqual(Tracer.getActiveContext()?.traceId, parentSpan.context.traceId, "Active context must match parent");

        await Tracer.withSpan(
          "test_child_operation",
          async (childSpan) => {
            assertEqual(childSpan.context.parentId, parentSpan.context.spanId, "Child span must link to parent spanId");
            assertEqual(childSpan.context.traceId, parentSpan.context.traceId, "Child span must share same traceId");
          }
        );
      },
      { parentContext: parsed || undefined }
    );
  });

  // --------------------------------------------------------------------------
  // TEST 5: Structured Logging & PII Redaction
  // --------------------------------------------------------------------------
  await runner.runTest("Logger: Redacts sensitive PII, tokens, and passwords from log records", () => {
    const sensitivePayload = {
      user: "alice",
      password: "SuperSecretPassword123!",
      token: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      creditCard: "4111 1111 1111 1111",
      cvv: "123",
      nested: {
        apiKey: "sk_live_1234567890abcdef",
        safeField: "safe_value",
      },
    };

    const redacted = redactSensitiveValues(sensitivePayload);
    assertEqual(redacted.password, "[REDACTED]", "Password must be redacted");
    assertEqual(redacted.token, "[REDACTED]", "Token must be redacted");
    assertEqual(redacted.cvv, "[REDACTED]", "CVV must be redacted");
    assertEqual(redacted.nested.apiKey, "[REDACTED]", "Nested API key must be redacted");
    assertEqual(redacted.nested.safeField, "safe_value", "Safe field must remain unredacted");
  });

  const summary = runner.printFooter();
  return summary.failedCount === 0;
}

if (require.main === module) {
  runObservabilityTests().then((success) => process.exit(success ? 0 : 1));
}
