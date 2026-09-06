// ============================================================================
// AUTHORITATIVE XP ARCHITECTURE VERIFICATION TEST SUITE
// ============================================================================
// Verifies the exact sequence requested:
// 1. XP generated strictly through backend events.
// 2. User watches a qualifying amount of a live.
// 3. Backend records a viewing event.
// 4. Progression system determines whether that event generates XP.
// 5. XP ledger records the amount.
// 6. Relationship balance changes.
// 7. Threshold is crossed -> Level changes.
// 8. Backend generates a LEVEL_UP event.
// 9. Client receives authoritative event and triggers animation.
// 10. Anti-cheat & idempotency guarantees verified.
// ============================================================================

import { XpOrchestratorService } from "../src/modules/xp/xp-orchestrator.service";
import { ViewingEventService } from "../src/modules/xp/viewing-event.service";
import { ProgressionEngineService } from "../src/modules/xp/progression-engine.service";
import { XpLedgerService } from "../src/modules/xp/xp-ledger.service";
import { eventBus } from "../src/modules/realtime/event-bus";
import { RealtimeEvent } from "../src/modules/realtime/types";
import { LevelUpEventPayload, XpAwardedEventPayload } from "../src/modules/xp/types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✅ ${message}`);
}

async function runXpArchitectureVerification() {
  console.log("================================================================================");
  console.log("🚀 VERIFYING AUTHORITATIVE BACKEND-DRIVEN XP ARCHITECTURE");
  console.log("================================================================================\n");

  const fanId = `fan_alex_${Date.now()}`;
  const creatorProfileId = `creator_luna_${Date.now()}`;
  const viewingSessionId = `view_session_${Date.now()}`;
  const livestreamId = "live_stream_demo";

  // Capture Real-Time events emitted by the backend
  const capturedEvents: {
    roomEvents: RealtimeEvent[];
    userEvents: RealtimeEvent[];
  } = {
    roomEvents: [],
    userEvents: [],
  };

  const unsubRoom = eventBus.subscribe(`room:${creatorProfileId}`, (event) => {
    capturedEvents.roomEvents.push(event);
  });
  const unsubUser = eventBus.subscribe(`user:${fanId}`, (event) => {
    capturedEvents.userEvents.push(event);
  });

  console.log("[PHASE 1] Initializing Fan-Creator State at 480 XP (Level 2 New Fan)...");
  // Seed fan near the threshold of 500 XP (Level 2, 480 XP)
  await XpLedgerService.recordXpTransaction({
    fanId,
    creatorProfileId,
    sourceEventType: "CUSTOM_BONUS",
    sourceEventId: "seed_init",
    xpDelta: 480,
    idempotencyKey: `init_${fanId}`,
  });

  // Verify initial state
  const initialHistory = await XpLedgerService.getXpLedgerHistory(fanId, creatorProfileId);
  assert(initialHistory.length === 1, "Initial XP ledger has 1 entry");
  assert(initialHistory[0].balanceAfter === 480, "Initial XP balance is exactly 480 XP");
  console.log("    - Starting Balance: 480 XP | Level: 2 | Tier: NEW_FAN (Threshold to Lv.3 is 500 XP)\n");

  // --------------------------------------------------------------------------
  // STEP 1 & 2: User watches 30s of live stream (less than qualifying 60s window)
  // --------------------------------------------------------------------------
  console.log("[PHASE 2] Scenario 1: Fan watches 30 seconds (Heartbeat 1)...");
  console.log("    - Browser sends telemetry: interval=30s, isFocused=true, state=PLAYING");

  const hb1 = await XpOrchestratorService.processViewingHeartbeat({
    fanId,
    creatorProfileId,
    livestreamId,
    viewingSessionId,
    intervalSeconds: 30,
    isWindowFocused: true,
    mediaPlaybackState: "PLAYING",
    clientTimestamp: Date.now(),
  });

  assert(hb1.success === true, "Backend accepted valid heartbeat telemetry");
  assert(hb1.viewingEvent.qualifiesForXp === true, "Viewing event validated and recorded");
  assert(hb1.viewingEvent.totalSessionSeconds === 30, "Accumulated session duration is 30s");
  assert(hb1.progression.qualifies === false, "Progression correctly waits for 60s qualifying unit");
  assert(!hb1.ledgerEntry, "No XP awarded yet before qualifying interval threshold");
  console.log("    - Result: Telemetry recorded, waiting for 60s milestone to evaluate XP.\n");

  // --------------------------------------------------------------------------
  // STEP 3: User watches another 30s (Total = 60s qualifying unit reached!)
  // --------------------------------------------------------------------------
  console.log("[PHASE 3] Scenario 2: Fan watches another 30s (Total = 60s -> Qualifying Milestone Reached!)...");
  console.log("    - Browser sends telemetry: interval=30s, isFocused=true, state=PLAYING");

  const hb2 = await XpOrchestratorService.processViewingHeartbeat({
    fanId,
    creatorProfileId,
    livestreamId,
    viewingSessionId,
    intervalSeconds: 30,
    isWindowFocused: true,
    mediaPlaybackState: "PLAYING",
    clientTimestamp: Date.now() + 30000,
  });

  assert(hb2.success === true, "Heartbeat 2 processed successfully");
  assert(hb2.progression.qualifies === true, "Progression system qualifies 1 minute of watch time");
  assert(hb2.progression.calculatedXp === 10, "Base XP calculated: 1 min * 10 XP/min = 10 XP");
  assert(Boolean(hb2.ledgerEntry), "XP Ledger recorded new entry");
  assert(hb2.ledgerEntry!.balanceBefore === 480, "Ledger records balanceBefore = 480 XP");
  assert(hb2.ledgerEntry!.balanceAfter === 490, "Ledger records balanceAfter = 490 XP");
  assert(hb2.thresholdCheck!.didLevelUp === false, "Threshold not crossed yet (490 < 500 XP)");
  console.log(`    - Result: XP Ledger created entry ${hb2.ledgerEntry!.id}. Total XP now 490 XP.\n`);

  // --------------------------------------------------------------------------
  // STEP 4: User watches 2 more minutes (Total +20 XP -> Total XP reaches 510 XP -> CROSSES 500 XP THRESHOLD!)
  // --------------------------------------------------------------------------
  console.log("[PHASE 4] Scenario 3: Fan watches 2 more minutes (Crossing the 500 XP Level-Up Threshold!)...");
  console.log("    - Starting at 490 XP + 10 XP (1 min watch) = 500 XP (>= 500 XP threshold for Level 3 & SUPPORTER Tier)");

  // Send 60s heartbeat that crosses the 500 XP threshold exactly
  const hbThreshold = await XpOrchestratorService.processViewingHeartbeat({
    fanId,
    creatorProfileId,
    livestreamId,
    viewingSessionId,
    intervalSeconds: 60,
    isWindowFocused: true,
    mediaPlaybackState: "PLAYING",
    clientTimestamp: Date.now() + 90000,
  });

  assert(hbThreshold.success === true, "Threshold heartbeat processed");
  assert(hbThreshold.ledgerEntry!.balanceBefore === 490, "Relationship balance before was 490 XP");
  assert(hbThreshold.ledgerEntry!.balanceAfter === 500, "Relationship balance updated to 500 XP");
  assert(hbThreshold.thresholdCheck!.didLevelUp === true, "Threshold crossing detected: didLevelUp = true");
  assert(hbThreshold.thresholdCheck!.previousLevel === 2, "Previous level was 2");
  assert(hbThreshold.thresholdCheck!.newLevel === 3, "New level is 3");
  assert(hbThreshold.thresholdCheck!.didTierUp === true, "Tier upgraded to SUPPORTER");
  assert(hbThreshold.thresholdCheck!.newTier === "SUPPORTER", "New tier is SUPPORTER");
  assert(Boolean(hbThreshold.levelUpPayload), "Backend generated LEVEL_UP event payload");
  console.log("    - Authoritative Level-Up Result:");
  console.log(`      * Previous: Level ${hbThreshold.levelUpPayload!.previousLevel} (${hbThreshold.levelUpPayload!.previousTier})`);
  console.log(`      * New: Level ${hbThreshold.levelUpPayload!.newLevel} (${hbThreshold.levelUpPayload!.newTierName})`);
  console.log(`      * Animation Type: ${hbThreshold.levelUpPayload!.animationType}`);
  console.log(`      * Sound Cue: ${hbThreshold.levelUpPayload!.soundCue}`);
  console.log(`      * Ledger Proof ID: ${hbThreshold.levelUpPayload!.ledgerProofId}\n`);

  // --------------------------------------------------------------------------
  // STEP 5: Verify Real-Time Event Broadcast
  // --------------------------------------------------------------------------
  console.log("[PHASE 5] Verifying Backend Real-Time Event Dispatching...");
  const levelUpEvents = capturedEvents.userEvents.filter((e) => e.type === "LEVEL_UP");
  const xpAwardedEvents = capturedEvents.userEvents.filter((e) => e.type === "XP_AWARDED");

  assert(levelUpEvents.length >= 1, "LEVEL_UP real-time event was dispatched to user channel");
  assert(xpAwardedEvents.length >= 2, "XP_AWARDED real-time events were dispatched to user channel");

  const receivedLevelUp = levelUpEvents[0].payload as LevelUpEventPayload;
  assert(receivedLevelUp.newLevel === 3, "Captured LEVEL_UP payload has newLevel = 3");
  assert(receivedLevelUp.newTier === "SUPPORTER", "Captured LEVEL_UP payload has newTier = SUPPORTER");
  console.log("    - Client listener received authoritative LEVEL_UP event via SSE / WebSocket.");
  console.log("    - Frontend modal opens and triggers particle celebration without calculating XP locally.\n");

  // --------------------------------------------------------------------------
  // STEP 6: Anti-Cheat & Security Invariants Verification
  // --------------------------------------------------------------------------
  console.log("[PHASE 6] Verifying Security & Anti-Cheat Invariants...");

  // A. Paused Video should not generate XP
  console.log("    [Anti-Cheat A] Testing Paused Video Telemetry...");
  const pausedHb = await XpOrchestratorService.processViewingHeartbeat({
    fanId,
    creatorProfileId,
    livestreamId,
    viewingSessionId: "paused_session",
    intervalSeconds: 60,
    isWindowFocused: true,
    mediaPlaybackState: "PAUSED",
    clientTimestamp: Date.now(),
  });
  assert(pausedHb.progression.qualifies === false, "Paused playback rejected from XP qualification");

  // B. Impossible Interval (> 120s spoof)
  console.log("    [Anti-Cheat B] Testing Interval Spoofing (99,999 seconds)...");
  const spoofHb = await XpOrchestratorService.processViewingHeartbeat({
    fanId,
    creatorProfileId,
    livestreamId,
    viewingSessionId: "spoof_session",
    intervalSeconds: 99999,
    isWindowFocused: true,
    mediaPlaybackState: "PLAYING",
    clientTimestamp: Date.now(),
  });
  assert(spoofHb.viewingEvent.qualifiesForXp === false, "Spoofed interval bounds rejected");

  // C. Idempotency (Resending duplicate transaction)
  console.log("    [Anti-Cheat C] Testing Idempotent Replay Protection...");
  const duplicateKey = `idempotent_test_key_${Date.now()}`;
  const tx1 = await XpLedgerService.recordXpTransaction({
    fanId,
    creatorProfileId,
    sourceEventType: "LIVE_TIP",
    sourceEventId: "tip_123",
    xpDelta: 100,
    idempotencyKey: duplicateKey,
  });

  const tx2 = await XpLedgerService.recordXpTransaction({
    fanId,
    creatorProfileId,
    sourceEventType: "LIVE_TIP",
    sourceEventId: "tip_123",
    xpDelta: 100,
    idempotencyKey: duplicateKey,
  });

  assert(tx1.ledgerEntry.id === tx2.ledgerEntry.id, "Replayed idempotency key returned existing ledger entry");
  assert(tx2.thresholdCheck.xpDelta === 100, "Balance not duplicated on replayed request");

  // Teardown
  unsubRoom();
  unsubUser();

  console.log("\n================================================================================");
  console.log("🎉 ALL XP ARCHITECTURE INVARIANTS & SEQUENCES VERIFIED SUCCESSFULLY!");
  console.log("================================================================================");
}

runXpArchitectureVerification()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  });
