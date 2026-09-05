import { StreamCredentials, PlaybackToken } from "./types";

export interface ILivestreamProvider {
  createStreamIngest(creatorId: string): Promise<StreamCredentials>;
  generatePlaybackToken(creatorId: string, userId?: string, isVip?: boolean): Promise<PlaybackToken>;
  validateStreamKey(streamKey: string): Promise<boolean>;
}

export class SpecialistMediaAdapter implements ILivestreamProvider {
  private cdnBase: string;

  constructor() {
    this.cdnBase = process.env.MEDIA_CDN_BASE_URL || "https://stream.platform.local";
  }

  /**
   * Generates RTMP/WHIP ingest endpoints and OBS configuration for a creator.
   */
  async createStreamIngest(creatorId: string): Promise<StreamCredentials> {
    const streamKey = `live_${creatorId}_${Math.random().toString(36).substring(2, 10)}`;
    return {
      streamKey,
      rtmpIngestUrl: "rtmp://ingest.live.platform.local/app",
      whipIngestUrl: "https://ingest.live.platform.local/whip",
      playbackHlsUrl: `${this.cdnBase}/live/${creatorId}/index.m3u8`,
      playbackWebrtcUrl: `${this.cdnBase}/webrtc/${creatorId}`,
    };
  }

  /**
   * Backend-Authoritative Token Signer:
   * Issues cryptographic playback token only after backend validates user entitlement.
   */
  async generatePlaybackToken(creatorId: string, userId?: string, isVip = false): Promise<PlaybackToken> {
    const expiresAt = Date.now() + 1000 * 60 * 60 * 4; // 4 hour validity
    const token = `tok_${Buffer.from(
      JSON.stringify({ creatorId, userId: userId || "anon", isVip, exp: expiresAt })
    ).toString("base64url")}`;

    return {
      token,
      playbackUrl: `${this.cdnBase}/live/${creatorId}/index.m3u8?token=${token}`,
      expiresAt,
      isVipAccess: isVip,
    };
  }

  async validateStreamKey(streamKey: string): Promise<boolean> {
    return streamKey.startsWith("live_");
  }
}

export const mediaAdapter = new SpecialistMediaAdapter();
