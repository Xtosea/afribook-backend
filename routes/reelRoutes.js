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
        return res.status(400).json({
          error: "No video uploaded",
        });
      }

      const fileBuffer = fs.readFileSync(file.path);

      const fileName =
        `reels/${Date.now()}-${file.originalname}`;

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

      await reel.populate(
        "user",
        "name profilePic"
      );

      io.emit("new-reel", reel);

      res.status(201).json(reel);

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: "Reel upload failed",
      });
    }
  }
);

/* ================= LIKE REEL ================= */

router.put(
  "/:id/like",
  verifyToken,
  async (req, res) => {
    try {
      const reel = await Post.findById(
        req.params.id
      );

      if (!reel) {
        return res.status(404).json({
          error: "Reel not found",
        });
      }

      const alreadyLiked =
        reel.likes.some(
          (id) =>
            id.toString() ===
            req.user.id
        );

      if (!alreadyLiked) {
        reel.likes.push(req.user.id);

        await addPoints(
          reel.user,
          3,
          "reel_like"
        );

        console.log(
          "💰 REEL LIKE POINT ADDED"
        );

        await reel.save();
      }

      res.json({
        success: true,
        likes: reel.likes.length,
      });

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: "Like failed",
      });
    }
  }
);

/* ================= VIEW REEL ================= */

router.put(
  "/:id/view",
  verifyToken,
  async (req, res) => {
    try {
      const reel = await Post.findById(
        req.params.id
      );

      if (!reel) {
        return res.status(404).json({
          error: "Reel not found",
        });
      }

      if (!reel.viewedBy) {
        reel.viewedBy = [];
      }

      const alreadyViewed =
        reel.viewedBy.some(
          (id) =>
            id.toString() ===
            req.user.id
        );

      if (!alreadyViewed) {
        reel.viewedBy.push(
          req.user.id
        );

        reel.viewsCount =
          (reel.viewsCount || 0) + 1;

        await addPoints(
          reel.user,
          1,
          "reel_view"
        );

        await reel.save();

        console.log(
          "💰 REEL VIEW POINT ADDED"
        );
      }

      res.json({
        success: true,
        views: reel.viewsCount,
      });

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: "View failed",
      });
    }
  }
);

/* ================= TEST ROUTES ================= */

router.get(
  "/:id/view",
  async (req, res) => {
    res.json({
      message: "View route exists",
      reelId: req.params.id,
    });
  }
);

router.get(
  "/:id/like",
  async (req, res) => {
    res.json({
      message: "Like route exists",
      reelId: req.params.id,
    });
  }
);

router.get(
  "/test/:id/view",
  async (req, res) => {
    const reel =
      await Post.findById(
        req.params.id
      );

    res.json({
      found: !!reel,
      reelId: req.params.id,
    });
  }
);

export default router;