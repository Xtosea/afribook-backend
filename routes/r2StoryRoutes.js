// src/routes/r2StoryRoutes.js
import express from "express";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// Generate signed URL for story upload
router.post("/story-upload-url", async (req, res) => {
  const { filename, contentType } = req.body;
  if (!filename || !contentType) return res.status(400).json({ error: "Missing filename or contentType" });

  const key = `stories/${Date.now()}-${filename}`;
  const url = `https://${process.env.R2_BUCKET_NAME}.r2.cloudflarestorage.com/${key}`;
  const publicUrl = `${process.env.R2_CUSTOM_DOMAIN}/${key}`;

  res.json({ url, publicUrl });
});

export default router;