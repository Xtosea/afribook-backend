import express from "express";
import StoryMusic from "../models/StoryMusic.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get music library
router.get("/", async (req, res) => {
  const music = await StoryMusic.find()
    .sort({ title: 1 });

  res.json(music);
});

// Add music after R2 upload
router.post("/", verifyToken, async (req, res) => {
  try {
    const song = await StoryMusic.create({
      title: req.body.title,
      artist: req.body.artist,
      audioUrl: req.body.audioUrl,
      coverUrl: req.body.coverUrl,
    });

    res.status(201).json(song);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to save music",
    });
  }
});

export default router;