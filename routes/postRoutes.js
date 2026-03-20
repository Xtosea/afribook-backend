import express from "express";
import Post from "../models/Post.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { uploadMedia } from "../middleware/upload.js";
import Comment from "../models/Comment.js";
import sharp from "sharp";
import path from "path";
import fs from "fs";

const router = express.Router();

/* ================= UTILS ================= */
const mediaDir = path.join(process.cwd(), "public/uploads/media");
if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });

const getAbsoluteUrl = (relativePath) => `${process.env.API_BASE}${relativePath}`;

/* ================= CREATE POST ================= */
router.post("/", verifyToken, uploadMedia.array("media", 5), async (req, res) => {
  try {
    const { content, feeling, location, taggedFriends } = req.body;
    const processedMedia = [];

    if (req.files) {
      for (const file of req.files) {
        const isImage = file.mimetype.startsWith("image/");
        const filename = `resized-${Date.now()}-${file.originalname}`;
        const outputPath = path.join(mediaDir, filename);

        if (isImage) {
          await sharp(file.path)
            .resize(800, 450, { fit: "cover" })
            .toFile(outputPath);
          fs.unlinkSync(file.path);
          processedMedia.push({ url: getAbsoluteUrl(`/uploads/media/${filename}`), type: file.mimetype });
        } else {
          processedMedia.push({ url: getAbsoluteUrl(`/uploads/media/${file.filename}`), type: file.mimetype });
        }
      }
    }

    const post = new Post({
      user: req.user.id,
      content: content || "",
      media: processedMedia,
      feeling: feeling || "",
      location: location || "",
      taggedFriends: taggedFriends ? JSON.parse(taggedFriends) : [],
      likes: [],
      shares: [],
      comments: [],
    });

    await post.save();
    await post.populate([{ path: "user", select: "name profilePic" }]);

    if (post.user.profilePic && !post.user.profilePic.startsWith("http")) {
      post.user.profilePic = getAbsoluteUrl(post.user.profilePic);
    }

    res.status(201).json({ message: "Post created", post });
  } catch (err) {
    console.error("CREATE POST ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= GET POSTS ================= */
router.get("/", verifyToken, async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate("user", "name profilePic")
      .populate("taggedFriends", "name profilePic")
      .populate({
        path: "comments",
        populate: { path: "user", select: "name profilePic" },
      });

    posts.forEach(p => {
      if (p.user.profilePic && !p.user.profilePic.startsWith("http")) p.user.profilePic = getAbsoluteUrl(p.user.profilePic);
      p.media.forEach(m => { if (!m.url.startsWith("http")) m.url = getAbsoluteUrl(m.url); });
      p.taggedFriends.forEach(f => { if (f.profilePic && !f.profilePic.startsWith("http")) f.profilePic = getAbsoluteUrl(f.profilePic); });
    });

    res.json(posts);
  } catch (err) {
    console.error("GET POSTS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= LIKE / UNLIKE POST ================= */
router.put("/:postId/like", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const liked = post.likes.includes(req.user.id);
    if (liked) post.likes = post.likes.filter(id => id.toString() !== req.user.id);
    else post.likes.push(req.user.id);

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
    if (!text) return res.status(400).json({ error: "Comment cannot be empty" });

    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const comment = new Comment({ post: post._id, user: req.user.id, text });
    await comment.save();

    post.comments.push(comment._id);
    await post.save();

    await comment.populate("user", "name profilePic");
    res.status(201).json({ message: "Comment added", comment });
  } catch (err) {
    console.error("COMMENT ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= SHARE POST ================= */
router.post("/:postId/share", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    if (!post.shares.includes(req.user.id)) post.shares.push(req.user.id);
    await post.save();

    res.json({ message: "Post shared", sharesCount: post.shares.length });
  } catch (err) {
    console.error("SHARE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;