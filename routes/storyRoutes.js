// src/routes/storyRoutes.js
import express from "express";
import multer from "multer";
import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import Story from "../models/Story.js";
import { verifyToken } from "../middleware/authMiddleware.js"; // use verifyToken
import { io } from "../server.js";

const router = express.Router();
const upload = multer({ dest: "/tmp" });

const {
  R2_BUCKET_NAME,
  R2_ENDPOINT,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_CUSTOM_DOMAIN,
} = process.env;

const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// Reply to story
router.post("/reply/:id", verifyToken, async (req, res) => { // <- fixed middleware
  try {
    const { text } = req.body;

    const story = await Story.findById(req.params.id).populate("user");

    if (!story) {
      return res.status(404).json({ error: "Story not found" });
    }

    const reply = {
      user: req.user._id,
      text,
      createdAt: new Date(),
    };

    story.replies = story.replies || [];
    story.replies.push(reply);

    await story.save();

    // Real-time notify story owner
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

/* ================= UPLOAD STORY ================= */
router.post("/upload-video", verifyToken, upload.array("video", 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const uploadedFiles = [];

    for (const file of req.files) {
      const fileBuffer = fs.readFileSync(file.path);
      const fileName = `stories/${Date.now()}-${file.originalname}`;

      const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: fileName,
        Body: fileBuffer,
        ContentType: file.mimetype,
      });

      await s3.send(command);
      fs.unlinkSync(file.path);

      uploadedFiles.push({
        url: `${R2_CUSTOM_DOMAIN}/${fileName}`,
        type: file.mimetype.startsWith("video") ? "video" : "image",
      });
    }

    // Save story in DB
    const story = await Story.create({
      user: req.user._id,
      media: uploadedFiles,
      type: uploadedFiles[0].type,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await story.populate("user", "name profilePic");

    // Emit to all clients
    io.emit("new-story", story);

    res.status(201).json(story);
  } catch (err) {
    console.error("Story upload error:", err);
    res.status(500).json({ error: "Failed to upload story" });
  }
});

export default router;