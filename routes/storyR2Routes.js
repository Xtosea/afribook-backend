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
} from "../controllers/storyR2Controllers.js";

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

router.post(
  "/upload-thumbnail",
  verifyToken,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: "No file uploaded",
        });
      }

      const buffer =
        fs.readFileSync(req.file.path);

      const fileName =
        `thumbnails/${Date.now()}-${
          req.file.originalname
        }`;

      await s3.send(
        new PutObjectCommand({
          Bucket:
            process.env.R2_BUCKET_NAME,
          Key: fileName,
          Body: buffer,
          ContentType:
            req.file.mimetype,
        })
      );

      fs.unlinkSync(req.file.path);

      const thumbnailUrl =
        `${process.env.R2_CUSTOM_DOMAIN}/${fileName}`;

      res.json({
        thumbnailUrl,
      });

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error:
          "Thumbnail upload failed",
      });
    }
  }
);

export default router;
