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

/* ================= CREATE POST ================= */

router.post("/", verifyToken, async (req, res) => {
  try {
    const { content, feeling, location, taggedFriends, media } = req.body;

    const post = new Post({
      user: req.user.id,
      content: content || "",
      media: media || [],
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

    res.status(201).json({
      message: "Post created",
      post,
    });

  } catch (err) {
    console.error("CREATE POST ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= UPLOAD VIDEO (R2) ================= */

router.post(
  "/upload",
  verifyToken,
  upload.single("video"),
  async (req, res) => {

console.log("HEADERS:", req.headers);
    try {
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          error: "No video uploaded",
        });
      }




      const fileBuffer = fs.readFileSync(file.path);

      const fileName = `videos/${Date.now()}-${file.originalname}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: fileName,
          Body: fileBuffer,
          ContentType: file.mimetype,
        })
      );

      fs.unlinkSync(file.path);

      const { caption } = req.body;

      const post = await Post.create({
  user: req.user.id, // ✅ CORRECT
        content: caption || "",
        media: [
          {
            url: `${R2_CUSTOM_DOMAIN}/${fileName}`,
            type: "video",
          },
        ],
      });

      await post.populate("user", "name profilePic");

      io.emit("new-post", post);

      res.json({
        success: true,
        post,
        media: post.media,
      });

    } catch (err) {
      console.error("Video Upload Error:", err);
      res.status(500).json({
        error: "Failed to upload video",
      });
    }
  }
);

/* ================= UPLOAD REEL ================= */

router.post(
  "/reels/upload",
  verifyToken,
  upload.single("video"),
  async (req, res) => {
    try {

   console.log("USER:", req.user);
console.log("FILE:", req.file);
console.log("ENV:", {
  R2_BUCKET_NAME,
  R2_ENDPOINT,
});
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          error: "No video uploaded",
        });
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

      const { caption } = req.body;

      const reel = await Post.create({
        user: req.user._id,
        content: caption || "",
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
      console.error("Reel Upload Error:", err);
      res.status(500).json({
  error: err.message,
  stack: err.stack, // 👈 temporary for debugging
});
    }
  }
);

router.get("/user/:userId", verifyToken, async (req, res) => {
  try {
    const posts = await Post.find({ user: req.params.userId })
      .populate("user", "name profilePic")
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
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

/* ================= GET REELS ================= */

router.get("/reels", async (req, res) => {
  try {

    const reels = await Post.find({
      isReel: true,
    })
      .populate("user", "name profilePic")
      .sort({ createdAt: -1 });

    res.json(reels);

  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch reels",
    });
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

    res.json({
      likesCount: post.likes.length,
    });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= COMMENT ================= */

router.post("/:postId/comment", verifyToken, async (req, res) => {
  try {

    const { text } = req.body;

    const comment = new Comment({
      post: req.params.postId,
      user: req.user.id,
      text,
    });

    await comment.save();
    await comment.populate("user", "name profilePic");

    io.emit("new-comment", comment);

    res.status(201).json({
      comment,
    });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= DELETE ================= */

router.delete("/:postId", verifyToken, async (req, res) => {
  try {

    const post = await Post.findById(req.params.postId);

    if (post.user.toString() !== req.user.id) {
      return res.status(403).json({
        error: "Unauthorized",
      });
    }

    await post.deleteOne();

    res.json({
      message: "Post deleted",
    });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/:id/share", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    // duplicate the post for the current user
    const sharedPost = new Post({
      content: post.content,
      media: post.media,
      user: req.user.id,
    });

    await sharedPost.save();
    res.json({ post: sharedPost });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Share failed" });
  }
});

export default router;