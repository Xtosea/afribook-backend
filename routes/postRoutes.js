import express from "express";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import Notification from "../models/Notification.js";// routes/postRoutes.js
import express from "express";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import Notification from "../models/Notification.js";
import { verifyToken } from "../middleware/authMiddleware.js";
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

    // Redis removed
    // await redisClient.del("posts:*");

    res.status(201).json({ message: "Post created", post });
  } catch (err) {
    console.error("CREATE POST ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= GET USER POSTS ================= */
router.get("/user/:userId", verifyToken, async (req, res) => {
  try {
    const posts = await Post.find({ user: req.params.userId })
      .sort({ createdAt: -1 })
      .populate("user", "name profilePic")
      .populate("taggedFriends", "name profilePic");

    res.json(posts);
  } catch (err) {
    console.error("GET USER POSTS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= GET ALL POSTS ================= */
router.get("/", verifyToken, async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate("user", "name profilePic")
      .populate("taggedFriends", "name profilePic")
      .populate("comments.user", "name profilePic"); // 🔥 keep comment user populated

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
    if (!post) return res.status(404).json({ error: "Post not found" });

    const liked = post.likes.includes(req.user.id);

    post.likes = liked
      ? post.likes.filter(id => id.toString() !== req.user.id)
      : [...post.likes, req.user.id];

    await post.save();

    // Redis removed
    // await redisClient.del("posts:*");

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
    console.error("LIKE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= COMMENT ================= */
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

    // Redis removed
    // await redisClient.del("posts:*");

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
    console.error("COMMENT ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
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

    await redisClient.del("posts:*");

    res.status(201).json({ message: "Post created", post });
  } catch (err) {
    console.error("CREATE POST ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= GET USER POSTS ================= */
router.get("/user/:userId", verifyToken, async (req, res) => {
  try {
    const posts = await Post.find({ user: req.params.userId })
      .sort({ createdAt: -1 })
      .populate("user", "name profilePic")
      .populate("taggedFriends", "name profilePic");

    res.json(posts);
  } catch (err) {
    console.error("GET USER POSTS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= GET ALL POSTS ================= */
router.get("/", verifyToken, async (req, res) => {
  try {

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate("user", "name profilePic")
      .populate("taggedFriends", "name profilePic")
      .populate("comments.user", "name profilePic")   // 🔥 IMPORTANT

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
    if (!post) return res.status(404).json({ error: "Post not found" });

    const liked = post.likes.includes(req.user.id);

    post.likes = liked
      ? post.likes.filter(id => id.toString() !== req.user.id)
      : [...post.likes, req.user.id];

    await post.save();
    await redisClient.del("posts:*");

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
    console.error("LIKE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= COMMENT ================= */
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

    await redisClient.del("posts:*");

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
    console.error("COMMENT ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;