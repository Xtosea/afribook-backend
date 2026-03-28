// src/routes/r2Routes.js
import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import crypto from "crypto";

const router = express.Router();

// ================= GET R2 SIGNED URL =================
router.post("/upload-url", verifyToken, async (req, res) => {
  try {
    const { fileType } = req.body;
    if (!fileType) return res.status(400).json({ error: "Missing fileType" });

    // Generate a unique filename
    const fileName = `${crypto.randomUUID()}.${fileType.split("/")[1]}`;

    // Cloudflare R2 bucket info from env
    const BUCKET_NAME = process.env.R2_BUCKET_NAME;
    const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
    const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID;
    const SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY;

    if (!BUCKET_NAME || !ACCOUNT_ID || !ACCESS_KEY || !SECRET_KEY) {
      return res.status(500).json({ error: "R2 environment not configured" });
    }

    // Create the PUT URL
    const expires = 60; // URL valid for 60 seconds
    const method = "PUT";
    const urlPath = `/${BUCKET_NAME}/${fileName}`;
    const date = new Date().toUTCString();
    const stringToSign = `${method}\n\n${fileType}\n${date}\n${urlPath}`;
    const signature = crypto
      .createHmac("sha1", SECRET_KEY)
      .update(stringToSign)
      .digest("base64");

    const uploadUrl = `https://${BUCKET_NAME}.${ACCOUNT_ID}.r2.cloudflarestorage.com/${fileName}`;
    const signedUrl = uploadUrl; // PUT request with headers below

    // Return the signed URL and the final file URL
    res.json({
      uploadUrl: signedUrl,
      fileUrl: uploadUrl,
      headers: {
        "Content-Type": fileType,
        "Date": date,
        "Authorization": `AWS ${ACCESS_KEY}:${signature}`,
      },
    });
  } catch (err) {
    console.error("R2 signed URL error:", err);
    res.status(500).json({ error: "Failed to generate R2 signed URL" });
  }
});

export default router;