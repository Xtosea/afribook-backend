import express from "express";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import Notification from "../models/Notification.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

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

    res.status(201).json({ message: "Post created", post });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= GET USER POSTS ================= */
router.get("/user/:userId", verifyToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;

    const posts = await Post.find({ user: req.params.userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("user", "name profilePic")
      .populate("taggedFriends", "name profilePic")
      .lean();

    res.json(posts);
  } catch (err) {
    console.error("GET USER POSTS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= GET ALL POSTS ================= */
router.get("/", verifyToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("user", "name profilePic")
      .populate("taggedFriends", "name profilePic")
      .lean();

    res.json(posts);
  } catch (err) {
    console.error("GET ALL POSTS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= LIKE / UNLIKE ================= */
router.put("/:postId/like", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const liked = post.likes.includes(req.user.id);

    post.likes = liked
      ? post.likes.filter((id) => id.toString() !== req.user.id)
      : [...post.likes, req.user.id];

    await post.save();

    // 🔔 CREATE NOTIFICATION
    if (!liked && post.user.toString() !== req.user.id) {
      const notification = await Notification.create({
        recipient: post.user,
        sender: req.user.id,
        type: "LIKE",
        post: post._id,
        text: "liked your post",
      });
      global.io.to(post.user.toString()).emit("notification", notification);
    }

    res.json({ likesCount: post.likes.length });
  } catch (err) {
    console.error("LIKE POST ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= ADD COMMENT ================= */
router.post("/:postId/comment", verifyToken, async (req, res) => {
  try {
    const { text } = req.body;

    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const comment = new Comment({
      post: post._id,
      user: req.user.id,
      text,
    });

    await comment.save();
    await comment.populate("user", "name profilePic");

    // 🔔 NOTIFICATION
    if (post.user.toString() !== req.user.id) {
      const notification = await Notification.create({
        recipient: post.user,
        sender: req.user.id,
        type: "COMMENT",
        post: post._id,
        text: "commented on your post",
      });
      global.io.to(post.user.toString()).emit("notification", notification);
    }

    res.status(201).json({ comment });
  } catch (err) {
    console.error("ADD COMMENT ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= SHARE POST ================= */
router.put("/:postId/share", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    post.shares = (post.shares || 0) + 1;
    await post.save();

    res.json({ sharesCount: post.shares });
  } catch (err) {
    console.error("SHARE POST ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;