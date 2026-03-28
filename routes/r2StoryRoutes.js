// src/routes/r2StoryRoute.js
import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import fetch from "node-fetch";
import { R2_BUCKET, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN } from "../config/env.js";

const router = express.Router();

router.get("/upload-url", verifyToken, async (req, res) => {
  try {
    const fileName = `${req.user._id}-${Date.now()}.mp4`;
    const uploadUrl = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/r2/buckets/${R2_BUCKET}/objects/${fileName}`;

    res.json({
      uploadUrl,
      fileName,
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "video/mp4",
      },
    });
  } catch (err) {
    console.error("R2 story signed URL error:", err);
    res.status(500).json({ error: "Failed to get R2 signed URL" });
  }
});

export default router;