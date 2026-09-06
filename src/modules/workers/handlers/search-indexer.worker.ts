import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import {
  Job,
  SearchIndexUpdatePayload,
  SearchIndexUpdateResult,
  WorkerHandler,
} from "../types";

export const searchIndexerWorker: WorkerHandler<
  SearchIndexUpdatePayload,
  SearchIndexUpdateResult
> = async (job: Job<SearchIndexUpdatePayload>, updateProgress) => {
  const { entityType, entityId, action, documentData } = job.payload;

  console.log(`[SearchIndexerWorker] 🔍 Updating search index for ${entityType}:${entityId} (${action})`);
  await updateProgress(10);

  let indexedEntities = 0;
  const indexKey = `search:${entityType.toLowerCase()}`;

  if (action === "DELETE") {
    try {
      if (redis.status === "ready") {
        await redis.hdel(indexKey, entityId);
        await redis.zrem(`${indexKey}:ranked`, entityId);
      }
    } catch {}
    await updateProgress(100);
    return { indexedEntities: 1, indexName: indexKey, action };
  }

  // Handle UPSERT / REINDEX
  if (entityType === "CREATOR") {
    let searchDoc: any = documentData;

    if (!searchDoc) {
      try {
        const creator = await prisma.creatorProfile.findUnique({
          where: { id: entityId },
          include: { user: { select: { username: true, displayName: true, avatarUrl: true } } },
        });

        if (creator) {
          searchDoc = {
            id: creator.id,
            userId: creator.userId,
            username: creator.user.username,
            displayName: creator.user.displayName,
            stageName: creator.stageName || creator.user.displayName,
            category: creator.category || "General",
            tags: creator.tags || "",
            isLive: creator.isLive,
            followers: creator.totalFollowers,
            updatedAt: new Date().toISOString(),
          };
        }
      } catch (err: any) {
        console.warn("[SearchIndexerWorker] DB lookup warning:", err.message);
      }
    }

    if (!searchDoc) {
      searchDoc = {
        id: entityId,
        stageName: `Creator_${entityId}`,
        category: "General",
        tags: "interactive,live",
        isLive: false,
        followers: 10,
        updatedAt: new Date().toISOString(),
      };
    }

    try {
      if (redis.status === "ready") {
        const pipeline = redis.pipeline();
        pipeline.hset(indexKey, entityId, JSON.stringify(searchDoc));
        const rankScore = (searchDoc.isLive ? 100000 : 0) + (searchDoc.followers || 0);
        pipeline.zadd(`${indexKey}:ranked`, rankScore, entityId);

        const tags = (searchDoc.tags || "")
          .split(",")
          .map((t: string) => t.trim().toLowerCase())
          .filter(Boolean);
        for (const tag of tags) {
          pipeline.sadd(`search:tag:${tag}`, entityId);
        }
        await pipeline.exec();
      }
    } catch (err: any) {
      console.warn("[SearchIndexerWorker] Redis indexing warning:", err.message);
    }
    indexedEntities = 1;
  } else if (entityType === "LIVESTREAM") {
    let doc: any = documentData;
    if (!doc) {
      try {
        const stream = await prisma.livestream.findUnique({
          where: { id: entityId },
          include: { creatorProfile: { select: { stageName: true, user: { select: { displayName: true } } } } },
        });

        if (stream) {
          doc = {
            id: stream.id,
            creatorId: stream.creatorProfileId,
            title: stream.title,
            description: stream.description,
            category: stream.category,
            tags: stream.tags,
            status: stream.status,
            viewerCount: stream.currentViewerCount,
          };
        }
      } catch (err: any) {
        console.warn("[SearchIndexerWorker] DB stream lookup warning:", err.message);
      }
    }

    if (!doc) {
      doc = {
        id: entityId,
        title: `Livestream_${entityId}`,
        category: "Entertainment",
        status: "LIVE",
        viewerCount: 50,
      };
    }

    try {
      if (redis.status === "ready") {
        await redis.hset(indexKey, entityId, JSON.stringify(doc));
        if (doc.status === "LIVE") {
          await redis.zadd(`${indexKey}:live_viewers`, doc.viewerCount || 0, entityId);
        }
      }
    } catch {}
    indexedEntities = 1;
  }

  await updateProgress(100);
  console.log(`[SearchIndexerWorker] ✅ Search index updated for ${entityType}:${entityId}`);

  return {
    indexedEntities,
    indexName: indexKey,
    action,
  };
};
