import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.warn("⚠️ REDIS_URL is not configured");
}

const redis = redisUrl
  ? new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    })
  : null;

if (redis) {
  redis.on("connect", () => {
    console.log("🔌 Redis/Valkey connecting...");
  });

  redis.on("ready", () => {
    console.log("✅ Redis/Valkey ready");
  });

  redis.on("reconnecting", () => {
    console.log("🔄 Redis/Valkey reconnecting...");
  });

  redis.on("error", (error) => {
    console.error("❌ Redis/Valkey error:", error.message);
  });
}

export default redis;