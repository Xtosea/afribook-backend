// controllers/r2Controller.js
import r2 from "../config/r2.js";
import { PutObjectCommand } from "@aws-sdk/client-s3";

export const uploadR2 = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: `uploads/${Date.now()}-${req.file.originalname}`,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    });

    await r2.send(command);

    const url = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${command.input.Key}`;
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};