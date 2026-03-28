// src/routes/r2StoryRoutes.js
import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const router = express.Router();

// R2 ENV
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_CUSTOM_DOMAIN = process.env.R2_CUSTOM_DOMAIN;

// R2 Client
const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// Upload Story
router.get("/upload-url", verifyToken, async (req, res) => {
  try {
    if (!req.files || !req.files.media) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.files.media;

    const fileName = `${req.user._id}-${Date.now()}-${file.name}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileName,
      Body: file.data,
      ContentType: file.mimetype,
    });

    await s3.send(command);

    const story = {
      user: req.user._id,
      url: `${R2_CUSTOM_DOMAIN}/${fileName}`,
      type: file.mimetype.startsWith("image") ? "image" : "video",
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    res.json({ story });

  } catch (err) {
    console.error("Story upload error:", err);
    res.status(500).json({ error: "Story upload failed" });
  }
});

export default router;