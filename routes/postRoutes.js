import express from "express";
import Post from "../models/Post.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { uploadMedia } from "../middleware/upload.js"; // centralized multer for media

const router = express.Router();

/* ================= CREATE POST ================= */
router.post("/", verifyToken, uploadMedia.array("media", 5), async (req, res) => {
  try {
    const { content, feeling, location, taggedFriends } = req.body;

    // Map uploaded files to media array
    const media = req.files
      ? req.files.map((file) => ({
          url: `/uploads/media/${file.filename}`, // relative URL
          type: file.mimetype,
        }))
      : [];

    const post = new Post({
      user: req.user.id,
      content: content || "",
      media,
      feeling: feeling || "",
      location: location || "",
      taggedFriends: taggedFriends ? JSON.parse(taggedFriends) : [],
    });

    await post.save();

    // Populate user and tagged friends
    await post.populate([
      { path: "user", select: "name profilePic" },
      { path: "taggedFriends", select: "name profilePic" },
    ]);

    res.status(201).json({ message: "Post created", post });
  } catch (err) {
    console.error("CREATE POST ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= GET ALL POSTS ================= */
router.get("/", verifyToken, async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate("user", "name profilePic")
      .populate("taggedFriends", "name profilePic");

    res.json(posts);
  } catch (err) {
    console.error("GET POSTS ERROR:", err);
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

/* ================= LIKE / UNLIKE POST ================= */
router.put("/:postId/like", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const liked = post.likes.includes(req.user.id);

    if (liked) {
      post.likes = post.likes.filter((id) => id.toString() !== req.user.id);
    } else {
      post.likes.push(req.user.id);
    }

    await post.save();
    res.json({ likesCount: post.likes.length });
  } catch (err) {
    console.error("LIKE POST ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;