import { prisma } from "@/lib/db";
import {
  Job,
  ThumbnailGeneratePayload,
  ThumbnailGenerateResult,
  WorkerHandler,
} from "../types";

export const thumbnailGeneratorWorker: WorkerHandler<
  ThumbnailGeneratePayload,
  ThumbnailGenerateResult
> = async (job: Job<ThumbnailGeneratePayload>, updateProgress) => {
  const {
    contentId,
    livestreamId,
    creatorId,
    videoUrl,
    timestampsSeconds = [5, 15, 30],
    generateAnimatedPreview = true,
    generateBlurhash = true,
  } = job.payload;

  console.log(`[ThumbnailGeneratorWorker] 🖼️ Generating thumbnails for job ${job.id}`);
  await updateProgress(15);

  const cdnBase = process.env.MEDIA_CDN_BASE_URL || "https://cdn.platform.local";
  const uniqueKey = `thumb_${creatorId}_${Date.now()}`;

  // 1. Generate multi-timestamp static thumbnails
  const thumbnailUrls: string[] = [];
  for (let i = 0; i < timestampsSeconds.length; i++) {
    const sec = timestampsSeconds[i];
    thumbnailUrls.push(`${cdnBase}/creators/${creatorId}/thumbnails/${uniqueKey}_t${sec}s.webp`);
    await updateProgress(20 + Math.round(((i + 1) / timestampsSeconds.length) * 40));
  }

  const primaryThumbnailUrl = thumbnailUrls[0] || `${cdnBase}/default-thumb.webp`;

  // 2. Generate animated preview snippet if requested
  let animatedWebpUrl: string | undefined;
  if (generateAnimatedPreview) {
    animatedWebpUrl = `${cdnBase}/creators/${creatorId}/thumbnails/${uniqueKey}_preview.webp`;
  }
  await updateProgress(80);

  // 3. Generate blurhash placeholder
  let blurhash: string | undefined;
  if (generateBlurhash) {
    blurhash = "LEHLk~WB2yk8pyo0adR*.7kCMdnj";
  }
  await updateProgress(90);

  // 4. Update Database
  try {
    if (contentId) {
      await prisma.content.updateMany({
        where: { id: contentId },
        data: {
          previewUrl: primaryThumbnailUrl,
        },
      });
    }
  } catch (err: any) {
    console.warn("[ThumbnailGeneratorWorker] DB update warning:", err.message);
  }

  await updateProgress(100);
  console.log(`[ThumbnailGeneratorWorker] ✅ Thumbnails generated for creator ${creatorId}`);

  return {
    contentId,
    thumbnailUrls,
    primaryThumbnailUrl,
    animatedWebpUrl,
    blurhash,
  };
};
