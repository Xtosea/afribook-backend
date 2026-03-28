// src/routes/r2StoryRoutes.js
import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Load R2 credentials directly from environment variables
const {
  R2_BUCKET_NAME,
  CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_API_TOKEN,
} = process.env;

// Route to get signed upload URL for R2 stories
router.get("/upload-url", verifyToken, async (req, res) => {
  try {
    if (!R2_BUCKET_NAME || !CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
      return res.status(500).json({ error: "R2 environment variables are missing" });
    }

    // Construct a unique file name
    const fileName = `${req.user._id}-${Date.now()}.mp4`;

    // Generate the upload URL
    const uploadUrl = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/r2/buckets/${R2_BUCKET_NAME}/objects/${fileName}`;

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