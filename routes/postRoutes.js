import express from "express";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import Notification from "../models/Notification.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { redisClient } from "../server.js";
import { io } from "../server.js";

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

    // 🚀 Invalidate cache
    await redisClient.del("posts:*");
    await redisClient.del("reels:*");

    res.status(201).json({ message: "Post created", post });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= GET ALL POSTS (with Redis) ================= */
router.get("/", verifyToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const cacheKey = `posts:page:${page}:limit:${limit}`;

    const cached = await redisClient.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("user", "name profilePic")
      .populate("taggedFriends", "name profilePic")
      .lean();

    await redisClient.set(cacheKey, JSON.stringify(posts), "EX", 30); // cache 30s

    res.json(posts);
  } catch (err) {
    console.error("GET POSTS ERROR:", err);
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

    // Cache invalidation
    await redisClient.del("posts:*");

    // Live notification for like
    if (!liked) {
      const notification = new Notification({
        recipient: post.user,
        sender: req.user.id,
        type: "LIKE",
        post: post._id,
        text: `${req.user.name} liked your post!`,
      });
      await notification.save();
      await notification.populate("sender", "name profilePic");

      io.to(post.user.toString()).emit("new-notification", notification);
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

    // Invalidate cache
    await redisClient.del("posts:*");

    // Live notification for comment
    const notification = new Notification({
      recipient: post.user,
      sender: req.user.id,
      type: "COMMENT",
      post: post._id,
      text: `${req.user.name} commented on your post!`,
    });
    await notification.save();
    await notification.populate("sender", "name profilePic");

    io.to(post.user.toString()).emit("new-notification", notification);

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

    // Invalidate cache
    await redisClient.del("posts:*");

    res.json({ sharesCount: post.shares });
  } catch (err) {
    console.error("SHARE POST ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;