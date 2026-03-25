// routes/storyRoutes.js
import express from "express";
import Story from "../models/Story.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { io } from "../server.js"; // Redis removed

const router = express.Router();

/* ================= CREATE STORY ================= */
router.post("/", verifyToken, async (req, res) => {
  try {
    const story = await Story.create({
      user: req.user.id,
      media: req.body.media,
    });

    await story.populate("user", "name profilePic");

    // Redis removed
    // await redisClient.del("stories:all");

    // Broadcast new story in real-time (optional)
    io.emit("new-story", story);

    res.status(201).json(story);
  } catch (err) {
    console.error("CREATE STORY ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= GET ALL STORIES ================= */
router.get("/", async (req, res) => {
  try {
    // Redis removed
    // const cacheKey = "stories:all";
    // const cached = await redisClient.get(cacheKey);
    // if (cached) return res.json(JSON.parse(cached));

    const stories = await Story.find()
      .populate("user", "name profilePic")
      .sort({ createdAt: -1 });

    // Redis removed
    // await redisClient.set(cacheKey, JSON.stringify(stories), "EX", 30);

    res.json(stories);
  } catch (err) {
    console.error("GET STORIES ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;