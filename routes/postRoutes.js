import express from "express";
import Post from "../models/Post.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { uploadMedia } from "../middleware/upload.js"; // centralized multer
import sharp from "sharp";
import path from "path";
import fs from "fs";

const router = express.Router();

/* ================= UTILS ================= */
const mediaDir = path.join(process.cwd(), "public/uploads/media");

// Make sure media folder exists
if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });

const getAbsoluteUrl = (relativePath) => {
  return `${process.env.API_BASE}${relativePath}`;
};

/* ================= CREATE POST ================= */
router.post("/", verifyToken, uploadMedia.array("media", 5), async (req, res) => {
  try {
    const { content, feeling, location, taggedFriends } = req.body;

    const processedMedia = [];

    if (req.files) {
      for (const file of req.files) {
        const ext = path.extname(file.originalname).toLowerCase();
        const isImage = file.mimetype.startsWith("image/");

        if (isImage) {
          // Landscape resizing with sharp
          const filename = `resized-${Date.now()}-${file.originalname}`;
          const outputPath = path.join(mediaDir, filename);

          await sharp(file.path)
            .resize(800, 450, { fit: "cover" }) // 16:9 landscape
            .toFile(outputPath);

          // Delete original upload
          fs.unlinkSync(file.path);

          processedMedia.push({ url: getAbsoluteUrl(`/uploads/media/${filename}`), type: file.mimetype });
        } else {
          // Keep videos as is
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
    });

    await post.save();

    // Populate user and tagged friends
    await post.populate([
      { path: "user", select: "name profilePic" },
      { path: "taggedFriends", select: "name profilePic" },
    ]);

    // Absolute URLs for profile pics
    if (post.user.profilePic && !post.user.profilePic.startsWith("http")) {
      post.user.profilePic = getAbsoluteUrl(post.user.profilePic);
    }
    post.taggedFriends.forEach((f) => {
      if (f.profilePic && !f.profilePic.startsWith("http")) {
        f.profilePic = getAbsoluteUrl(f.profilePic);
      }
    });

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

    // Convert relative URLs to absolute
    posts.forEach((p) => {
      if (p.user.profilePic && !p.user.profilePic.startsWith("http")) {
        p.user.profilePic = getAbsoluteUrl(p.user.profilePic);
      }
      p.media.forEach((m) => {
        if (!m.url.startsWith("http")) m.url = getAbsoluteUrl(m.url);
      });
      p.taggedFriends.forEach((f) => {
        if (f.profilePic && !f.profilePic.startsWith("http")) {
          f.profilePic = getAbsoluteUrl(f.profilePic);
        }
      });
    });

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

    // Convert relative URLs to absolute
    posts.forEach((p) => {
      if (p.user.profilePic && !p.user.profilePic.startsWith("http")) {
        p.user.profilePic = getAbsoluteUrl(p.user.profilePic);
      }
      p.media.forEach((m) => {
        if (!m.url.startsWith("http")) m.url = getAbsoluteUrl(m.url);
      });
      p.taggedFriends.forEach((f) => {
        if (f.profilePic && !f.profilePic.startsWith("http")) {
          f.profilePic = getAbsoluteUrl(f.profilePic);
        }
      });
    });

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