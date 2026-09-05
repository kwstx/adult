export interface PresignedUploadUrl {
  uploadUrl: string;
  fileKey: string;
  publicCdnUrl: string;
  expiresInSeconds: number;
}

export interface MediaAssetMetadata {
  key: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
}
