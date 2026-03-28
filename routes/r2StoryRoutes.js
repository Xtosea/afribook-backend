// src/routes/r2StoryRoutes.js
import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import multer from "multer";
import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import Story from "../models/Story.js";

const router = express.Router();
const upload = multer({ dest: "/tmp" });

// ==== Load env variables safely ====
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_CUSTOM_DOMAIN = process.env.R2_CUSTOM_DOMAIN;

console.log("R2_BUCKET_NAME:", R2_BUCKET_NAME); // safe now

// ==== R2 Client ====
const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// ==== Upload Story ====
router.post("/upload", verifyToken, upload.array("media", 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No media uploaded" });
    }

    const uploadedMedia = [];

    for (const file of req.files) {
      const buffer = fs.readFileSync(file.path);
      const fileName = `${req.user._id}-${Date.now()}-${file.originalname}`;

      const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: file.mimetype,
      });

      await s3.send(command);
      fs.unlinkSync(file.path);

      uploadedMedia.push({
        url: `${R2_CUSTOM_DOMAIN}/${fileName}`,
        type: file.mimetype.startsWith("image") ? "image" : "video",
      });
    }

    const story = new Story({
      user: req.user._id,
      media: uploadedMedia,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await story.save();
    res.json({ story });
  } catch (err) {
    console.error("Story upload error:", err);
    res.status(500).json({ error: "Failed to upload story" });
  }
});

// ==== Get Active Stories ====
router.get("/", verifyToken, async (req, res) => {
  try {
    const stories = await Story.find({ expiresAt: { $gt: new Date() } })
      .populate("user", "_id name profilePic")
      .sort({ createdAt: -1 });

    res.json({ stories });
  } catch (err) {
    console.error("Fetch stories error:", err);
    res.status(500).json({ error: "Failed to fetch stories" });
  }
});

export default router;