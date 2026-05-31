import express from "express";
import multer from "multer";
import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

import Post from "../models/Post.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { io } from "../server.js";
import { addPoints } from "../utils/addPoints.js";

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

/* ================= UPLOAD REEL ================= */
router.post(
  "/upload",
  verifyToken,
  upload.single("video"),
  async (req, res) => {
    try {
      const file = req.file;
      const { caption } = req.body;

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
        user: req.user.id,
        content: caption || "",
        isReel: true,
        media: [
          {
            url: `${R2_CUSTOM_DOMAIN}/${fileName}`,
            type: "video",
          },
        ],
      });

      await reel.populate("user", "name profilePic");

      io.emit("new-reel", reel);

      res.status(201).json(reel);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Reel upload failed" });
    }
  }
);

/* ================= LIKE REEL ================= */
router.put("/:id/like", verifyToken, async (req, res) => {
  try {
    const reel = await Post.findById(req.params.id);

    if (!reel) {
      return res.status(404).json({ error: "Reel not found" });
    }

    if (!reel.likes.includes(req.user.id)) {
      reel.likes.push(req.user.id);

      await addPoints(reel.user, 3, "reel_like");
    }

    await reel.save();

    res.json(reel);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Like failed" });
  }
});

/* ================= VIEW REEL ================= */
router.put("/:id/view", verifyToken, async (req, res) => {
  try {
    const reel = await Post.findById(req.params.id);

    if (!reel) {
      return res.status(404).json({ error: "Reel not found" });
    }

    if (!reel.views.includes(req.user.id)) {
      reel.views.push(req.user.id);

      await addPoints(reel.user, 1, "reel_view");
    }

    await reel.save();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "View failed" });
  }
});

export default router;