import express from "express";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

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

// Get signed upload URL
router.post("/upload-url", verifyToken, async (req, res) => {
  try {
    const { fileType } = req.body;

    const fileName = `stories/${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileName,
      ContentType: fileType,
    });

    const signedUrl = await getSignedUrl(s3, command, {
      expiresIn: 60,
    });

    res.json({
      uploadUrl: signedUrl,
      fileUrl: `${R2_CUSTOM_DOMAIN}/${fileName}`,
    });
  } catch (err) {
    console.error("R2 signed URL error:", err);
    res.status(500).json({ error: "Failed to get upload URL" });
  }
});

export default router;