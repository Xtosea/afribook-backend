// /controllers/videoController.js
import { PutObjectCommand } from "@aws-sdk/client-s3";
import r2 from "../config/r2.js";

export const uploadVideo = async (req, res) => {
  try {
    const file = req.file;

    // 🚨 File size limit (example: 50MB)
    if (file.size > 50 * 1024 * 1024) {
      return res.status(400).json({ error: "Video too large" });
    }

    const key = `videos/${Date.now()}-${file.originalname}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await r2.send(command);

    const url = `https://your-public-url/${key}`;

    res.json({ url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};