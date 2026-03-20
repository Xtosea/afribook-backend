import express from "express";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { uploadMedia } from "../middleware/upload.js";
import sharp from "sharp";
import path from "path";
import fs from "fs";

const router = express.Router();
const mediaDir = path.join(process.cwd(), "public/uploads/media");
if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });

const getAbsoluteUrl = (req, relativePath) => {
  return `${req.protocol}://${req.get("host")}${relativePath}`;
};

/* CREATE POST */
router.post("/", verifyToken, uploadMedia.array("media", 5), async (req, res) => {
  try {
    const { content, feeling, location, taggedFriends } = req.body;
    const processedMedia = [];

    if (req.files) {
      for (const file of req.files) {
        const ext = path.extname(file.originalname).toLowerCase();
        const isImage = file.mimetype.startsWith("image/");

        if (isImage) {
          const filename = `resized-${Date.now()}-${file.originalname}`;
          const outputPath = path.join(mediaDir, filename);

          await sharp(file.path)
            .resize(800, 450, { fit: "cover" })
            .toFile(outputPath);

          fs.unlink(file.path, (err) => {
  if (err) console.warn("File delete failed:", err.message);
});

          processedMedia.push({
  url: getAbsoluteUrl(req, `/uploads/media/${filename}`),
  type: file.mimetype
});
        } else {
          processedMedia.push({
  url: getAbsoluteUrl(req, `/uploads/media/${file.filename}`),
  type: file.mimetype
});
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
    });

    await post.save();
    await post.populate([{ path: "user", select: "name profilePic" }, { path: "taggedFriends", select: "name profilePic" }]);
    res.status(201).json({ message: "Post created", post });
  } catch (err) {
    console.error(err);
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


/* GET ALL POSTS */
router.get("/", verifyToken, async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 }).populate("user", "name profilePic").populate("taggedFriends", "name profilePic");
    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* LIKE / UNLIKE POST */
router.put("/:postId/like", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const liked = post.likes.includes(req.user.id);
    if (liked) post.likes = post.likes.filter((id) => id.toString() !== req.user.id);
    else post.likes.push(req.user.id);

    await post.save();
    res.json({ likesCount: post.likes.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ADD COMMENT */
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
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* SHARE POST */
router.put("/:postId/share", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    post.shares = (post.shares || 0) + 1;
    await post.save();
    res.json({ sharesCount: post.shares });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;