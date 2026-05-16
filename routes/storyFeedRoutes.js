import express from "express";
import Story from "../models/Story.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { getStoryScore } from "../utils/storyRanking.js";

const router = express.Router();

/* =========================
   FOR YOU FEED
========================= */
router.get("/feed/foryou", verifyToken, async (req, res) => {
  try {
    const stories = await Story.find()
      .populate("user", "name profilePic")
      .lean();

    const rankedStories = stories
      .map((story) => ({
        ...story,
        score: getStoryScore(story),
      }))
      .sort((a, b) => b.score - a.score)
      .map(({ score, ...story }) => story);

    res.json(rankedStories);
  } catch (err) {
    console.error("Feed error:", err);
    res.status(500).json({ error: "Failed to load feed" });
  }
});

export default router;