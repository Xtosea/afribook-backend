import express from "express";
import multer from "multer";
import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

import Post from "../models/Post.js";
import Notification from "../models/Notification.js";
import { addPoints } from "../utils/addPoints.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { io } from "../server.js";

const router = express.Router();

const upload = multer({ dest: "/tmp" });

/* ================= R2 CONFIG ================= */

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

/* ================= HELPERS ================= */

const notify = async (data) => {
  try {
    const notification = await Notification.create(data);

    const populated = await notification.populate(
      "sender",
      "name profilePic"
    );

    io.to(data.recipient.toString()).emit(
      "new-notification",
      populated
    );

    return populated;
  } catch (err) {
    console.error("NOTIFICATION ERROR:", err);
  }
};

/* ================= SHARE TO FEED ================= */

const sharePostToFeed = async (req, res) => {
  try {
    const originalPost = await Post.findById(req.params.id);

    if (!originalPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    const newPost = await Post.create({
      user: req.user.id,
      content: `🔁 Shared: ${originalPost.content || ""}`,
      media: originalPost.media,
      sharedFrom: originalPost._id,
    });

    await newPost.populate("user", "name profilePic");

    io.emit("new-post", newPost);

    res.json({ post: newPost });
  } catch (err) {
    console.error("SHARE ERROR:", err);
    res.status(500).json({ message: "Share failed" });
  }
};

/* ================= CREATE POST ================= */

router.post("/", verifyToken, async (req, res) => {
  try {
    const post = await Post.create({
      user: req.user.id,
      content: req.body.content || "",
      media: req.body.media || [],
      feeling: req.body.feeling || "",
      location: req.body.location || "",
      taggedFriends: req.body.taggedFriends || [],
      textColor: req.body.textColor || "#000000",
      backgroundStyle: req.body.backgroundStyle || "bg-white",
      fontStyle: req.body.fontStyle || "font-sans",
    });

    await post.populate([
      { path: "user", select: "name profilePic" },
      { path: "taggedFriends", select: "name profilePic" },
    ]);

    io.emit("new-post", post);

    res.status(201).json({ success: true, post });
  } catch (err) {
    console.error("CREATE POST ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= VIDEO UPLOAD ================= */

router.post(
  "/upload",
  verifyToken,
  upload.single("video"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No video uploaded" });
      }

      const fileBuffer = fs.readFileSync(req.file.path);

      const fileName = `videos/${Date.now()}-${req.file.originalname}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: fileName,
          Body: fileBuffer,
          ContentType: req.file.mimetype,
        })
      );

      fs.unlinkSync(req.file.path);

      const post = await Post.create({
        user: req.user.id,
        content: req.body.caption || "",
        media: [
          {
            url: `${R2_CUSTOM_DOMAIN}/${fileName}`,
            type: "video",
          },
        ],
      });

      await post.populate("user", "name profilePic");

      io.emit("new-post", post);

      res.json({ success: true, post });
    } catch (err) {
      console.error("UPLOAD ERROR:", err);
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

/* ================= REELS ================= */

router.post("/reels", verifyToken, async (req, res) => {
  try {
    const reel = await Post.create({
      user: req.user.id,
      content: req.body.caption || "",
      isReel: true,
      media: [
        {
          url: req.body.videoUrl,
          type: "video",
        },
      ],
    });

    await reel.populate("user", "name profilePic");

    io.emit("new-reel", reel);

    res.status(201).json(reel);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= REEL VIEW ================= */

router.post("/reels/view/:id", verifyToken, async (req, res) => {
  try {
    const reel = await Post.findById(req.params.id);

    if (!reel) return res.status(404).json({ error: "Reel not found" });

    reel.viewedBy = reel.viewedBy || [];

    const already = reel.viewedBy.some(
      (id) => id.toString() === req.user.id
    );

    if (!already) {
      reel.viewedBy.push(req.user.id);
      reel.viewsCount = (reel.viewsCount || 0) + 1;

      await addPoints(reel.user, 1, "reel_view");

      await reel.save();

      io.emit("reel-view", {
        reelId: reel._id,
        views: reel.viewsCount,
      });
    }

    res.json({ success: true, views: reel.viewsCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= LIKE ================= */

router.post("/:id/like", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const liked = post.likes.includes(req.user.id);

    if (liked) {
      post.likes = post.likes.filter(
        (id) => id.toString() !== req.user.id
      );
    } else {
      post.likes.push(req.user.id);

      if (post.isReel) {
        await addPoints(post.user, 3, "reel_like");
      } else {
        await addPoints(post.user, 2, "video_like");
      }

      if (post.user.toString() !== req.user.id) {
        await notify({
          recipient: post.user,
          sender: req.user.id,
          type: "LIKE",
          post: post._id,
          text: "liked your post",
        });
      }
    }

    await post.save();

    io.emit("post-liked", {
      postId: post._id,
      likes: post.likes,
    });

    res.json({ likes: post.likes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= SHARE / SAVE / DELETE / GET ================= */

router.post("/:id/share", verifyToken, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });

  post.shares = (post.shares || 0) + 1;
  await post.save();

  io.emit("post-shared", { postId: post._id, shares: post.shares });

  res.json({ shares: post.shares });
});

router.put("/:id/save", verifyToken, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });

  post.savedBy = post.savedBy || [];

  const saved = post.savedBy.includes(req.user.id);

  post.savedBy = saved
    ? post.savedBy.filter((id) => id.toString() !== req.user.id)
    : [...post.savedBy, req.user.id];

  await post.save();

  res.json({ success: true, saved: !saved });
});

router.delete("/:id", verifyToken, async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) return res.status(404).json({ error: "Post not found" });

  if (post.user.toString() !== req.user.id) {
    return res.status(403).json({ error: "Not authorized" });
  }

  await Post.findByIdAndDelete(req.params.id);

  io.emit("post-deleted", { postId: req.params.id });

  res.json({ success: true });
});

/* ================= SHARE TO FEED ================= */

router.post("/:id/share-to-feed", verifyToken, sharePostToFeed);

export default router;