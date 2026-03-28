import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const router = express.Router();

// ENV
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_CUSTOM_DOMAIN = process.env.R2_CUSTOM_DOMAIN;

const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// Get Signed Upload URL
router.get("/upload-url", verifyToken, async (req, res) => {
  try {
    const fileName = `${req.user._id}-${Date.now()}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileName,
    });

    const uploadUrl = await getSignedUrl(s3, command, {
      expiresIn: 60,
    });

    const publicUrl = `${R2_CUSTOM_DOMAIN}/${fileName}`;

    res.json({
      uploadUrl,
      fileName,
      publicUrl,
      headers: {
        "Content-Type": "application/octet-stream",
      },
    });

  } catch (err) {
    console.error("Signed URL error:", err);
    res.status(500).json({
      error: "Failed to get signed URL"
    });
  }
});

export default router;