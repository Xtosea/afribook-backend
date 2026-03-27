import express from "express";
import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { verifyToken } from "../middleware/authMiddleware.js";
import Post from "../models/Post.js";
import { io } from "../server.js";

const router = express.Router();

// Use memory storage to avoid disk issues on Render
const upload = multer({ storage: multer.memoryStorage() });

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

// Upload a new reel
router.post("/upload", verifyToken, upload.single("video"), async (req, res) => {
  try {
    console.log("Incoming upload request");
    console.log("User:", req.user);
    console.log("File:", req.file);

    if (!req.file) {
      return res.status(400).json({ error: "No video uploaded" });
    }

    const fileBuffer = req.file.buffer; // memoryStorage buffer
    const fileName = `reels/${Date.now()}-${req.file.originalname}`;

    // Upload to Cloudflare R2
    await s3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: fileName,
        Body: fileBuffer,
        ContentType: req.file.mimetype,
      })
    );

    const { caption } = req.body;

    // Create reel in DB
    const reel = await Post.create({
      user: req.user._id,
      content: caption || "",
      media: [{ url: `${R2_CUSTOM_DOMAIN}/${fileName}`, type: "video" }],
      isReel: true,
    });

    await reel.populate("user", "name profilePic");

    // Emit new reel to all connected clients
    io.emit("new-reel", reel);

    res.status(201).json(reel);
  } catch (err) {
    console.error("Reel upload error:", err);
    res.status(500).json({ error: err.message || "Failed to upload reel" });
  }
});

// Get all reels
router.get("/", async (req, res) => {
  try {
    const reels = await Post.find({ isReel: true })
      .populate("user", "name profilePic")
      .sort({ createdAt: -1 });

    if (!reels || reels.length === 0) {
      return res.json([]); // Return empty array if no reels
    }

    // Ensure every reel has full media URLs
    const formattedReels = reels.map(reel => {
      const media = reel.media.map(m => ({
        type: m.type,
        url: m.url.startsWith("http") ? m.url : `${process.env.R2_CUSTOM_DOMAIN}/${m.url}`,
      }));
      return {
        ...reel.toObject(),
        media,
      };
    });

    res.json(formattedReels);
  } catch (err) {
    console.error("Failed to fetch reels:", err);
    res.status(500).json({ error: "Failed to fetch reels" });
  }
});

export default router;