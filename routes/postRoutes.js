// src/routes/postRoutes.js
import express from "express";
import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import Notification from "../models/Notification.js";

import { verifyToken } from "../middleware/authMiddleware.js";
import { io } from "../server.js";

const router = express.Router();


// ================= MULTER =================
const storage = multer.memoryStorage();
const upload = multer({ storage });


// ================= R2 CONFIG =================
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


// ================= SAFE PARSER =================
const parseTaggedFriends = (taggedFriends) => {
  try {
    if (!taggedFriends) return [];
    if (typeof taggedFriends === "string") {
      return JSON.parse(taggedFriends);
    }
    return taggedFriends;
  } catch {
    return [];
  }
};


// ================= CREATE POST =================
const createPostHandler = async (req, res) => {
  try {
    const { content, location, feeling, taggedFriends } = req.body;

    const files = req.files || [];
    const mediaFiles = [];

    for (let file of files) {
      const type = file.mimetype.startsWith("image") ? "image" : "video";
      const fileName = `posts/${Date.now()}-${file.originalname}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: fileName,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
      );

      mediaFiles.push({
        url: `${R2_CUSTOM_DOMAIN}/${fileName}`,
        type,
      });
    }

    const post = await Post.create({
      user: req.user.id,
      content: content || "",
      media: mediaFiles,
      location: location || "",
      feeling: feeling || "",
      taggedFriends: parseTaggedFriends(taggedFriends),
      isReel: mediaFiles.some((m) => m.type === "video"),
    });

    await post.populate("user", "name profilePic");

    io.emit("new-post", post);

    if (post.isReel) {
      io.emit("new-reel", post);
    }

    res.json({ post });

  } catch (err) {
    console.error("CREATE POST ERROR:", err);
    res.status(500).json({
      error: "Failed to create post",
      message: err.message,
    });
  }
};


// ================= CREATE =================
router.post("/", verifyToken, upload.array("media"), createPostHandler);
router.post("/upload", verifyToken, upload.array("media"), createPostHandler);


// ================= GET POSTS =================
router.get("/", async (req, res) => {
  try {

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const posts = await Post.find()
      .populate("user", "name profilePic")
      .populate("taggedFriends", "name profilePic")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json(posts || []);

  } catch (err) {
    console.error("GET POSTS ERROR:", err);
    res.status(500).json({
      error: "Server error",
      message: err.message
    });
  }
});


// ================= GET REELS =================
router.get("/reels", async (req, res) => {
  try {
    const reels = await Post.find({ isReel: true })
      .populate("user", "name profilePic")
      .sort({ createdAt: -1 });

    res.json(reels);

  } catch (err) {
    console.error("REELS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch reels" });
  }
});


// ================= USER POSTS =================
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


// ================= SINGLE POST =================
router.get("/:id", async (req, res) => {
  try {

    const post = await Post.findById(req.params.id)
      .populate("user", "name profilePic")
      .populate("taggedFriends", "name profilePic");

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const comments = await Comment.find({ post: post._id })
      .populate("user", "name profilePic")
      .sort({ createdAt: -1 });

    res.json({
      ...post.toObject(),
      comments,
    });

  } catch (err) {
    console.error("GET POST ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// ================= LIKE =================
router.put("/:postId/like", verifyToken, async (req, res) => {
  try {

    const post = await Post.findById(req.params.postId);

    const liked = post.likes.includes(req.user.id);

    post.likes = liked
      ? post.likes.filter(id => id.toString() !== req.user.id)
      : [...post.likes, req.user.id];

    await post.save();

    res.json({
      likesCount: post.likes.length
    });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});


// ================= COMMENT =================
router.post("/:postId/comment", verifyToken, async (req, res) => {
  try {

    const comment = new Comment({
      post: req.params.postId,
      user: req.user.id,
      text: req.body.text,
    });

    await comment.save();
    await comment.populate("user", "name profilePic");

    io.emit("new-comment", comment);

    res.json({ comment });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});


// ================= SHARE =================
router.post("/:postId/share", verifyToken, async (req, res) => {
  try {

    const post = await Post.findById(req.params.postId);
    post.shares = (post.shares || 0) + 1;

    await post.save();

    res.json({
      shares: post.shares
    });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});


// ================= VIEW =================
router.post("/view/:id", async (req, res) => {
  try {

    await Post.findByIdAndUpdate(req.params.id, {
      $inc: { views: 1 }
    });

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: "View failed" });
  }
});


// ================= DELETE =================
router.delete("/:postId", verifyToken, async (req, res) => {
  try {

    const post = await Post.findById(req.params.postId);

    if (post.user.toString() !== req.user.id) {
      return res.status(403).json({
        error: "Unauthorized"
      });
    }

    await post.deleteOne();

    res.json({
      message: "Deleted"
    });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});


export default router;