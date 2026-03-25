// src/routes/storyRoutes.js
import express from "express";
import Story from "../models/Story.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { io } from "../server.js";
import fetch from "node-fetch"; // for server-side fetch
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

/* ================= UPLOAD STORY TO R2 ================= */
router.post("/upload", verifyToken, async (req, res) => {
  try {
    // The frontend must send file metadata: filename, contentType, base64 or file buffer
    const { filename, contentType, base64 } = req.body;
    if (!filename || !contentType || !base64) {
      return res.status(400).json({ error: "Missing file data" });
    }

    // Step 1: Get signed URL from backend or generate internally
    // Here we assume you have environment variables:
    // R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
    const bucket = process.env.R2_BUCKET;
    const key = `stories/${Date.now()}-${filename}`;
    const url = `https://${bucket}.r2.cloudflarestorage.com/${key}`;

    // Use fetch PUT to upload directly to R2
    const buffer = Buffer.from(base64, "base64");
    const uploadRes = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: buffer,
    });

    if (!uploadRes.ok) {
      console.error("R2 Upload failed", uploadRes.statusText);
      return res.status(500).json({ error: "Failed to upload to R2" });
    }

    // Step 2: Determine media type
    const type = contentType.startsWith("video") ? "video" : "image";

    // Step 3: Create story in DB
    const story = await Story.create({
      user: req.user.id,
      media: [{ url, type }],
      type,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h expiration
    });

    await story.populate("user", "name profilePic");

    // Step 4: Emit new story via WebSocket
    io.emit("new-story", story);

    res.status(201).json(story);
  } catch (err) {
    console.error("Story upload error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= GET ALL STORIES ================= */
router.get("/", async (req, res) => {
  try {
    const now = new Date();

    // Remove expired stories automatically
    await Story.deleteMany({ expiresAt: { $lte: now } });

    const stories = await Story.find()
      .populate("user", "name profilePic")
      .sort({ createdAt: -1 });

    res.json(stories);
  } catch (err) {
    console.error("GET STORIES ERROR:", err);
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

    story.reactions = (story.reactions || []).filter(
      (r) => r.user.toString() !== req.user.id
    );
    story.reactions.push({ user: req.user.id, type: "❤️" });
    await story.save();

    res.json({ message: "Reacted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;