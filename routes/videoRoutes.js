// routes/videoRoutes.js
import express from "express";
import Video from "../models/Video.js";
import Comment from "../models/Comment.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { io } from "../server.js"; // removed redisClient

const router = express.Router();

/* ================= UPLOAD VIDEO ================= */
router.post("/", verifyToken, async (req, res) => {
  try {
    const { url, description } = req.body;

    const video = await Video.create({
      user: req.user.id,
      url,
      description,
    });

    await video.populate("user", "name profilePic");

    // Redis removed
    // await redisClient.del("videos:all");

    // Broadcast new video for TikTok-style feed
    io.emit("new-video", video);

    res.status(201).json(video);
  } catch (err) {
    console.error("UPLOAD VIDEO ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= GET ALL VIDEOS (TikTok feed) ================= */
router.get("/", async (req, res) => {
  try {
    // Redis removed
    // const cacheKey = "videos:all";
    // const cached = await redisClient.get(cacheKey);
    // if (cached) return res.json(JSON.parse(cached));

    const videos = await Video.find()
      .populate("user", "name profilePic")
      .sort({ createdAt: -1 });

    // Redis removed
    // await redisClient.set(cacheKey, JSON.stringify(videos), "EX", 30);

    res.json(videos);
  } catch (err) {
    console.error("GET VIDEOS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= ADD COMMENT ================= */
router.post("/:videoId/comment", verifyToken, async (req, res) => {
  try {
    const { text } = req.body;

    const video = await Video.findById(req.params.videoId);
    if (!video) return res.status(404).json({ error: "Video not found" });

    const comment = new Comment({
      post: video._id,
      user: req.user.id,
      text,
    });

    await comment.save();
    await comment.populate("user", "name profilePic");

    // Broadcast live comment to feed
    io.emit("new-video-comment", { videoId: video._id, comment });

    // Redis removed
    // await redisClient.del("videos:all");

    res.status(201).json({ comment });
  } catch (err) {
    console.error("ADD VIDEO COMMENT ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;