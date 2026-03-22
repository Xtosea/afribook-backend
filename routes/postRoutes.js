// routes/postRoutes.js
import express from "express";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { uploadMediaCloudinaryR2 } from "../middleware/upload.js";

const router = express.Router();

/* ================= CREATE POST ================= */
// Handles images (Cloudinary) and videos (R2)
router.post("/", verifyToken, uploadMediaCloudinaryR2.array("media", 5), async (req, res) => {
  try {
    const { content, feeling, location, taggedFriends } = req.body;
    const processedMedia = [];

    if (req.files) {
      for (const file of req.files) {
        // Each file should have .url and .type from middleware
        processedMedia.push({
          url: file.url,
          type: file.type,
        });
      }
    }

    const post = new Post({
      user: req.user.id,
      content: content || "",
      media: processedMedia,
      feeling: feeling || "",
      location: location || "",
      taggedFriends: taggedFriends ? JSON.parse(taggedFriends) : [],
    });

    await post.save();
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

/* ================= GET POSTS ================= */
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

router.get("/", verifyToken, async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate("user", "name profilePic")
      .populate("taggedFriends", "name profilePic");

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

    const comment = new Comment({ post: post._id, user: req.user.id, text });
    await comment.save();
    await comment.populate("user", "name profilePic");

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