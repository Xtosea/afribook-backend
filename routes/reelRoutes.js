import express from "express";
import multer from "multer";
import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { verifyToken } from "../middleware/authMiddleware.js";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import { io } from "../server.js";

const router = express.Router();
const upload = multer({ dest: "/tmp" });

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

// Record a view
router.post("/view/:id", async (req, res) => {
  try {
    await Post.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Upload a new reel
router.post("/upload", verifyToken, upload.single("video"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No video uploaded" });

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
      media: [{ url: `${R2_CUSTOM_DOMAIN}/${fileName}`, type: "video" }],
      isReel: true,
    });

    await reel.populate("user", "name profilePic");

    // Emit new reel to all clients
    io.emit("new-reel", reel);

    res.json(reel);
  } catch (err) {
    console.error("Reel upload error:", err);
    res.status(500).json({ error: "Failed to upload reel" });
  }
});

// Get all reels
router.get("/", async (req, res) => {
  try {
    const reels = await Post.find({ isReel: true })
      .populate("user", "name profilePic")
      .sort({ createdAt: -1 });
    res.json(reels);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch reels" });
  }
});

// Like a reel
router.put("/:id/like", verifyToken, async (req, res) => {
  try {
    const reel = await Post.findById(req.params.id);
    if (!reel) return res.status(404).json({ error: "Reel not found" });

    const liked = reel.likes.includes(req.user._id);
    reel.likes = liked
      ? reel.likes.filter(id => id.toString() !== req.user._id.toString())
      : [...reel.likes, req.user._id];

    await reel.save();

    io.emit("reel-like", { reelId: reel._id, likesCount: reel.likes.length });
    res.json({ likesCount: reel.likes.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Comment on a reel
router.post("/:id/comment", verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    const reel = await Post.findById(req.params.id);
    if (!reel) return res.status(404).json({ error: "Reel not found" });

    const comment = await Comment.create({ post: reel._id, user: req.user._id, text });
    await comment.populate("user", "name profilePic");

    io.emit("reel-comment", { reelId: reel._id, comment });
    res.status(201).json({ comment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Share a reel
router.post("/:id/share", verifyToken, async (req, res) => {
  try {
    const reel = await Post.findById(req.params.id);
    if (!reel) return res.status(404).json({ error: "Reel not found" });

    reel.shares = (reel.shares || 0) + 1;
    await reel.save();

    io.emit("reel-share", { reelId: reel._id, shares: reel.shares });
    res.json({ shares: reel.shares });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;