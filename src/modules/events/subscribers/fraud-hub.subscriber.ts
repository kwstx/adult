/**
 * Fraud Prevention & Risk Detection Event Hub Subscriber
 *
 * Evaluates real-time event velocity, sudden spend bursts, rapid multi-item acquisitions,
 * and anomalous behavior across the platform.
 */

import { eventBus } from "@/modules/realtime/event-bus";
import { UserSentGiftPayload, UserBoughtContentPayload, SessionBookedPayload } from "../types";
import { StructuredLogger } from "@/core/observability";

export interface FraudRiskSignal {
  userId: string;
  anomalyType: "RAPID_SPEND_BURST" | "VELOCITY_SPIKE" | "HIGH_FREQUENCY_BOOKING";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  details: Record<string, any>;
  detectedAt: Date;
}

// In-memory velocity window store (sliding 60-second window per user)
const userVelocityWindows = new Map<string, Array<{ amount: number; timestamp: number }>>();
const fraudRiskLog: FraudRiskSignal[] = [];

export class FraudHubSubscriber {
  private static registered = false;
  public static processedCount = 0;
  public static detectedRiskCount = 0;

  public static register(): void {
    if (this.registered) return;
    this.registered = true;

    // 1. Monitor Gift Spend Velocity
    eventBus.on("USER_SENT_GIFT", (event) => {
      this.processedCount++;
      const payload = event.payload as UserSentGiftPayload;
      this.analyzeSpendVelocity(payload.userId, payload.amountCredits, "GIFT_BURST");
    });

    // 2. Monitor PPV Content Purchase Velocity
    eventBus.on("USER_BOUGHT_CONTENT", (event) => {
      this.processedCount++;
      const payload = event.payload as UserBoughtContentPayload;
      this.analyzeSpendVelocity(payload.userId, payload.priceCreditsPaid, "PPV_BURST");
    });

    // 3. Monitor Booking Frequency
    eventBus.on("SESSION_BOOKED", (event) => {
      this.processedCount++;
      const payload = event.payload as SessionBookedPayload;
      this.analyzeSpendVelocity(payload.fanId, payload.totalCreditsEscrowed, "SESSION_BOOKING_BURST");
    });
  }

  private static analyzeSpendVelocity(userId: string, amount: number, context: string): void {
    const now = Date.now();
    const windowMs = 60 * 1000; // 60-second sliding window

    let history = userVelocityWindows.get(userId) || [];
    history = history.filter((h) => now - h.timestamp < windowMs);
    history.push({ amount, timestamp: now });
    userVelocityWindows.set(userId, history);

    const totalInWindow = history.reduce((sum, h) => sum + h.amount, 0);
    const countInWindow = history.length;

    // Thresholds: > 10 transactions or > 10,000 credits in 60 seconds
    if (countInWindow >= 10 || totalInWindow >= 10000) {
      this.detectedRiskCount++;
      const signal: FraudRiskSignal = {
        userId,
        anomalyType: "RAPID_SPEND_BURST",
        severity: totalInWindow >= 25000 ? "CRITICAL" : "HIGH",
        details: { countInWindow, totalInWindow, context },
        detectedAt: new Date(),
      };

      fraudRiskLog.push(signal);

      StructuredLogger.warn("Fraud Detection Hub: High Spend Velocity Anomaly Detected", {
        userId,
        countInWindow,
        totalInWindow,
        context,
      });

      eventBus.publish(`security:alerts`, {
        id: `fraud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: "SECURITY_ALERT" as any,
        channel: "security:alerts",
        timestamp: Date.now(),
        payload: signal,
      });
    }
  }

  public static getRiskSignals(): FraudRiskSignal[] {
    return [...fraudRiskLog];
  }

  public static _reset(): void {
    this.processedCount = 0;
    this.detectedRiskCount = 0;
    userVelocityWindows.clear();
    fraudRiskLog.length = 0;
  }
}
