// src/routes/storyRoutes.js
import express from "express";
import Story from "../models/Story.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { io } from "../server.js";

const router = express.Router();

// ================= UPLOAD STORY (R2-only) =================
router.post("/", verifyToken, async (req, res) => {
  try {

    const { media } = req.body;

    if (!media || !media.length) {
      return res.status(400).json({
        error: "Media is required",
      });
    }

    const story = await Story.create({
      user: req.user.id,

      media,

      expiresAt: new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ),
    });

    await story.populate(
      "user",
      "name profilePic"
    );

    io.emit("new-story", story);

    res.status(201).json(story);

  } catch (err) {

    console.error("Story create error:", err);

    res.status(500).json({
      error: err.message,
    });

  }
});

// ================= REPLY TO STORY =================
router.post("/reply/:id", verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    const story = await Story.findById(req.params.id).populate("user");

    if (!story) return res.status(404).json({ error: "Story not found" });

    story.replies = story.replies || [];
    story.replies.push({ user: req.user._id, text, createdAt: new Date() });

    await story.save();

    io.to(story.user._id.toString()).emit("story-reply", {
      storyId: story._id,
      from: req.user,
      text,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Story reply error:", err);
    res.status(500).json({ error: "Failed to reply story" });
  }
});

// ================= GET STORIES =================
router.get("/", verifyToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || "20");

    const stories = await Story.find({
      expiresAt: { $gt: new Date() } // only active stories
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("user", "name profilePic");

    res.json({ stories });
  } catch (err) {
    console.error("Fetch stories error:", err);
    res.status(500).json({ error: "Failed to fetch stories" });
  }
});

/* ================= LIKE STORY ================= */

router.post("/like/:id", verifyToken, async (req, res) => {
  try {

    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({
        error: "Story not found",
      });
    }

    story.likes = story.likes || [];

    const alreadyLiked = story.likes.some(
      (id) => id.toString() === req.user.id
    );

    if (alreadyLiked) {

      story.likes = story.likes.filter(
        (id) => id.toString() !== req.user.id
      );

    } else {

      story.likes.push(req.user.id);

    }

    await story.save();

    io.emit("story-liked", {
      storyId: story._id,
      likes: story.likes.length,
    });

    res.json({
      success: true,
      likes: story.likes.length,
    });

  } catch (err) {

    console.error("Story like error:", err);

    res.status(500).json({
      error: "Failed to like story",
    });

  }
});
export default router;