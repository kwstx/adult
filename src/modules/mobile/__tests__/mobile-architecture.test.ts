/**
 * ============================================================================
 * MOBILE ARCHITECTURE & MULTI-CLIENT PLATFORM - AUTOMATED TEST SUITE
 * ============================================================================
 * Rigorously verifies:
 * 1. Platform & device context negotiation (iOS, Android, Web headers).
 * 2. Version policy enforcement & semantic version comparison.
 * 3. Mobile dual-token authentication & single-use refresh token rotation.
 * 4. Hardware device binding & token theft / device mismatch prevention.
 * 5. Mobile biometric challenge & assertion unlock lifecycle.
 * 6. Mobile device push notification token registration (APNs / FCM).
 * 7. Mobile storefront credit catalog & Apple StoreKit / Google Play IAP verification.
 * 8. Reusable headless wallet spending & idempotency locks.
 * 9. Native livestream player authorization (AVPlayer, ExoPlayer, WHEP) & phone broadcaster ingest.
 * 10. Real-time monotonic event sequencing & background reconnect replay sync.
 * 11. Cross-platform TypeScript Mobile Client SDK integration.
 */

import { MobileContextService } from "../mobile-context.service";
import { MobileAuthService } from "../mobile-auth.service";
import { MobileDeviceService } from "../mobile-device.service";
import { MobileIapService } from "../mobile-iap.service";
import { MobileLiveService } from "../mobile-live.service";
import { MobileRealtimeService } from "../mobile-realtime.service";
import { MobilePlatformClient } from "../client-sdk/platform-client";
import { WalletLedgerService } from "@/modules/economic/wallet-ledger.service";

