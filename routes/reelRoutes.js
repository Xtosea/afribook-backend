import express from "express";
import multer from "multer";
import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { verifyToken } from "../middleware/authMiddleware.js";
import Post from "../models/Post.js";
import { io } from "../server.js";

const router = express.Router();
const upload = multer({ dest: "/tmp" });

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

/* Upload Reel */
router.post("/upload", verifyToken, upload.single("video"), async (req, res) => {
  try {

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No video uploaded" });
    }

    const fileBuffer = fs.readFileSync(file.path);

    const fileName = `reels/${Date.now()}-${file.originalname}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: fileName,
        Body: fileBuffer,
        ContentType: file.mimetype,
      })
    );

    fs.unlinkSync(file.path);

    const reel = await Post.create({
      user: req.user._id,
      content: "",
      media: [
        {
          url: `${R2_CUSTOM_DOMAIN}/${fileName}`,
          type: "video",
        },
      ],
      isReel: true,
    });

    await reel.populate("user", "name profilePic");

    io.emit("new-reel", reel);

    res.json(reel);

  } catch (err) {
    console.error("Reel upload error:", err);
    res.status(500).json({ error: "Failed to upload reel" });
  }
});

export default router;