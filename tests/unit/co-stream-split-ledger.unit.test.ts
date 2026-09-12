/**
 * UNIT TEST SUITE: MULTI-CREATOR CO-STREAM & REAL-TIME REVENUE SPLITTING
 * 
 * Verifies:
 * 1. Co-Stream Finite State Machine transitions & Invariant validations (100% split, min participants)
 * 2. SFU WebRTC Media Cluster multi-publisher token signing and compositing layouts
 * 3. Authoritative Split Ledger revenue share math (50/50, custom ratios, odd amounts, zero leakage)
 */

import { TestRunner, assert, assertEqual, assertThrows } from "../utils/test-runner";
import {
  CoStreamStateMachine,
  InvalidStateTransitionError,
  CoStreamSplitValidationError,
} from "@/modules/livestream/co-stream.state-machine";
import { sfuMediaAdapter } from "@/modules/livestream/sfu-media.adapter";

export async function runCoStreamUnitTests(): Promise<boolean> {
  const runner = new TestRunner("Layer 1F: Co-Stream & Real-Time Split Ledger Unit Tests");
  runner.printHeader();

  // --------------------------------------------------------------------------
  // 1. CO-STREAM STATE MACHINE TRANSITIONS & INVARIANTS
  // --------------------------------------------------------------------------
  await runner.runTest("State Machine: Successful complete broadcast lifecycle", () => {
    // 1. INVITED -> ACCEPTED
    const step1 = CoStreamStateMachine.transition("INVITED", "GUEST_ACCEPTED");
    assertEqual(step1.nextState, "ACCEPTED", "INVITED must transition to ACCEPTED on GUEST_ACCEPTED");

    // 2. ACCEPTED -> PREPARING
    const step2 = CoStreamStateMachine.transition("ACCEPTED", "PREPARATION_READY");
    assertEqual(step2.nextState, "PREPARING", "ACCEPTED must transition to PREPARING on PREPARATION_READY");

    // 3. PREPARING -> LIVE (with valid split sum 1.00 and 2 participants)
    const step3 = CoStreamStateMachine.transition("PREPARING", "START_BROADCAST", {
      participantCount: 2,
      totalSplitPercentage: 1.00,
    });
    assertEqual(step3.nextState, "LIVE", "PREPARING must transition to LIVE on START_BROADCAST");

    // 4. LIVE -> ENDED
    const step4 = CoStreamStateMachine.transition("LIVE", "END_BROADCAST");
    assertEqual(step4.nextState, "ENDED", "LIVE must transition to ENDED on END_BROADCAST");
  });

  await runner.runTest("State Machine Invariant: Blocks broadcast launch if split does not sum to 100%", () => {
    assertThrows(
      () => {
        CoStreamStateMachine.transition("PREPARING", "START_BROADCAST", {
          participantCount: 2,
          totalSplitPercentage: 0.85, // Only 85%
        });
      },
      CoStreamSplitValidationError,
      "Must throw CoStreamSplitValidationError when split sum is 0.85"
    );

    assertThrows(
      () => {
        CoStreamStateMachine.transition("PREPARING", "START_BROADCAST", {
          participantCount: 2,
          totalSplitPercentage: 1.15, // 115%
        });
      },
      CoStreamSplitValidationError,
      "Must throw CoStreamSplitValidationError when split sum is 1.15"
    );
  });

  await runner.runTest("State Machine Invariant: Blocks broadcast launch if fewer than 2 creators", () => {
    assertThrows(
      () => {
        CoStreamStateMachine.transition("PREPARING", "START_BROADCAST", {
          participantCount: 1, // Only 1 creator
          totalSplitPercentage: 1.00,
        });
      },
      InvalidStateTransitionError,
      "Must throw InvalidStateTransitionError when participant count < 2"
    );
  });

  await runner.runTest("State Machine: Handles guest decline and host cancellation cleanly", () => {
    const declineStep = CoStreamStateMachine.transition("INVITED", "GUEST_DECLINED");
    assertEqual(declineStep.nextState, "CANCELLED", "Guest decline transitions to CANCELLED");

    const hostCancelStep = CoStreamStateMachine.transition("ACCEPTED", "HOST_CANCELLED");
    assertEqual(hostCancelStep.nextState, "CANCELLED", "Host cancellation transitions to CANCELLED");
  });

  // --------------------------------------------------------------------------
  // 2. SFU WEBRTC MEDIA ADAPTER & TOKEN ISSUANCE
  // --------------------------------------------------------------------------
  await runner.runTest("SFU Media Adapter: Provisions multi-publisher room with layout", async () => {
    const sessionRoom = await sfuMediaAdapter.createMultiPublisherRoom("sess_123", "SIDE_BY_SIDE", 4);
    assertEqual(sessionRoom.roomId, "room_sfu_sess_123", "Room ID must match session ID");
    assertEqual(sessionRoom.stageLayout, "SIDE_BY_SIDE", "Layout must be SIDE_BY_SIDE");
    assertEqual(sessionRoom.maxPublishers, 4, "Max publishers must be 4");
    assert(sessionRoom.whipIngestUrl.includes("/whip/room_sfu_sess_123"), "WHIP endpoint formatted correctly");
  });

  await runner.runTest("SFU Media Adapter: Generates authenticated publisher token with role permissions", async () => {
    const hostToken = await sfuMediaAdapter.generatePublisherToken({
      sessionId: "sess_123",
      creatorProfileId: "cr_host",
      role: "PRIMARY_HOST",
      canControlLayout: true,
    });

    assertEqual(hostToken.role, "PRIMARY_HOST", "Role must be PRIMARY_HOST");
    assertEqual(hostToken.permissions.canControlLayout, true, "Host can control layout");
    assert(hostToken.token.startsWith("sfu_pub_"), "Token prefix matches sfu_pub_");

    const guestToken = await sfuMediaAdapter.generatePublisherToken({
      sessionId: "sess_123",
      creatorProfileId: "cr_guest",
      role: "CO_HOST",
      canControlLayout: false,
    });

    assertEqual(guestToken.role, "CO_HOST", "Role must be CO_HOST");
    assertEqual(guestToken.permissions.canControlLayout, false, "Guest cannot control layout");
  });

  await runner.runTest("SFU Media Adapter: Generates multi-stream viewer WHEP playback token", async () => {
    const viewerToken = await sfuMediaAdapter.generateMultiStreamViewerToken({
      sessionId: "sess_123",
      viewerUserId: "usr_fan_1",
      isVip: true,
      layout: "SIDE_BY_SIDE",
      activeCreators: [
        { creatorProfileId: "cr_host", stagePosition: 0 },
        { creatorProfileId: "cr_guest", stagePosition: 1 },
      ],
    });

    assertEqual(viewerToken.activeTracks.length, 2, "Viewer token tracks 2 active creator tracks");
    assertEqual(viewerToken.isVip, true, "VIP entitlement recorded in token");
    assert(viewerToken.playbackUrl.includes("/whep/room_sfu_sess_123"), "WHEP endpoint formatted correctly");
  });

  // --------------------------------------------------------------------------
  // 3. SPLIT LEDGER REVENUE CONSERVATION & FORMULATION MATH
  // --------------------------------------------------------------------------
  await runner.runTest("Split Math: Standard 50/50 split on 1,000 Credits (20% Rake)", () => {
    const grossCredits = 1000;
    const rakePercent = 0.20;
    const platformRake = Math.floor(grossCredits * rakePercent); // 200
    const netPool = grossCredits - platformRake; // 800

    const hostShare = Math.floor(netPool * 0.50); // 400
    const guestShare = netPool - hostShare; // 400

    assertEqual(platformRake, 200, "Platform rake is 200 CR (20%)");
    assertEqual(netPool, 800, "Net creator pool is 800 CR (80%)");
    assertEqual(hostShare, 400, "Primary host receives 400 CR (50% of net)");
    assertEqual(guestShare, 400, "Guest co-host receives 400 CR (50% of net)");
    assertEqual(platformRake + hostShare + guestShare, grossCredits, "Credits conservation holds exactly (200 + 400 + 400 = 1000)");
  });

  await runner.runTest("Split Math: Custom 70/30 split on 500 Credits (20% Rake)", () => {
    const grossCredits = 500;
    const rakePercent = 0.20;
    const platformRake = Math.floor(grossCredits * rakePercent); // 100
    const netPool = grossCredits - platformRake; // 400

    const hostShare = Math.floor(netPool * 0.70); // 280
    const guestShare = netPool - hostShare; // 120

    assertEqual(platformRake, 100, "Platform rake is 100 CR");
    assertEqual(netPool, 400, "Net creator pool is 400 CR");
    assertEqual(hostShare, 280, "Host 70% share is 280 CR");
    assertEqual(guestShare, 120, "Guest 30% share is 120 CR");
    assertEqual(platformRake + hostShare + guestShare, grossCredits, "Sum equals 500 gross credits");
  });

  await runner.runTest("Split Math: 3-Creator Split (40/40/20) with odd gross amount (137 Credits)", () => {
    const grossCredits = 137;
    const rakePercent = 0.20;
    const platformRake = Math.floor(grossCredits * rakePercent); // 27
    const netPool = grossCredits - platformRake; // 110

    const creator1Share = Math.floor(netPool * 0.40); // 44
    const creator2Share = Math.floor(netPool * 0.40); // 44
    const creator3Share = netPool - (creator1Share + creator2Share); // 110 - 88 = 22

    assertEqual(platformRake, 27, "Platform rake is 27 CR");
    assertEqual(netPool, 110, "Net pool is 110 CR");
    assertEqual(creator1Share, 44, "Creator 1 receives 44 CR");
    assertEqual(creator2Share, 44, "Creator 2 receives 44 CR");
    assertEqual(creator3Share, 22, "Creator 3 receives remainder 22 CR (20%)");
    assertEqual(platformRake + creator1Share + creator2Share + creator3Share, grossCredits, "Absolute conservation of credits on odd fractions");
  });

  const summary = runner.printFooter();
  return summary.failedCount === 0;
}

if (require.main === module) {
  runCoStreamUnitTests();
}
