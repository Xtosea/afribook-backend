import express from "express";
import multer from "multer";
import fs from "fs";

import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

import { verifyToken }
  from "../middleware/authMiddleware.js";

import {
  getSignedUploadUrl,
} from "../controllers/r2Controller.js";

const router = express.Router();

const upload = multer({
  dest: "/tmp",
});

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId:
      process.env.R2_ACCESS_KEY_ID,
    secretAccessKey:
      process.env.R2_SECRET_ACCESS_KEY,
  },
});

router.get(
  "/signed-url",
  getSignedUploadUrl
);

router.post("/", verifyToken, async (req, res) => {
  try {
    const Story = (await import("../models/Story.js")).default;

    const {
      media = [],
      text = "",
      music = null,
      stickers = [],
      backgroundColor = "#000000",
    } = req.body;

    if (
      media.length === 0 &&
      !text &&
      !music &&
      stickers.length === 0
    ) {
      return res.status(400).json({
        error: "Story content required",
      });
    }

    const story = await Story.create({
      user: req.user.id,
      media,
      text,
      music,
      stickers,
      backgroundColor,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    return res.status(201).json(story);

  } catch (err) {
    console.error("Story save error:", err);
    return res.status(500).json({
      error: "Failed to save story",
    });
  }
});

export default router;