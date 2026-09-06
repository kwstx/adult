import Redis, { RedisOptions } from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const redisOptions: RedisOptions = {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
  retryStrategy(times) {
    // Exponential backoff up to 3 seconds
    const delay = Math.min(times * 200, 3000);
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

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redisClient = redis;
  globalForRedis.redisSubscriber = redisSubscriber;
}

// Log connection status in non-production environments
if (process.env.NODE_ENV !== "production") {
  redis.on("connect", () => {
    console.log("[Redis] Connected to primary cache & sorted-sets engine.");
  });

  redis.on("error", (err) => {
    // Graceful warning rather than crashing if Redis is not locally started
    console.warn("[Redis] Primary connection warning:", err.message);
  });

  redisSubscriber.on("error", (err) => {
    console.warn("[Redis] Subscriber connection warning:", err.message);
  });
}

export default redis;
