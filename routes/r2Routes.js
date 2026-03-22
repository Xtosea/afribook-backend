import express from "express";
import multer from "multer";
import fs from "fs";
import fetch from "node-fetch";

const router = express.Router();
const upload = multer({ dest: "/tmp" }); // Temp folder for Multer

// Env variables
const {
  R2_BUCKET_NAME,
  R2_ENDPOINT,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_CUSTOM_DOMAIN,
} = process.env;

/* ================= UPLOAD VIDEO(S) TO R2 ================= */
router.post("/upload-video", upload.array("video", 5), async (req, res) => {
  // "video" matches frontend field name, max 5 files
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No video files uploaded" });
    }

    const uploadedFiles = [];

    for (const file of req.files) {
      const filePath = file.path;
      const fileName = `${Date.now()}-${file.originalname}`;
      const fileBuffer = fs.readFileSync(filePath);

      const uploadUrl = `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${fileName}`;

      const r2Response = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.mimetype,
          "Authorization": "Basic " + Buffer.from(`${R2_ACCESS_KEY_ID}:${R2_SECRET_ACCESS_KEY}`).toString("base64"),
        },
        body: fileBuffer,
      });

      // Delete temp file
      fs.unlinkSync(filePath);

      if (!r2Response.ok) {
        throw new Error(`R2 upload failed for ${file.originalname}`);
      }

      uploadedFiles.push({
        url: `${R2_CUSTOM_DOMAIN}/${fileName}`,
        type: "video",
      });
    }

    res.json({ uploaded: uploadedFiles });
  } catch (err) {
    console.error("R2 UPLOAD ERROR:", err);
    res.status(500).json({ error: "Failed to upload videos" });
  }
});

export default router;