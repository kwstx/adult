import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import {
  Job,
  FraudDetectPayload,
  FraudDetectResult,
  WorkerHandler,
} from "../types";
import { jobDispatcher } from "../core/job-dispatcher";

export const fraudDetectorWorker: WorkerHandler<
  FraudDetectPayload,
  FraudDetectResult
> = async (job: Job<FraudDetectPayload>, updateProgress) => {
  const { userId, triggerEvent, metadata } = job.payload;

  console.log(`[FraudDetectorWorker] 🚨 Analyzing security/fraud trigger ${triggerEvent} for user ${userId}`);
  await updateProgress(15);

  let riskScore = 0.1;
  const flags: string[] = [];

  // 1. Evaluate Trigger Event & Velocity in Redis
  const velocityKey = `fraud:velocity:${userId}`;

  if (triggerEvent === "RAPID_WALLET_DRAIN") {
    riskScore += 0.4;
    flags.push("RAPID_WALLET_DRAIN_THRESHOLD_EXCEEDED");
  } else if (triggerEvent === "CARD_VELOCITY_SPIKE") {
    riskScore += 0.6;
    flags.push("MULTIPLE_PAYMENT_METHODS_RAPID_ATTEMPTS");
  } else if (triggerEvent === "CHARGEBACK_SPIKE") {
    riskScore += 0.8;
    flags.push("PREVIOUS_CHARGEBACK_HISTORY_DETECTED");
  } else if (triggerEvent === "UNDERAGE_CHAT_RISK") {
    riskScore = 1.0;
    flags.push("POTENTIAL_UNDERAGE_OR_SAFETY_KEYWORD_MATCH");
  }

  await updateProgress(50);

  // Check Redis sliding window velocity counter
  try {
    if (redis.status === "ready") {
      const recentAttempts = await redis.incr(velocityKey);
      if (recentAttempts === 1) {
        await redis.expire(velocityKey, 300); // 5 minute window
      }
      if (recentAttempts > 5) {
        riskScore = Math.min(1.0, riskScore + 0.3);
        flags.push(`HIGH_EVENT_FREQUENCY_COUNT_${recentAttempts}`);
      }
    }
  } catch {}

  await updateProgress(70);

  // 2. Automated Action Decision
  let isActionRequired = riskScore >= 0.7;
  let autoActionTaken: FraudDetectResult["autoActionTaken"];
  let moderationCaseId: string | undefined;
  let auditEventId: string | undefined;

  if (riskScore >= 0.85) {
    autoActionTaken = "WALLET_FROZEN";

    // A. Freeze User Wallet in PostgreSQL
    try {
      await prisma.wallet.updateMany({
        where: { userId },
        data: {
          status: "FROZEN_SECURITY",
        },
      });

      // B. Create Critical Moderation Case
      const modCase = await prisma.moderationCase.create({
        data: {
          caseNumber: `FRAUD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          targetUserId: userId,
          priority: triggerEvent === "UNDERAGE_CHAT_RISK" ? "CRITICAL_URGENT_UNDERAGE" : "HIGH",
          status: "OPEN",
          internalNotes: `Automated Fraud & Safety Worker: ${flags.join(", ")}. Risk Score: ${riskScore.toFixed(2)}`,
        },
      });
      moderationCaseId = modCase.id;

      // C. Record Immutable Audit Event
      const auditEvent = await prisma.auditEvent.create({
        data: {
          action: "ACCOUNT_SECURITY_RESTRICTION_APPLIED",
          actorId: userId,
          targetEntityId: userId,
          targetEntityType: "USER",
          metadataJson: JSON.stringify({
            triggerEvent,
            flags,
            riskScore,
            metadata,
          }),
        },
      });
      auditEventId = auditEvent.id;
    } catch (err: any) {
      console.warn("[FraudDetectorWorker] DB security action warning:", err.message);
    }

    // D. Dispatch Security Alert Notification & Email to User
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, displayName: true },
      });

      if (user?.email) {
        await jobDispatcher.dispatchEmail({
          to: user.email,
          toName: user.displayName,
          subject: "Security Notice: Account Action Required",
          template: "SECURITY_ALERT",
          variables: {
            recipientName: user.displayName,
            flags: flags.join(", "),
            riskScore: riskScore.toFixed(2),
          },
        });
      }
    } catch {}
  } else if (riskScore >= 0.6) {
    autoActionTaken = "FLAGGED_FOR_AUDIT";
  }

  await updateProgress(100);
  console.log(
    `[FraudDetectorWorker] ✅ Analysis complete for user ${userId}: risk=${riskScore.toFixed(2)}, action=${autoActionTaken || 'NONE'}`
  );

  return {
    userId,
    riskScore,
    isActionRequired,
    autoActionTaken,
    moderationCaseId,
    auditEventId,
  };
};