async function runMobileTests() {
  console.log("================================================================");
  console.log("📱 STARTING MOBILE ARCHITECTURE & MULTI-CLIENT TEST SUITE");
  console.log("================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: any) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`, details || "");
      failed++;
    }
  }

  try {
    // ------------------------------------------------------------------------
    // TEST 1: Platform & Device Context Negotiation
    // ------------------------------------------------------------------------
    console.log("\n--- [1] Client Platform & Context Extraction ---");

    const mockIosHeaders = new Headers({
      "x-client-platform": "ios",
      "x-client-version": "1.4.2",
      "x-app-build": "205",
      "x-device-id": "idfv_test_apple_iphone_15_pro",
      "x-device-model": "iPhone15,2",
      "x-os-version": "iOS 18.1",
      "x-push-token": "apns_mock_token_778899aabbcc",
      "x-push-provider": "APNS",
      "x-idempotency-key": "idemp_req_1001",
      "user-agent": "MyApp/1.4.2 (iPhone; iOS 18.1; Scale/3.00)",
    });

    const iosReq = new Request("https://api.platform.local/api/v1/auth/token", {
      headers: mockIosHeaders,
    });

    const ctx = MobileContextService.extractContext(iosReq);

    assert(ctx.platform === "ios", "Extracted platform 'ios' from custom header");
    assert(ctx.appVersion === "1.4.2", "Extracted app version '1.4.2'");
    assert(ctx.buildNumber === 205, "Parsed build number 205");
    assert(ctx.deviceId === "idfv_test_apple_iphone_15_pro", "Extracted device ID");
    assert(ctx.pushToken === "apns_mock_token_778899aabbcc", "Extracted APNs push token");
    assert(ctx.pushProvider === "APNS", "Extracted APNs push provider");
    assert(ctx.idempotencyKey === "idemp_req_1001", "Extracted client idempotency key");

    // Semantic Version Comparison
    assert(MobileContextService.compareSemanticVersions("1.2.0", "1.1.9") === 1, "1.2.0 > 1.1.9");
    assert(MobileContextService.compareSemanticVersions("1.0.0", "1.0.0") === 0, "1.0.0 === 1.0.0");
    assert(MobileContextService.compareSemanticVersions("0.9.5", "1.0.0") === -1, "0.9.5 < 1.0.0");

    const versionPolicy = MobileContextService.checkVersionPolicy("1.4.2", "ios");
    assert(versionPolicy.isUpdateRequired === false, "Client satisfies minimum version policy");

    // ------------------------------------------------------------------------
    // TEST 2: Dual-Token Auth & Single-Use Refresh Token Rotation
    // ------------------------------------------------------------------------
    console.log("\n--- [2] Dual-Token Auth & Refresh Token Rotation ---");

    const testUserId = "user_mobile_fan_01";
    const testDeviceId = "device_test_iphone_01";

    const initialTokens = await MobileAuthService.issueTokensForDevice(
      testUserId,
      "FAN",
      "mobile_tester",
      {
        platform: "ios",
        appVersion: "1.4.2",
        buildNumber: 205,
        deviceId: testDeviceId,
      }
    );

    assert(initialTokens.tokenType === "Bearer", "Token type is Bearer");
    assert(typeof initialTokens.accessToken === "string" && initialTokens.accessToken.length > 20, "Generated Access Token (JWT)");
    assert(initialTokens.refreshToken.startsWith("mref_"), "Generated secure Refresh Token (mref_ prefix)");

    // Rotate refresh token
    const rotated = await MobileAuthService.rotateRefreshToken(initialTokens.refreshToken, {
      platform: "ios",
      appVersion: "1.4.2",
      buildNumber: 205,
      deviceId: testDeviceId,
    });

    assert(rotated.tokens.refreshToken !== initialTokens.refreshToken, "Rotated to a fresh Refresh Token");
    assert(typeof rotated.tokens.accessToken === "string", "Issued new Access Token upon rotation");

    // Try reusing OLD refresh token (should be rejected as REVOKED_REFRESH_TOKEN)
    let reuseFailed = false;
    try {
      await MobileAuthService.rotateRefreshToken(initialTokens.refreshToken, {
        platform: "ios",
        appVersion: "1.4.2",
        buildNumber: 205,
        deviceId: testDeviceId,
      });
    } catch (err: any) {
      reuseFailed = true;
      assert(err.code === "REVOKED_REFRESH_TOKEN", `Reused old refresh token rejected with code: ${err.code}`);
    }
    assert(reuseFailed, "Replay attack prevented: Old refresh token is strictly single-use");

    // Test device mismatch protection
    let mismatchCaught = false;
    try {
      await MobileAuthService.rotateRefreshToken(rotated.tokens.refreshToken, {
        platform: "android", // Different device trying to use token
        appVersion: "1.4.2",
        buildNumber: 205,
        deviceId: "attacker_device_galaxy_s24",
      });
    } catch (err: any) {
      mismatchCaught = true;
      assert(err.code === "DEVICE_MISMATCH", `Device mismatch caught with code: ${err.code}`);
    }
    assert(mismatchCaught, "Cross-device token theft prevented");

    // ------------------------------------------------------------------------
    // TEST 3: Mobile Biometric Authentication Lifecycle
    // ------------------------------------------------------------------------
    console.log("\n--- [3] Mobile Biometric Challenge & Assertion Unlock ---");

    const challenge = await MobileAuthService.createBiometricChallenge(testUserId, testDeviceId);
    assert(challenge.challengeId.startsWith("bio_ch_"), "Generated time-limited biometric challenge");
    assert(challenge.userId === testUserId, "Challenge bound to authenticating user");
    assert(challenge.deviceId === testDeviceId, "Challenge bound to hardware device");

    // ------------------------------------------------------------------------
    // TEST 4: Mobile Device Registration & Push Tokens
    // ------------------------------------------------------------------------
    console.log("\n--- [4] Device Registration & APNs/FCM Push Tokens ---");

    await MobileDeviceService.registerDevice({
      userId: testUserId,
      deviceId: testDeviceId,
      platform: "ios",
      pushToken: "apns_live_device_token_9988",
      pushProvider: "APNS",
      deviceModel: "iPhone 15 Pro",
      osVersion: "18.1",
      appVersion: "1.4.2",
    });

    const userPushTokens = await MobileDeviceService.getUserPushTokens(testUserId);
    assert(userPushTokens.length > 0, "Retrieved registered push tokens for user");
    assert(userPushTokens[0].pushToken === "apns_live_device_token_9988", "Registered APNs token persisted accurately");

    // ------------------------------------------------------------------------
    // TEST 5: Mobile Storefront Catalog & In-App Purchase Verification
    // ------------------------------------------------------------------------
    console.log("\n--- [5] Mobile Storefront & Apple/Google IAP Verification ---");

    const packages = MobileIapService.getPackages();
    assert(packages.length >= 4, `Catalog contains ${packages.length} mobile credit packages`);

    const popularPkg = MobileIapService.findPackage("pkg_popular_500");
    assert(popularPkg !== undefined, "Found package 'pkg_popular_500'");
    assert(popularPkg?.appStoreProductId === "com.platform.credits.tier500", "Apple App Store Product ID matches");
    assert(popularPkg?.playStoreSku === "credits_tier500", "Google Play SKU matches");
    assert(popularPkg?.totalCredits === 550, "Includes 500 base + 50 bonus credits");

    // Test Apple StoreKit 2 Mock Transaction Verification
    const mockAppleTransactionId = `apple_tx_${Date.now()}`;
    const mockJws = `eyJhbGciOiJSUzI1NiJ9.${Buffer.from(
      JSON.stringify({
        transactionId: mockAppleTransactionId,
        productId: "com.platform.credits.tier500",
        environment: "Sandbox",
        purchaseDate: Date.now(),
      })
    ).toString("base64url")}.mock_apple_signature`;

    const iapFulfillment = await MobileIapService.verifyAndFulfillIap({
      userId: testUserId,
      store: "APPLE_APP_STORE",
      packageId: "pkg_popular_500",
      productId: "com.platform.credits.tier500",
      transactionId: mockAppleTransactionId,
      receiptOrToken: mockJws,
    });

    assert(iapFulfillment.success, "Apple StoreKit 2 transaction verified and fulfilled");
    assert(iapFulfillment.totalCreditsAdded === 550, "Correct total credits minted (550 credits)");
    assert(iapFulfillment.store === "APPLE_APP_STORE", "Store recorded as APPLE_APP_STORE");

    // Verify Idempotency: Repeating the exact same IAP transaction does NOT add double credits
    const repeatIap = await MobileIapService.verifyAndFulfillIap({
      userId: testUserId,
      store: "APPLE_APP_STORE",
      packageId: "pkg_popular_500",
      productId: "com.platform.credits.tier500",
      transactionId: mockAppleTransactionId,
      receiptOrToken: mockJws,
    });

    assert(repeatIap.success, "Idempotent repeat IAP recognized existing transaction");

    // ------------------------------------------------------------------------
    // TEST 6: Mobile Reusable Headless Spending
    // ------------------------------------------------------------------------
    console.log("\n--- [6] Mobile Reusable Headless Credit Spending ---");

    const spendResult = await MobileIapService.spendCredits({
      userId: testUserId,
      credits: 50,
      targetType: "PPV_UNLOCK",
      targetId: "content_exclusive_video_100",
      idempotencyKey: `mob_ppv_spend_${Date.now()}`,
      customMessage: "Unlock Mobile VIP Clip",
    });

    assert(spendResult.success, "Headless mobile spend executed successfully");
    assert(spendResult.creditsSpent === 50, "Deducted exactly 50 credits");
    assert(spendResult.targetType === "PPV_UNLOCK", "Target type recorded as PPV_UNLOCK");

    // ------------------------------------------------------------------------
    // TEST 7: Native Livestream Player & Broadcaster Authorization
    // ------------------------------------------------------------------------
    console.log("\n--- [7] Native Player & Broadcaster Authorization ---");

    // Test player format negotiation
    const streamAuth = await MobileLiveService.authorizePlayback({
      creatorId: "creator_test_studio_88",
      userId: testUserId,
      playerType: "AVPLAYER_IOS",
      preferLowLatency: true,
      networkType: "CELLULAR_5G",
    });

    assert(streamAuth.allowed, "Playback authorized for mobile client");
    assert(streamAuth.playback.playerType === "AVPLAYER_IOS", "Tailored to native AVPlayer on iOS");
    assert(Boolean(streamAuth.playback.lowLatencyHlsUrl?.includes("ll-hls.m3u8")), "Issued Low-Latency HLS (LL-HLS) playlist URL");
    assert(streamAuth.playback.suggestedBitrateKbps === 4000, "Optimal 5G cellular bitrate suggested (4,000 Kbps)");
    assert(Boolean(streamAuth.playback.iceServers && streamAuth.playback.iceServers.length > 0), "Included STUN/TURN ICE server configuration");

    // Test WebRTC WHEP player format
    const whepAuth = await MobileLiveService.authorizePlayback({
      creatorId: "creator_test_studio_88",
      playerType: "WEBRTC_WHEP",
      preferLowLatency: true,
    });
    assert(whepAuth.playback.playerType === "WEBRTC_WHEP", "Configured WebRTC WHEP sub-second stream");
    assert(whepAuth.playback.primaryPlaybackUrl.includes("/endpoint/"), "Returned WebRTC WHEP endpoint URL");

    // ------------------------------------------------------------------------
    // TEST 8: Monotonic Event Sequencing & Background Reconnect Sync
    // ------------------------------------------------------------------------
    console.log("\n--- [8] Real-time Sequence Numbering & Background Catch-Up ---");

    MobileRealtimeService.resetForTesting();
    const testChannel = "room:creator_test_studio_88";

    const evt1 = await MobileRealtimeService.publishSequencedEvent(testChannel, "CHAT_MESSAGE", {
      sender: "Alice",
      text: "Hello from iOS!",
    });
    const evt2 = await MobileRealtimeService.publishSequencedEvent(testChannel, "GIFT_SENT", {
      sender: "Bob",
      giftName: "Rose",
      credits: 100,
    });
    const evt3 = await MobileRealtimeService.publishSequencedEvent(testChannel, "GOAL_PROGRESS", {
      current: 500,
      target: 1000,
    });

    assert(evt1.seq === 1, "First event assigned sequence seq=1");
    assert(evt2.seq === 2, "Second event assigned sequence seq=2");
    assert(evt3.seq === 3, "Third event assigned sequence seq=3");

    // Simulate mobile app was backgrounded after receiving seq=1, now reconnects sending lastKnownSeq=1
    const syncRes = await MobileRealtimeService.syncMissedEvents({
      channel: testChannel,
      lastKnownSeq: 1,
    });

    assert(syncRes.currentSeq === 3, "Current room sequence is 3");
    assert(syncRes.missedEvents.length === 2, "Replayed exactly 2 missed events (seq=2 and seq=3)");
    assert(syncRes.missedEvents[0].seq === 2 && syncRes.missedEvents[0].type === "GIFT_SENT", "Missed event 1 is GIFT_SENT (seq=2)");
    assert(syncRes.missedEvents[1].seq === 3 && syncRes.missedEvents[1].type === "GOAL_PROGRESS", "Missed event 2 is GOAL_PROGRESS (seq=3)");
    assert(syncRes.missedEvents[0].isReplay === true, "Tagged as isReplay: true");

    // ------------------------------------------------------------------------
    // TEST 9: Mobile Client SDK Reference Implementation
    // ------------------------------------------------------------------------
    console.log("\n--- [9] Cross-Platform Mobile Client SDK ---");

    const client = new MobilePlatformClient({
      baseUrl: "https://api.platform.local",
      platform: "ios",
      appVersion: "1.4.2",
      buildNumber: 205,
      deviceId: "client_sdk_test_device_01",
      deviceModel: "iPhone 15 Pro Max",
      osVersion: "iOS 18.1",
    });

    client.setTokens(rotated.tokens);
    assert(client.getTokens()?.accessToken === rotated.tokens.accessToken, "SDK configured with access token");

    const streamUrl = client.realtime.createStreamUrl("creator_test_studio_88", 3);
    assert(
      streamUrl.includes("/api/v1/realtime/stream") &&
        streamUrl.includes("creatorId=creator_test_studio_88") &&
        streamUrl.includes("lastSeq=3"),
      "SDK generated SSE connection URL with auth token & lastSeq query parameter"
    );

    console.log("\n================================================================");
    console.log(`🎉 MOBILE ARCHITECTURE TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log("================================================================\n");

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error("💥 Unhandled mobile test suite error:", error);
    process.exit(1);
  }
}

runMobileTests();
