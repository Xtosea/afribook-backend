import express from "express";
import User from "../models/User.js";
import { redisClient } from "../server.js";

const router = express.Router();

/* ================= TOP USERS LEADERBOARD ================= */
router.get("/top", async (req, res) => {
  try {
    const cacheKey = "leaderboard:top";
    const cached = await redisClient.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const topUsers = await User.find()
      .sort({ points: -1 })
      .limit(20)
      .select("name profilePic points");

    await redisClient.set(cacheKey, JSON.stringify(topUsers), "EX", 60); // cache 1 minute

    res.json(topUsers);
  } catch (err) {
    console.error("LEADERBOARD ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;