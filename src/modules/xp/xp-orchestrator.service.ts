// ============================================================================
// AUTHORITATIVE XP & PROGRESSION ORCHESTRATOR
// Master coordinator for the entire Backend-Driven XP Architecture
// ============================================================================

import {
  ProcessViewingHeartbeatResult,
  ViewingHeartbeatPayload,
  XpSourceEventType,
} from "./types";
import { ViewingEventService } from "./viewing-event.service";
import { ProgressionEngineService } from "./progression-engine.service";
import { XpLedgerService } from "./xp-ledger.service";
import { eventBus } from "../realtime/event-bus";
import { prisma } from "@/lib/db";
import { calculateProgressionFromXp } from "../relationship/tier-definitions";

export class XpOrchestratorService {
  /**
   * 1. PROCESS VIEWING HEARTBEAT (THE COMPLETE 7-STEP PROGRESSION PIPELINE)
   * 
   * Flow:
   * 1. User watches live stream -> client sends heartbeat telemetry.
   * 2. Backend records viewing event (validates stream live status, playback state, interval limits).
   * 3. Progression system evaluates whether that event generates XP (streak, subscriber multiplier, daily cap).
   * 4. XP ledger records immutable entry & idempotency check.
   * 5. Relationship balance changes atomically.
   * 6. If threshold is crossed -> Level & Tier change.
   * 7. Backend generates authoritative LEVEL_UP and XP_AWARDED real-time events.
   */
  public static async processViewingHeartbeat(
    payload: ViewingHeartbeatPayload
  ): Promise<ProcessViewingHeartbeatResult> {
    const { fanId, creatorProfileId, viewingSessionId, idempotencyKey } = payload;

    // STEP 1 & 2: Backend Records & Validates Viewing Event
    const viewingEvent = await ViewingEventService.recordViewingEvent(payload);

    if (!viewingEvent.qualifiesForXp) {
      return {
        success: false,
        message: viewingEvent.disqualificationReason || "Viewing event disqualified from XP generation",
        viewingEvent,
        progression: {
          qualifies: false,
          reason: viewingEvent.disqualificationReason || "Disqualified",
          baseXp: 0,
          qualifyingMinutes: 0,
          multipliers: {
            streakMultiplier: 1.0,
            subscriptionMultiplier: 1.0,
            creatorLoyaltyMultiplier: 1.0,
            specialEventMultiplier: 1.0,
          },
          totalMultiplier: 1.0,
          calculatedXp: 0,
          isDailyCapReached: false,
          dailyCapRemainingXp: 0,
        },
      };
    }

    // Check if enough watch seconds have accumulated into a qualifying minute
    const qualifyingMinutes = ViewingEventService.consumeQualifyingMinutes(viewingSessionId);

    // If less than qualifying interval (e.g. 30s of a 60s window), acknowledge telemetry without awarding XP yet
    if (qualifyingMinutes <= 0) {
      return {
        success: true,
        message: `Watch telemetry recorded (${viewingEvent.intervalSeconds}s). Accumulating towards next qualifying minute.`,
        viewingEvent,
        progression: {
          qualifies: false,
          reason: "Accumulating watch time towards next qualifying interval",
          baseXp: 0,
          qualifyingMinutes: 0,
          multipliers: {
            streakMultiplier: 1.0,
            subscriptionMultiplier: 1.0,
            creatorLoyaltyMultiplier: 1.0,
            specialEventMultiplier: 1.0,
          },
          totalMultiplier: 1.0,
          calculatedXp: 0,
          isDailyCapReached: false,
          dailyCapRemainingXp: ProgressionEngineService.DAILY_WATCH_XP_CAP,
        },
      };
    }

    // STEP 3: Progression System Determines Whether Event Generates XP
    let streakDays = 1;
    let isSubscriber = false;
    let relationshipTier: any = "NEW_FAN";

    try {
      const [rel, sub] = await Promise.all([
        prisma.creatorRelationship.findUnique({
          where: {
            fanId_creatorProfileId: {
              fanId,
              creatorProfileId,
            },
          },
        }),
        prisma.subscription.findUnique({
          where: {
            fanId_creatorProfileId: {
              fanId,
              creatorProfileId,
            },
          },
        }),
      ]);

      if (rel) {
        streakDays = rel.currentStreakDays;
        const prog = calculateProgressionFromXp(Number(rel.totalXp));
        relationshipTier = prog.tier;
      }
      if (sub && sub.status === "ACTIVE") {
        isSubscriber = true;
      }
    } catch {
      // Best-effort Prisma lookup
    }

    const progression = await ProgressionEngineService.evaluateViewingProgression(
      viewingEvent,
      qualifyingMinutes,
      streakDays,
      isSubscriber,
      relationshipTier
    );

    if (!progression.qualifies || progression.calculatedXp <= 0) {
      return {
        success: true,
        message: progression.reason,
        viewingEvent,
        progression,
      };
    }

    // STEP 4 & 5: XP Ledger Records Amount & Relationship Balance Changes
    const ledgerTx = await XpLedgerService.recordXpTransaction({
      fanId,
      creatorProfileId,
      sourceEventType: "STREAM_WATCH_TIME",
      sourceEventId: viewingEvent.id,
      xpDelta: progression.calculatedXp,
      minutesWatched: qualifyingMinutes,
      idempotencyKey: idempotencyKey || `view_tx_${viewingEvent.id}`,
      calculationDetails: {
        baseXp: progression.baseXp,
        multiplier: progression.totalMultiplier,
        streakDays,
        qualifyingMinutes,
        note: `Awarded ${progression.calculatedXp} XP for ${qualifyingMinutes} qualifying watch minute(s)`,
      },
    });

    const { ledgerEntry, thresholdCheck, levelUpPayload, xpAwardedPayload } = ledgerTx;

    // STEP 6 & 7: Backend Generates Authoritative Real-Time Events
    try {
      // 1. Publish XP_AWARDED event
      eventBus.publish(`room:${creatorProfileId}`, {
        type: "XP_AWARDED",
        payload: xpAwardedPayload,
      });

      // Also publish to user direct channel
      eventBus.publish(`user:${fanId}`, {
        type: "XP_AWARDED",
        payload: xpAwardedPayload,
      });

      // 2. If Level / Tier threshold was crossed, publish authoritative LEVEL_UP event
      if (levelUpPayload) {
        // Broadcast to stream room (for on-screen celebration / chat announcement)
        eventBus.publish(`room:${creatorProfileId}`, {
          type: "LEVEL_UP",
          payload: levelUpPayload,
        });

        // Broadcast to user direct channel
        eventBus.publish(`user:${fanId}`, {
          type: "LEVEL_UP",
          payload: levelUpPayload,
        });
      }
    } catch (err) {
      console.warn("Event bus publish non-blocking failure:", err);
    }

    return {
      success: true,
      message: levelUpPayload
        ? `🎉 Level Up! You reached Level ${levelUpPayload.newLevel} (${levelUpPayload.newTierName}) with +${progression.calculatedXp} XP awarded!`
        : `Earned +${progression.calculatedXp} XP for watching ${qualifyingMinutes} min!`,
      viewingEvent,
      progression,
      ledgerEntry,
      thresholdCheck,
      levelUpPayload,
      xpAwardedPayload,
    };
  }

