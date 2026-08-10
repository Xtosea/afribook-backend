import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;

const redis = redisUrl
  ? new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    })
  : null;

export default redis;