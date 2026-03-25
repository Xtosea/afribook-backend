// src/routes/storyRoutes.js
import express from "express";
import multer from "multer";
import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import Story from "../models/Story.js";
import { verifyToken } from "../middleware/authMiddleware.js";
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
      user: req.user.id,
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