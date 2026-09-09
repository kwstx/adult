import Redis, { RedisOptions } from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const redisOptions: RedisOptions = {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
  retryStrategy(times) {
    if (times > 5 && process.env.NODE_ENV !== "production") {
      return Math.min(times * 5000, 60000);
    }
    const delay = Math.min(times * 500, 5000);
    return delay;
  },
  reconnectOnError(err) {
    const targetError = "READONLY";
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
};

/**
 * Global singleton pattern for Next.js hot-reloading in development.
 */
interface GlobalRedis {
  redisClient?: Redis;
  redisSubscriber?: Redis;
}

const globalForRedis = globalThis as unknown as GlobalRedis;

/**
 * Primary Redis client instance for read/write operations (ZSETs, Hashes, Strings).
 */
export const redis: Redis =
  globalForRedis.redisClient ?? new Redis(REDIS_URL, redisOptions);

/**
 * Dedicated Redis subscriber client for Pub/Sub event listening.
 */
export const redisSubscriber: Redis =
  globalForRedis.redisSubscriber ?? new Redis(REDIS_URL, redisOptions);

globalForRedis.redisClient = redis;
globalForRedis.redisSubscriber = redisSubscriber;

// Log connection status in non-production environments with throttling
if (process.env.NODE_ENV !== "production") {
  redis.on("connect", () => {
    console.log("[Redis] Connected to primary cache & sorted-sets engine.");
  });

  let lastPrimaryErrLog = 0;
  redis.on("error", (err) => {
    const now = Date.now();
    if (now - lastPrimaryErrLog > 60000) {
      lastPrimaryErrLog = now;
      console.warn("[Redis] Primary connection offline (in-memory fallback active):", err.message);
    }
  });

  let lastSubErrLog = 0;
  redisSubscriber.on("error", (err) => {
    const now = Date.now();
    if (now - lastSubErrLog > 60000) {
      lastSubErrLog = now;
      console.warn("[Redis] Subscriber connection offline (in-memory fallback active):", err.message);
    }
  });
}

export default redis;
