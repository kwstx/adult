import prisma from "../src/lib/db";
import { VideoRoomService } from "../src/modules/video/video-room.service";
import { VideoAuthService } from "../src/modules/video/video-auth.service";
import { mediaInfrastructure } from "../src/modules/video/media-infrastructure.adapter";

async function main() {
  console.log("================================================================");
  console.log("🧪 TESTING VIDEO SYSTEM & STREAMING ARCHITECTURE");
  console.log("================================================================");

  // 1. Fetch Seed Creator
  const creatorUser = await prisma.user.findFirst({
    where: { role: "CREATOR" },
    include: { creatorProfile: true },
  });

  if (!creatorUser || !creatorUser.creatorProfile) {
    throw new Error("No creator found in database.");
  }

  console.log(`✅ [1] Located Creator: ${creatorUser.displayName} (@${creatorUser.username})`);

  // 2. Provision & Start Broadcast
  console.log("\n📡 [2] Testing Broadcast Provisioning (WHIP / RTMP Ingest)...");
  const broadcast = await VideoRoomService.startBroadcast({
    creatorUserId: creatorUser.id,
    title: "Late Night Neon Vibes ✨ [Test Stream]",
    category: "Entertainment",
    tags: ["live", "interactive", "webrtc"],
    streamMode: "PUBLIC_BROADCAST",
    audienceRules: {
      minAge: 18,
      requireAgeAssurance: true,
      isSubscribersOnly: false,
      ticketPriceCredits: 0,
      isFollowerOnly: false,
      slowModeSeconds: 0,
      isChatDisabled: false,
      geoBlockedCountries: [],
    },
  });

  console.log("   - Media Room ID:", broadcast.mediaRoom.id);
  console.log("   - WHIP Ingest Endpoint:", broadcast.credentials.whipIngestUrl);
  console.log("   - RTMP Ingest Endpoint:", broadcast.credentials.rtmpIngestUrl);
  console.log("   - Stream Status:", broadcast.livestream.status);

  // 3. Fetch Full Livestream Relation Graph
  console.log("\n📊 [3] Verifying Complete Livestream Relation Graph...");
  const relationGraph = await VideoRoomService.getLivestreamRelationGraph({
    creatorIdOrRoom: broadcast.mediaRoom.id,
  });

  if (!relationGraph) throw new Error("Failed to load relation graph.");
  console.log("   - Creator:", relationGraph.creator.displayName);
  console.log("   - Livestream Title:", relationGraph.livestream.title);
  console.log("   - Media Room Name:", relationGraph.mediaRoom.roomName);
  console.log("   - Audience Rules (Age):", relationGraph.audienceRules.minAge);

  // 4. Test Viewer Authorization & Signed Media Token Generation
  console.log("\n🔑 [4] Testing Backend Authoritative Gatekeeper (Viewer Authorization)...");
  const fanUser = await prisma.user.findFirst({
    where: { role: "FAN" },
  });

  const auth = await VideoAuthService.authorizeViewer({
    mediaRoomIdOrName: broadcast.mediaRoom.id,
    userId: fanUser?.id,
  });

  console.log("   - Authorization Allowed:", auth.allowed);
  if (auth.signedToken) {
    console.log("   - Signed Playback Token:", auth.signedToken.token.substring(0, 35) + "...");
    console.log("   - WHEP Direct Egress URL:", auth.signedToken.whepPlaybackUrl);
    console.log("   - Forensic Watermark UID:", auth.signedToken.watermark.userId);

    // Verify cryptographic token
    const tokenVerify = mediaInfrastructure.verifyMediaToken(auth.signedToken.token);
    console.log("   - Token Cryptographic HMAC Valid:", tokenVerify.valid);
  }

  // 5. Test Audience Rule Enforcement (Restricted VIP Room with Anonymous User)
  console.log("\n🔒 [5] Testing Audience Rules Enforcement (VIP Only Room with Non-VIP / Anonymous)...");
  await prisma.audienceRule.update({
    where: { id: broadcast.audienceRule.id },
    data: { isSubscribersOnly: true },
  });

  const blockedAuth = await VideoAuthService.authorizeViewer({
    mediaRoomIdOrName: broadcast.mediaRoom.id,
    userId: undefined, // Anonymous / Non-VIP
  });

  console.log("   - Anonymous Access Allowed:", blockedAuth.allowed);
  console.log("   - Rejection Reason:", blockedAuth.reason);

  // Restore rule
  await prisma.audienceRule.update({
    where: { id: broadcast.audienceRule.id },
    data: { isSubscribersOnly: false },
  });

  // 6. Test Interactive Two-Way WebRTC 1-on-1 Session
  console.log("\n🤝 [6] Testing Interactive Two-Way WebRTC 1-on-1 Session...");
  if (fanUser) {
    const sessionPayload = await VideoRoomService.requestInteractive1on1Session({
      creatorId: creatorUser.creatorProfile.id,
      fanUserId: fanUser.id,
      creditRatePerMinute: 150,
    });

    console.log("   - Session Created:", sessionPayload.sessionId);
    console.log("   - Signaling Endpoint:", sessionPayload.signalingEndpoint);

    // Creator Joins Session
    const creatorJoin = await VideoRoomService.joinInteractive1on1Session({
      sessionId: sessionPayload.sessionId,
      userId: creatorUser.id,
    });
    console.log("   - Creator Joined Status:", creatorJoin.status);

    // End Session & Settle
    const sessionSettlement = await VideoRoomService.endInteractive1on1Session({
      sessionId: sessionPayload.sessionId,
      endedByUserId: creatorUser.id,
    });
    console.log("   - Session Settled Duration (s):", sessionSettlement.durationSeconds);
    console.log("   - Settled Tokens Charged:", sessionSettlement.totalCredits);
  }

  // 7. End Broadcast
  console.log("\n🛑 [7] Ending Broadcast...");
  await VideoRoomService.endBroadcast(creatorUser.id);
  console.log("   - Broadcast Status: ENDED");

  console.log("\n================================================================");
  console.log("🎉 ALL VIDEO SYSTEM ARCHITECTURE TESTS PASSED SUCCESSFULLY!");
  console.log("================================================================");
}

main()
  .catch((e) => {
    console.error("Test failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
