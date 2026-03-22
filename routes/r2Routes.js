import express from "express";
import multer from "multer";
import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const router = express.Router();
const upload = multer({ dest: "/tmp" });

const {
  R2_BUCKET_NAME,
  R2_ENDPOINT,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_CUSTOM_DOMAIN,
} = process.env;

/* ================= R2 CLIENT ================= */
const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

/* ================= UPLOAD ================= */
router.post("/upload-video", upload.array("video", 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No video files uploaded" });
    }

    const uploadedFiles = [];

    for (const file of req.files) {
      const fileBuffer = fs.readFileSync(file.path);
      const fileName = `${Date.now()}-${file.originalname}`;

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
        type: "video",
      });
    }

    res.json({ uploaded: uploadedFiles });

  } catch (err) {
    console.error("R2 UPLOAD ERROR FULL:", err); // 🔥 IMPORTANT
    res.status(500).json({ error: "Failed to upload videos" });
  }
});

export default router;