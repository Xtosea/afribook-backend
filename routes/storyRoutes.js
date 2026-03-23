import express from "express";
import Story from "../models/Story.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// CREATE STORY
router.post("/", verifyToken, async (req, res) => {
  try {
    const story = await Story.create({
      user: req.user.id,
      media: req.body.media
    });
    res.status(201).json(story);
  } catch (err) {
    console.error("CREATE STORY ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET ALL STORIES
router.get("/", async (req, res) => {
  try {
    const stories = await Story.find()
      .populate("user", "name profilePic")
      .sort({ createdAt: -1 });

    res.json(stories);
  } catch (err) {
    console.error("GET STORIES ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;