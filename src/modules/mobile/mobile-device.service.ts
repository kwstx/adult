import { redis } from "@/lib/redis";
import { ClientPlatform, MobileDeviceContext, MobileDeviceSessionRecord } from "./types";
import { MobileAuthService } from "./mobile-auth.service";

export interface RegisterDeviceInput {
  userId: string;
  deviceId: string;
  platform: ClientPlatform;
  pushToken?: string;
  pushProvider?: "APNS" | "FCM";
  deviceModel?: string;
  osVersion?: string;
  appVersion?: string;
}

export class MobileDeviceService {
  private static registeredTokens: Map<string, { userId: string; pushToken: string; platform: ClientPlatform }> =
    new Map();

  /**
   * Registers or updates a device's push notification token (APNs / FCM).
   */
  static async registerDevice(input: RegisterDeviceInput): Promise<{ registered: boolean; deviceId: string }> {
    const { userId, deviceId, platform, pushToken, pushProvider, deviceModel, osVersion, appVersion } = input;

    const sessionId = `sess_${userId}_${deviceId}`;
    const session = await MobileAuthService.findSession(sessionId);

    if (session) {
      if (pushToken) session.pushToken = pushToken;
      if (pushProvider) session.pushProvider = pushProvider;
      if (deviceModel) session.deviceModel = deviceModel;
      if (osVersion) session.osVersion = osVersion;
      if (appVersion) session.appVersion = appVersion;
      session.lastActiveAt = new Date();
      await MobileAuthService.persistSession(session);
    }

    if (pushToken) {
      const tokenKey = `mob:push:${userId}:${deviceId}`;
      if (redis && redis.status === "ready") {
        try {
          await redis.set(
            tokenKey,
            JSON.stringify({ userId, deviceId, platform, pushToken, pushProvider }),
            "EX",
            90 * 24 * 60 * 60
          );
          await redis.sadd(`mob:user_devices:${userId}`, deviceId);
        } catch {}
      }
      this.registeredTokens.set(`${userId}:${deviceId}`, { userId, pushToken, platform });
    }

    return { registered: true, deviceId };
  }

  /**
   * Retrieves all active push tokens for a user (e.g. for multi-device fanout).
   */
  static async getUserPushTokens(
    userId: string
  ): Promise<Array<{ deviceId: string; platform: ClientPlatform; pushToken: string; pushProvider?: "APNS" | "FCM" }>> {
    const result: Array<{
      deviceId: string;
      platform: ClientPlatform;
      pushToken: string;
      pushProvider?: "APNS" | "FCM";
    }> = [];

    if (redis && redis.status === "ready") {
      try {
        const deviceIds = await redis.smembers(`mob:user_devices:${userId}`);
        for (const devId of deviceIds) {
          const raw = await redis.get(`mob:push:${userId}:${devId}`);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.pushToken) {
              result.push(parsed);
            }
          }
        }
        if (result.length > 0) return result;
      } catch {}
    }

    for (const [key, val] of this.registeredTokens.entries()) {
      if (key.startsWith(`${userId}:`)) {
        const deviceId = key.split(":")[1];
        result.push({
          deviceId,
          platform: val.platform,
          pushToken: val.pushToken,
          pushProvider: val.platform === "ios" ? "APNS" : "FCM",
        });
      }
    }

    return result;
  }

  /**
   * Revokes a registered mobile device.
   */
  static async revokeDevice(userId: string, deviceId: string): Promise<{ revoked: boolean }> {
    const sessionId = `sess_${userId}_${deviceId}`;
    await MobileAuthService.revokeSession(sessionId);

    if (redis && redis.status === "ready") {
      try {
        await redis.del(`mob:push:${userId}:${deviceId}`);
        await redis.srem(`mob:user_devices:${userId}`, deviceId);
      } catch {}
    }

    this.registeredTokens.delete(`${userId}:${deviceId}`);
    return { revoked: true };
  }
}
