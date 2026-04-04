// src/routes/postRoutes.js
import express from "express";
import multer from "multer";
import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import Notification from "../models/Notification.js";

import { verifyToken } from "../middleware/authMiddleware.js";
import { io } from "../server.js";

const router = express.Router();
const upload = multer({ dest: "/tmp" });

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

/* ================= CREATE POST / UPLOAD ================= */
router.post("/", verifyToken, upload.array("media"), async (req, res) => {
  try {
    const files = req.files || [];
    const { content } = req.body;

    const uploadedMedia = [];

    for (const file of files) {
      const fileBuffer = fs.readFileSync(file.path);
      const fileType = file.mimetype.startsWith("image") ? "image" : "video";
      const fileName = `${fileType}s/${Date.now()}-${file.originalname}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: fileName,
          Body: fileBuffer,
          ContentType: file.mimetype,
        })
      );

      fs.unlinkSync(file.path);

      const url = `${R2_CUSTOM_DOMAIN}/${fileName}`;
      uploadedMedia.push(
        fileType === "video"
          ? { url, type: fileType, thumbnailUrl: `${url}?thumbnail=1` }
          : { url, type: fileType }
      );
    }

    const post = await Post.create({
      user: req.user.id,
      content: content || "",
      media: uploadedMedia,
      isReel: uploadedMedia.some((m) => m.type === "video"),
    });

    await post.populate("user", "name profilePic");

    io.emit("new-post", post);
    if (post.isReel) io.emit("new-reel", post);

    res.json({ post });
  } catch (err) {
    console.error("CREATE POST ERROR:", err);
    res.status(500).json({ error: "Failed to create post", message: err.message });
  }
});

/* ================= GET ALL POSTS ================= */
router.get("/", verifyToken, async (req, res) => {
  try {
    let posts = await Post.find()
      .populate("user", "name profilePic")
      .populate("taggedFriends", "name profilePic")
      .populate("comments.user", "name profilePic")
      .sort({ createdAt: -1 });

    // Smart feed ranking
    posts.sort((a, b) => {
      const scoreA = (a.likes?.length || 0) * 3 + (a.comments?.length || 0) * 2 + (a.views || 0);
      const scoreB = (b.likes?.length || 0) * 3 + (b.comments?.length || 0) * 2 + (b.views || 0);
      return scoreB - scoreA;
    });

    res.json(posts);
  } catch (err) {
    console.error("GET POSTS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= GET REELS ================= */
router.get("/reels", async (req, res) => {
  try {
    const reels = await Post.find({ isReel: true })
      .populate("user", "name profilePic")
      .sort({ createdAt: -1 });
    res.json(reels);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reels" });
  }
});

/* ================= GET USER POSTS ================= */
router.get("/user/:userId", verifyToken, async (req, res) => {
  try {
    const posts = await Post.find({ user: req.params.userId })
      .populate("user", "name profilePic")
      .populate("taggedFriends", "name profilePic")
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= GET SINGLE POST ================= */
router.get("/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("user", "name profilePic")
      .populate("taggedFriends", "name profilePic");

    if (!post) return res.status(404).json({ error: "Post not found" });

    const comments = await Comment.find({ post: post._id })
      .populate("user", "name profilePic")
      .sort({ createdAt: -1 });

    res.json({ ...post.toObject(), comments });
  } catch (err) {
    console.error("GET SINGLE POST ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= LIKE POST ================= */
router.put("/:postId/like", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const liked = post.likes.includes(req.user.id);
    post.likes = liked
      ? post.likes.filter((id) => id.toString() !== req.user.id)
      : [...post.likes, req.user.id];

    await post.save();

    if (!liked) {
      const notification = new Notification({
        recipient: post.user,
        sender: req.user.id,
        type: "LIKE",
        post: post._id,
        text: `${req.user.name} liked your post`,
      });
      await notification.save();
      await notification.populate("sender", "name profilePic");
      io.to(post.user.toString()).emit("new-notification", notification);
    }

    res.json({ likesCount: post.likes.length });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= COMMENT POST ================= */
router.post("/:postId/comment", verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    const comment = new Comment({ post: req.params.postId, user: req.user.id, text });
    await comment.save();
    await comment.populate("user", "name profilePic");
    io.emit("new-comment", comment);
    res.status(201).json({ comment });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= SHARE POST ================= */
router.post("/:postId/share", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    post.shares = (post.shares || 0) + 1;
    await post.save();
    res.json({ shares: post.shares });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= VIEW POST ================= */
router.post("/view/:id", async (req, res) => {
  try {
    await Post.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to record view" });
  }
});

/* ================= EDIT POST ================= */
router.put("/:postId", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: "Post not found" });
    post.content = req.body.content;
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= DELETE POST ================= */
router.delete("/:postId", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: "Post not found" });
    if (post.user.toString() !== req.user.id)
      return res.status(403).json({ error: "Unauthorized" });
    await post.deleteOne();
    res.json({ message: "Post deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= SAVE POST ================= */
router.put("/:postId/save", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    const saved = post.savedBy?.includes(req.user.id);
    post.savedBy = saved
      ? post.savedBy.filter((id) => id.toString() !== req.user.id)
      : [...(post.savedBy || []), req.user.id];
    await post.save();
    res.json({ saved: !saved });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= REPORT POST ================= */
router.post("/:postId/report", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    post.reports = post.reports || [];
    post.reports.push({ user: req.user.id, reason: req.body.reason });
    await post.save();
    res.json({ message: "Reported" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;