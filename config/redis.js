import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.warn("⚠️ REDIS_URL is not configured");
}

export const redisClient = createClient({
  url: redisUrl,
});

redisClient.on("error", (err) => {
  console.error("❌ Redis/Valkey error:", err);
});

redisClient.on("connect", () => {
  console.log("🔌 Redis/Valkey connecting...");
});

redisClient.on("ready", () => {
  console.log("✅ Redis/Valkey ready");
});

redisClient.on("reconnecting", () => {
  console.log("🔄 Redis/Valkey reconnecting...");
});

export const connectRedis = async () => {
  if (!redisUrl) {
    throw new Error("REDIS_URL is missing");
  }

  if (!redisClient.isOpen) {
    await redisClient.connect();
  }

  return redisClient;
};