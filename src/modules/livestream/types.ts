export interface StreamCredentials {
  streamKey: string;
  rtmpIngestUrl: string;
  whipIngestUrl: string;
  playbackHlsUrl: string;
  playbackWebrtcUrl: string;
}

export interface PlaybackToken {
  token: string;
  playbackUrl: string;
  expiresAt: number;
  isVipAccess: boolean;
}

export interface StreamHealth {
  isBroadcasting: boolean;
  resolution?: string;
  fps?: number;
  bitrateKbps?: number;
  latencySeconds?: number;
}
