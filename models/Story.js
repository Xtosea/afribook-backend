import express from "express";
import Story from "../models/Story.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { io } from "../server.js";

const router = express.Router();

/* ================= CREATE STORY ================= */
router.post("/", verifyToken, async (req, res) => {
  try {
    const story = await Story.create({
      user: req.user.id,
      media: req.body.media,
      type: req.body.type || "image",
    });

    await story.populate("user", "name profilePic");
    io.emit("new-story", story);

    res.status(201).json(story);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= GET ALL STORIES ================= */
router.get("/", async (req, res) => {
  try {
    const stories = await Story.find()
      .populate("user", "name profilePic")
      .sort({ createdAt: -1 });

    res.json(stories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= VIEW STORY ================= */
router.post("/view/:id", verifyToken, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: "Story not found" });

    if (!story.views) story.views = [];
    if (!story.views.includes(req.user.id)) story.views.push(req.user.id);
    await story.save();

    res.json({ message: "Viewed" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= REACT STORY ================= */
router.post("/react/:id", verifyToken, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: "Story not found" });

    story.reactions = (story.reactions || []).filter(r => r.user.toString() !== req.user.id);
    story.reactions.push({ user: req.user.id, type: "❤️" });
    await story.save();

    res.json({ message: "Reacted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;