import { NextRequest } from "next/server";
import {
  AppVersionPolicy,
  ClientPlatform,
  MobileDeviceContext,
} from "./types";

const MINIMUM_SUPPORTED_APP_VERSION = process.env.MIN_MOBILE_APP_VERSION || "1.0.0";
const LATEST_APP_VERSION = process.env.LATEST_MOBILE_APP_VERSION || "1.0.0";

export class MobileContextService {
  /**
   * Extracts strongly-typed device and client platform metadata from HTTP request headers.
   * Works across Web, iOS native (Swift URLSession), and Android native (OkHttp/Retrofit).
   */
  static extractContext(req: NextRequest | Request): MobileDeviceContext {
    const headers = req.headers;

    // Platform extraction: Check explicit custom header first, fallback to user agent heuristic
    const rawPlatform = headers.get("x-client-platform")?.toLowerCase();
    const userAgent = headers.get("user-agent") || "";
    const platform = this.resolvePlatform(rawPlatform, userAgent);

    // App version & build number
    const appVersion = headers.get("x-client-version") || headers.get("x-app-version") || "1.0.0";
    const rawBuild = headers.get("x-app-build") || headers.get("x-client-build") || "1";
    const buildNumber = parseInt(rawBuild, 10) || 1;

    // Hardware / Device identifier
    const deviceId =
      headers.get("x-device-id") ||
      headers.get("x-client-id") ||
      `anon_device_${Date.now()}`;

    const deviceModel = headers.get("x-device-model") || undefined;
    const osVersion = headers.get("x-os-version") || undefined;
    const locale = headers.get("accept-language")?.split(",")[0] || "en-US";

    // Idempotency key from client header (crucial for mobile flaky network retries)
    const idempotencyKey =
      headers.get("x-idempotency-key") ||
      headers.get("idempotency-key") ||
      undefined;

    // Push notification token if attached in handshake/auth
    const pushToken = headers.get("x-push-token") || undefined;
    const rawPushProvider = headers.get("x-push-provider")?.toUpperCase();
    const pushProvider: "APNS" | "FCM" | undefined =
      rawPushProvider === "APNS" || rawPushProvider === "FCM"
        ? (rawPushProvider as "APNS" | "FCM")
        : platform === "ios"
        ? "APNS"
        : platform === "android"
        ? "FCM"
        : undefined;

    // Extract real client IP
    const forwardedFor = headers.get("x-forwarded-for");
    const ipAddress = forwardedFor ? forwardedFor.split(",")[0].trim() : headers.get("x-real-ip") || undefined;

    return {
      platform,
      appVersion,
      buildNumber,
      deviceId,
      deviceModel,
      osVersion,
      locale,
      ipAddress,
      userAgent,
      idempotencyKey,
      pushToken,
      pushProvider,
    };
  }

  /**
   * Evaluates if the connecting mobile client satisfies minimum version requirements.
   */
  static checkVersionPolicy(clientVersion: string, platform: ClientPlatform): AppVersionPolicy {
    const isUpdateRequired = this.compareSemanticVersions(clientVersion, MINIMUM_SUPPORTED_APP_VERSION) < 0;
    const isUpdateRecommended = this.compareSemanticVersions(clientVersion, LATEST_APP_VERSION) < 0;

    return {
      minimumSupportedVersion: MINIMUM_SUPPORTED_APP_VERSION,
      latestVersion: LATEST_APP_VERSION,
      isUpdateRequired,
      isUpdateRecommended,
      upgradeUrl: {
        ios: process.env.APP_STORE_URL || "https://apps.apple.com/app/platform/id000000000",
        android: process.env.PLAY_STORE_URL || "https://play.google.com/store/apps/details?id=com.platform.live",
      },
    };
  }

  /**
   * Helper to resolve client platform.
   */
  private static resolvePlatform(rawPlatform?: string, userAgent: string = ""): ClientPlatform {
    if (rawPlatform === "ios" || rawPlatform === "android" || rawPlatform === "web" || rawPlatform === "desktop") {
      return rawPlatform;
    }

    const ua = userAgent.toLowerCase();
    if (ua.includes("cfnetwork") || ua.includes("darwin") || ua.includes("iphone") || ua.includes("ipad")) {
      return "ios";
    }
    if (ua.includes("okhttp") || ua.includes("android")) {
      return "android";
    }
    if (ua.includes("electron") || ua.includes("tauri")) {
      return "desktop";
    }
    return "web";
  }

  /**
   * Compares two semantic version strings (e.g. "1.2.0" vs "1.1.9").
   * Returns:
   *   -1 if v1 < v2
   *    0 if v1 === v2
   *    1 if v1 > v2
   */
  static compareSemanticVersions(v1: string, v2: string): number {
    const p1 = v1.split(".").map((n) => parseInt(n, 10) || 0);
    const p2 = v2.split(".").map((n) => parseInt(n, 10) || 0);

    const len = Math.max(p1.length, p2.length);
    for (let i = 0; i < len; i++) {
      const num1 = p1[i] || 0;
      const num2 = p2[i] || 0;
      if (num1 < num2) return -1;
      if (num1 > num2) return 1;
    }
    return 0;
  }
}
