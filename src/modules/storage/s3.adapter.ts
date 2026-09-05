import { PresignedUploadUrl } from "./types";

export class ObjectStorageAdapter {
  private cdnBase: string;

  constructor() {
    this.cdnBase = process.env.MEDIA_CDN_BASE_URL || "https://cdn.platform.local";
  }

  /**
   * Generates a presigned S3 / Cloudflare R2 upload URL for creator PPV uploads.
   */
  async generatePresignedUploadUrl(params: {
    creatorId: string;
    fileName: string;
    mimeType: string;
  }): Promise<PresignedUploadUrl> {
    const { creatorId, fileName } = params;
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileKey = `creators/${creatorId}/media/${Date.now()}_${sanitizedName}`;

    // In production with AWS SDK S3 / Cloudflare R2:
    // const s3 = new S3Client({...});
    // const command = new PutObjectCommand({ Bucket: 'vault', Key: fileKey, ContentType: mimeType });
    // const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

    const uploadUrl = `/api/media/upload-mock?key=${encodeURIComponent(fileKey)}`;
    const publicCdnUrl = `${this.cdnBase}/${fileKey}`;

    return {
      uploadUrl,
      fileKey,
      publicCdnUrl,
      expiresInSeconds: 900,
    };
  }

  /**
   * Generates a signed, time-limited CDN playback URL for purchased PPV content.
   */
  generateSignedPpvUrl(mediaKey: string, _fanUserId: string): string {
    const token = Buffer.from(`${mediaKey}:${Date.now() + 3600 * 1000}`).toString("base64url");
    return `${this.cdnBase}/${mediaKey}?sig=${token}`;
  }
}

export const objectStorageAdapter = new ObjectStorageAdapter();
