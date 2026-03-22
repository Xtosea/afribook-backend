import r2 from "../config/r2.js";
import fs from "fs";
import { PutObjectCommand } from "@aws-sdk/client-s3";

export const uploadVideo = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No video provided" });

  try {
    const fileStream = fs.createReadStream(req.file.path);

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: `videos/${Date.now()}-${req.file.originalname}`,
      Body: fileStream,
      ContentType: req.file.mimetype,
    });

    await r2.send(command);

    fs.unlinkSync(req.file.path);

    res.json({ message: "Video uploaded to R2", key: command.Key });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "R2 upload failed" });
  }
};