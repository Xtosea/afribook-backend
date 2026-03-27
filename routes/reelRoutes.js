import express from "express";
import multer from "multer";
import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { verifyToken } from "../middleware/authMiddleware.js";
import Post from "../models/Post.js";
import { io } from "../server.js";
import Comment from "../models/Comment.js";
import Notification from "../models/Notification.js";


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

router.post("/view/:id", async (req, res) => {

  await Post.findByIdAndUpdate(
    req.params.id,
    { $inc: { views: 1 } }
  );

  res.json({ success: true });

});

/* Upload Reel */
router.post("/upload", verifyToken, upload.single("video"), async (req, res) => {
  try {

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No video uploaded" });
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
      user: req.user._id,
      content: "",
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
    console.error("Reel upload error:", err);
    res.status(500).json({ error: "Failed to upload reel" });
  }
});

// GET all reels
router.get("/", async (req, res) => {
  try {
    const reels = await Post.find({ isReel: true })
      .populate("user", "name profilePic")
      .sort({ createdAt: -1 }); // latest first
    res.json(reels);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch reels" });
  }
});

// ================== COMMENT ==================
// Add below your existing routes
router.post("/:id/comment", verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    const reel = await Post.findById(req.params.id);
    if (!reel) return res.status(404).json({ error: "Reel not found" });

    const comment = new Comment({
      post: reel._id,
      user: req.user._id,
      text,
    });

    await comment.save();
    await comment.populate("user", "name profilePic");

    // Notify reel owner
    if (reel.user.toString() !== req.user._id.toString()) {
      const notification = new Notification({
        recipient: reel.user,
        sender: req.user._id,
        type: "COMMENT",
        post: reel._id,
        text: `${req.user.name} commented on your reel!`,
      });
      await notification.save();
      io.to(reel.user.toString()).emit("new-notification", notification);
    }

    res.status(201).json({ comment });
  } catch (err) {
    console.error("COMMENT ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================== SHARE ==================
router.post("/:id/share", verifyToken, async (req, res) => {
  try {
    const reel = await Post.findById(req.params.id);
    if (!reel) return res.status(404).json({ error: "Reel not found" });

    reel.shares = (reel.shares || 0) + 1;
    await reel.save();

    res.json({ shares: reel.shares });
  } catch (err) {
    console.error("SHARE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;