import express from "express";
import Story from "../models/Story.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Create story
router.post("/", verifyToken, async (req, res) => {
  const story = await Story.create({
    user: req.user.id,
    media: req.body.media
  });

  res.json(story);
});

// Get all stories
router.get("/", async (req, res) => {
  const stories = await Story.find()
    .populate("user", "name profilePic")
    .sort({ createdAt: -1 });

  res.json(stories);
});

export default router;