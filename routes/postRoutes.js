import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import Notification from "../models/Notification.js";

import { verifyToken } from "../middleware/authMiddleware.js";
import { io } from "../server.js";

const router = express.Router();
const upload = multer({ dest: "/tmp" });

ffmpeg.setFfmpegPath(ffmpegPath);

/* ================= R2 CONFIG ================= */
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

/* ================= CREATE POST ================= */
router.post("/", verifyToken, async (req, res) => {
  try {
    const { content, feeling, location, taggedFriends, media } = req.body;

    const updatedMedia = (media || []).map((m) => ({
      ...m,
      url: m.url.startsWith("http")
        ? m.url
        : `${R2_CUSTOM_DOMAIN}/${m.url}`,
    }));

    const post = new Post({
      user: req.user.id,
      content: content || "",
      media: updatedMedia,
      feeling: feeling || "",
      location: location || "",
      taggedFriends: taggedFriends || [],
    });

    await post.save();

    await post.populate([
      { path: "user", select: "name profilePic" },
      { path: "taggedFriends", select: "name profilePic" },
    ]);

    io.emit("new-post", post);

    res.status(201).json({ message: "Post created", post });

  } catch (err) {
    console.error("CREATE POST ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= VIDEO UPLOAD ================= */
router.post(
  "/upload",
  verifyToken,
  upload.single("video"),
  async (req, res) => {
    try {
      const file = req.file;
      if (!file)
        return res.status(400).json({ error: "No video uploaded" });

      const inputPath = file.path;
      const outputPath = `/tmp/${Date.now()}-processed.mp4`;
      const thumbPath = `/tmp/${Date.now()}-thumb.jpg`;

      /* ================= PROCESS VIDEO ================= */

      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .outputOptions([
            "-movflags +faststart",
            "-preset fast",
            "-crf 23",
            "-pix_fmt yuv420p",
          ])
          .save(outputPath)
          .on("end", resolve)
          .on("error", reject);
      });

      /* ================= GENERATE THUMBNAIL ================= */

      await new Promise((resolve, reject) => {
        ffmpeg(outputPath)
          .screenshots({
            timestamps: ["50%"],
            filename: path.basename(thumbPath),
            folder: "/tmp",
            size: "640x360",
          })
          .on("end", resolve)
          .on("error", reject);
      });

      /* ================= UPLOAD VIDEO ================= */

      const videoName = `videos/${Date.now()}.mp4`;

      const videoBuffer = fs.readFileSync(outputPath);

      await s3.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: videoName,
          Body: videoBuffer,
          ContentType: "video/mp4",
        })
      );

      /* ================= UPLOAD THUMB ================= */

      const thumbName = `thumbnails/${Date.now()}.jpg`;
      const thumbBuffer = fs.readFileSync(thumbPath);

      await s3.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: thumbName,
          Body: thumbBuffer,
          ContentType: "image/jpeg",
        })
      );

      /* ================= CLEANUP ================= */

      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
      fs.unlinkSync(thumbPath);

      const videoUrl = `${R2_CUSTOM_DOMAIN}/${videoName}`;
      const thumbUrl = `${R2_CUSTOM_DOMAIN}/${thumbName}`;

      res.json({
        url: videoUrl,
        thumbnailUrl: thumbUrl,
        type: "video",
      });

    } catch (err) {
      console.error("Video upload error:", err);
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

/* ================= GET ALL POSTS ================= */

router.get("/", verifyToken, async (req, res) => {
  try {
    let posts = await Post.find()
      .populate("user", "name profilePic")
      .populate("taggedFriends", "name profilePic")
      .populate("comments.user", "name profilePic")
      .sort({ createdAt: -1 });

    posts = posts.sort((a, b) => {
      const scoreA =
        (a.likes?.length || 0) * 3 +
        (a.comments?.length || 0) * 2 +
        (a.views || 0);

      const scoreB =
        (b.likes?.length || 0) * 3 +
        (b.comments?.length || 0) * 2 +
        (b.views || 0);

      return scoreB - scoreA;
    });

    res.json(posts);

  } catch (err) {
    console.error("GET POSTS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= LIKE ================= */

router.put("/:postId/like", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    const liked = post.likes.includes(req.user.id);

    post.likes = liked
      ? post.likes.filter(
          (id) => id.toString() !== req.user.id
        )
      : [...post.likes, req.user.id];

    await post.save();

    res.json({ likes: post.likes });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= COMMENT ================= */

router.post(
  "/:postId/comment",
  verifyToken,
  async (req, res) => {
    try {
      const { text } = req.body;

      const comment = new Comment({
        post: req.params.postId,
        user: req.user.id,
        text,
      });

      await comment.save();

      await comment.populate(
        "user",