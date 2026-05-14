import express from "express";
import multer from "multer";
import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import Notification from "../models/Notification.js";

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

    io.emit("new-post", post);

    res.status(201).json({
      message: "Post created",
      post,
    });

  } catch (err) {
    console.error("CREATE POST ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= UPLOAD VIDEO (R2) ================= */

router.post(
  "/upload",
  verifyToken,
  upload.single("video"),
  async (req, res) => {

console.log("HEADERS:", req.headers);
    try {
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          error: "No video uploaded",
        });
      }




      const fileBuffer = fs.readFileSync(file.path);

      const fileName = `videos/${Date.now()}-${file.originalname}`;

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

      const post = await Post.create({
  user: req.user.id, // ✅ CORRECT
        content: caption || "",
        media: [
          {
            url: `${R2_CUSTOM_DOMAIN}/${fileName}`,
            type: "video",
          },
        ],
      });

      await post.populate("user", "name profilePic");

      io.emit("new-post", post);

      res.json({
        success: true,
        post,
        media: post.media,
      });

    } catch (err) {
      console.error("Video Upload Error:", err);
      res.status(500).json({
        error: "Failed to upload video",
      });
    }
  }
);


/* ================= UPLOAD REEL ================= */

router.post("/reels", verifyToken, async (req, res) => {
  try {

    const { caption, videoUrl } = req.body;

    if (!videoUrl) {
      return res.status(400).json({
        error: "Video URL missing",
      });
    }

    const reel = await Post.create({
      user: req.user.id,
      content: caption || "",
      isReel: true,

      media: [
        {
          url: videoUrl,
          type: "video",
        },
      ],
    });

    await reel.populate("user", "name profilePic");

    io.emit("new-reel", reel);

    res.status(201).json(reel);

  } catch (err) {

    console.error("CREATE REEL ERROR:", err);

    res.status(500).json({
      error: err.message,
    });
  }
});

router.get("/user/:userId", verifyToken, async (req, res) => {
  try {
    const posts = await Post.find({ user: req.params.userId })
      .populate("user", "name profilePic")
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});



/* ================= GET ALL POSTS ================= */

router.get("/", verifyToken, async (req, res) => {
  try {

    let posts = await Post.find()
      .populate("user", "name profilePic")
      .populate("taggedFriends", "name profilePic")
      .populate("comments.user", "name profilePic")
      .sort({ createdAt: -1 });

    posts = posts.sort((a, b) => {

      const scoreA =
        (a.likes?.length || 0) * 3 +
        (a.comments?.length || 0) * 2 +
        (a.views || 0);

      const scoreB =
        (b.likes?.length || 0) * 3 +
        (b.comments?.length || 0) * 2 +
        (b.views || 0);

      return scoreB - scoreA;

    });

    res.json(posts);

  } catch (err) {
    console.error("GET POSTS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= GET REELS ================= */

router.get("/reels", async (req, res) => {
  try {

    const reels = await Post.find({
      isReel: true,
    })
      .populate("user", "name profilePic")
      .sort({ createdAt: -1 });

    res.json(reels);

  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch reels",
    });
  }
});


/* ================= LIKE ================= */

router.put("/:id/like", verifyToken, async (req, res) => {
  try {

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        error: "Post not found",
      });
    }

    const alreadyLiked = post.likes.some(
      (id) => id.toString() === req.user.id
    );

    if (alreadyLiked) {

      post.likes = post.likes.filter(
        (id) => id.toString() !== req.user.id
      );

    } else {

      post.likes.push(req.user.id);

    }

    await post.save();

    io.emit("post-liked", {
      postId: post._id,
      likes: post.likes.length,
    });

    res.json({
      likes: post.likes,
      likesCount: post.likes.length,
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message,
    });

  }
});


/* ================= COMMENT ================= */
router.post("/:id/comment", verifyToken, async (req, res) => {
  try {

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        error: "Post not found",
      });
    }

    const comment = {
      user: req.user.id,
      text: req.body.text,
    };

    post.comments.push(comment);

    await post.save();

    await post.populate(
      "comments.user",
      "name profilePic"
    );

    io.emit("new-comment", {
      postId: post._id,
      comments: post.comments,
    });

    res.json({
      comments: post.comments,
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message,
    });

  }
});

/* ================= DELETE ================= */

router.delete("/:postId", verifyToken, async (req, res) => {
  try {

    const post = await Post.findById(req.params.postId);

    if (post.user.toString() !== req.user.id) {
      return res.status(403).json({
        error: "Unauthorized",
      });
    }

    await post.deleteOne();

    res.json({
      message: "Post deleted",
    });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});


/* ================= Share ================= */

router.post("/:id/share", verifyToken, async (req, res) => {
  try {

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        error: "Post not found",
      });
    }

    post.shares = (post.shares || 0) + 1;

    await post.save();

    io.emit("post-shared", {
      postId: post._id,
      shares: post.shares,
    });

    res.json({
      shares: post.shares,
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message,
    });

  }
});

/* ================= RECORD REEL VIEW ================= */

router.post("/reels/view/:id", async (req, res) => {
  try {

    const reel = await Post.findById(req.params.id);

    if (!reel) {
      return res.status(404).json({
        error: "Reel not found",
      });
    }

    // Increase views
    reel.views = (reel.views || 0) + 1;

    await reel.save();

    // Optional realtime socket update
    io.emit("reel-view", {
      reelId: reel._id,
      views: reel.views,
    });

    res.json({
      success: true,
      views: reel.views,
    });

  } catch (err) {

    console.error("REEL VIEW ERROR:", err);

    res.status(500).json({
      error: err.message,
    });

  }
});


/* ================= GET SINGLE POST ================= */

router.get("/:id", async (req, res) => {
  try {

    const post = await Post.findById(req.params.id)
      .populate("user", "name profilePic")
      .populate("taggedFriends", "name profilePic")
      .populate("comments.user", "name profilePic");

    if (!post) {
      return res.status(404).json({
        error: "Post not found",
      });
    }

    res.json(post);

  } catch (err) {

    console.error("GET SINGLE POST ERROR:", err);

    res.status(500).json({
      error: "Server error",
    });

  }
});


router.get("/reels", async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 5;

    const reels = await Post.find({
      isReel: true,
    })
      .populate("user", "name profilePic")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json(reels);

  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});


router.put("/:id/save", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post.savedBy) {
      post.savedBy = [];
    }

    const alreadySaved = post.savedBy.includes(req.user.id);

    if (alreadySaved) {
      post.savedBy = post.savedBy.filter(
        (id) => id.toString() !== req.user.id
      );
    } else {
      post.savedBy.push(req.user.id);
    }

    await post.save();

    res.json({
      savedBy: post.savedBy,
    });

  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

export default router;