  /**
   * 2. AWARD ENGAGEMENT XP (Tips, Subscriptions, Paid Messages)
   */
  public static async awardEngagementXp(params: {
    fanId: string;
    creatorProfileId: string;
    eventType: XpSourceEventType;
    sourceEventId: string;
    creditsSpent?: number;
    customXp?: number;
    idempotencyKey?: string;
  }) {
    const { fanId, creatorProfileId, eventType, sourceEventId, creditsSpent = 0, customXp } = params;

    let streakDays = 1;
    try {
      const rel = await prisma.creatorRelationship.findUnique({
        where: {
          fanId_creatorProfileId: { fanId, creatorProfileId },
        },
      });
      if (rel) streakDays = rel.currentStreakDays;
    } catch {}

    const evalResult = ProgressionEngineService.evaluateGenericEventXP(eventType, {
      creditsSpent,
      streakDays,
      customXp,
    });

    const ledgerTx = await XpLedgerService.recordXpTransaction({
      fanId,
      creatorProfileId,
      sourceEventType: eventType,
      sourceEventId,
      xpDelta: evalResult.xpToAward,
      creditsSpent,
      idempotencyKey: params.idempotencyKey,
      calculationDetails: {
        baseXp: evalResult.xpToAward,
        multiplier: evalResult.multiplier,
        streakDays,
        creditsSpent,
        note: evalResult.reason,
      },
    });

    // Broadcast real-time events
    try {
      eventBus.publish(`room:${creatorProfileId}`, {
        type: "XP_AWARDED",
        payload: ledgerTx.xpAwardedPayload,
      });

      if (ledgerTx.levelUpPayload) {
        eventBus.publish(`room:${creatorProfileId}`, {
          type: "LEVEL_UP",
          payload: ledgerTx.levelUpPayload,
        });
        eventBus.publish(`user:${fanId}`, {
          type: "LEVEL_UP",
          payload: ledgerTx.levelUpPayload,
        });
      }
    } catch {}

    return ledgerTx;
  }
}
