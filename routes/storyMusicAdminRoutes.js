import express from "express";
import StoryMusic from "../models/StoryMusic.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/*
POST /api/story-music
{
  title,
  artist,
  audioUrl,
  coverUrl
}
*/

router.post("/", verifyToken, async (req, res) => {
  try {
    const {
      title,
      artist,
      audioUrl,
      coverUrl,
    } = req.body;

    const music = await StoryMusic.create({
      title,
      artist,
      audioUrl,
      coverUrl,
    });

    res.status(201).json(music);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to create music",
    });
  }
});

export default router;