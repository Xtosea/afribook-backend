// src/routes/r2StoryRoute.js
import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { R2_BUCKET, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN } from "../config/env.js"; 
import fetch from "node-fetch";

const router = express.Router();

/**
 * GET /api/r2-stories/upload-url
 * Returns a signed URL for uploading a story to Cloudflare R2
 */
router.get("/upload-url", verifyToken, async (req, res) => {
  try {
    const fileName = `${req.user._id}-${Date.now()}.mp4`; // can adjust for images too
    const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/r2/buckets/${R2_BUCKET}/objects/${fileName}`;

    // Cloudflare R2 PUT URL requires Authorization header with Bearer token
    // We'll just return the URL + headers for the frontend to PUT
    res.json({
      uploadUrl: url,
      fileName,
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "video/mp4", // or "image/*" if image
      },
    });
  } catch (err) {
    console.error("R2 story signed URL error:", err);
    res.status(500).json({ error: "Failed to get R2 signed URL" });
  }
});

export default router;