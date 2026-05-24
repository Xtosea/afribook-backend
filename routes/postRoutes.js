import express from "express";
import multer from "multer";
import fs from "fs";
import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

import Post from "../models/Post.js";
import Report from "../models/Report.js";
import Notification from "../models/Notification.js";

import { verifyToken } from "../middleware/authMiddleware.js";
import { io } from "../server.js";

const router = express.Router();

const upload = multer({
  dest: "/tmp",
});

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
    const {
      content,
      feeling,
      location,
      taggedFriends,
      media,
      textColor,
      backgroundStyle,
      fontStyle,
    } = req.body;

    const post = await Post.create({
      user: req.user.id,

      content: content || "",

      media: media || [],

      feeling: feeling || "",

      location: location || "",

      taggedFriends: taggedFriends || [],

      textColor: textColor || "#000000",

      backgroundStyle:
        backgroundStyle || "bg-white",

      fontStyle: fontStyle || "font-sans",
    });

    await post.populate([
      {
        path: "user",
        select: "name profilePic",
      },
      {
        path: "taggedFriends",
        select: "name profilePic",
      },
    ]);

    io.emit("new-post", post);

    res.status(201).json({
      success: true,
      post,
    });

  } catch (err) {
    console.error("CREATE POST ERROR:", err);

    res.status(500).json({
      error: "Server error",
    });
  }
});

/* ================= VIDEO UPLOAD ================= */

router.post(
  "/upload",
  verifyToken,
  upload.single("video"),
  async (req, res) => {
    try {
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          error: "No video uploaded",
        });
      }

      const fileBuffer = fs.readFileSync(
        file.path
      );

      const fileName = `videos/${Date.now()}-${
        file.originalname
      }`;

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
        user: req.user.id,

        content: caption || "",

        media: [
          {
            url: `${R2_CUSTOM_DOMAIN}/${fileName}`,
            type: "video",
          },
        ],
      });

      await post.populate(
        "user",
        "name profilePic"
      );

      io.emit("new-post", post);

      res.json({
        success: true,
        post,
      });

    } catch (err) {
      console.error(
        "UPLOAD VIDEO ERROR:",
        err
      );

      res.status(500).json({
        error: "Failed to upload video",
      });
    }
  }
);

/* ================= CREATE REEL ================= */

router.post(
  "/reels",
  verifyToken,
  async (req, res) => {
    try {
      const { caption, videoUrl } =
        req.body;

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

      await reel.populate(
        "user",
        "name profilePic"
      );

      io.emit("new-reel", reel);

      res.status(201).json(reel);

    } catch (err) {
      console.error(
        "CREATE REEL ERROR:",
        err
      );

      res.status(500).json({
        error: err.message,
      });
    }
  }
);

/* ================= GET REELS ================= */

router.get("/reels", async (req, res) => {
  try {

    const page =
      Number(req.query.page) || 1;

    const limit = 5;

    const reels = await Post.find({
      isReel: true,
    })

      .populate(
        "user",
        "name profilePic"
      )

      .populate(
        "viewedBy",
        "name profilePic"
      )

      .sort({ createdAt: -1 })

      .skip((page - 1) * limit)

      .limit(limit);

    res.json(reels);

  } catch (err) {

    console.error(
      "GET REELS ERROR:",
      err
    );

    res.status(500).json({
      error: err.message,
    });
  }
});

/* ================= RECORD REEL VIEW ================= */

router.post(
  "/reels/view/:id",
  verifyToken,
  async (req, res) => {
    try {
      const reel =
        await Post.findById(
          req.params.id
        );

      if (!reel) {
        return res.status(404).json({
          error: "Reel not found",
        });
      }

      if (!reel.viewedBy) {
        reel.viewedBy = [];
      }

      const alreadyViewed =
        reel.viewedBy.some(
          (id) =>
            id.toString() ===
            req.user.id
        );

      if (!alreadyViewed) {
        reel.viewedBy.push(
          req.user.id
        );

        reel.viewsCount =
          (reel.viewsCount || 0) + 1;

        await reel.save();

        io.emit("reel-view", {
          reelId: reel._id,
          views: reel.viewsCount,
        });
      }

      res.json({
        success: true,
        views: reel.viewsCount,
      });

    } catch (err) {
      console.error(
        "REEL VIEW ERROR:",
        err
      );

      res.status(500).json({
        error: err.message,
      });
    }
  }
);

/* ================= GET USER POSTS ================= */

router.get(
  "/user/:userId",
  verifyToken,
  async (req, res) => {
    try {
      const posts = await Post.find({
        user: req.params.userId,
      })
        .populate(
          "user",
          "name profilePic"
        )
        .sort({ createdAt: -1 });

      res.json(posts);

    } catch (err) {
      res.status(500).json({
        error: "Server error",
      });
    }
  }
);

/* ================= GET ALL POSTS ================= */

router.get("/", verifyToken, async (req, res) => {
  try {
    let posts = await Post.find()
      .populate("user", "name profilePic")
      .populate(
        "taggedFriends",
        "name profilePic"
      )
      .populate(
        "comments.user",
        "name profilePic"
      )
      .sort({ createdAt: -1 });

    posts = posts.sort((a, b) => {
      const scoreA =
        (a.likes?.length || 0) * 3 +
        (a.comments?.length || 0) * 2 +
        (a.viewsCount || 0);

      const scoreB =
        (b.likes?.length || 0) * 3 +
        (b.comments?.length || 0) * 2 +
        (b.viewsCount || 0);

      return scoreB - scoreA;
    });

    res.json(posts);

  } catch (err) {
    console.error(
      "GET POSTS ERROR:",
      err
    );

    res.status(500).json({
      error: "Server error",
    });
  }
});

/* ================= LIKE ================= */

router.post(
  "/:id/like",
  verifyToken,
  async (req, res) => {
    try {
      const post = await Post.findById(
        req.params.id
      );

      if (!post) {
        return res.status(404).json({
          error: "Post not found",
        });
      }

      const alreadyLiked =
        post.likes.some(
          (id) =>
            id.toString() ===
            req.user.id
        );

      if (alreadyLiked) {
        post.likes =
          post.likes.filter(
            (id) =>
              id.toString() !==
              req.user.id
          );
      } else {
        post.likes.push(req.user.id);

        if (
          post.user.toString() !==
          req.user.id
        ) {
          const notification =
            await Notification.create({
              recipient: post.user,
              sender: req.user.id,
              type: "LIKE",
              post: post._id,
              text: "liked your post",
            });

          await notification.populate(
            "sender",
            "name profilePic"
          );

          io.to(
            post.user.toString()
          ).emit(
            "new-notification",
            notification
          );
        }
      }

      await post.save();

      io.emit("post-liked", {
        postId: post._id,
        likes: post.likes,
      });

      res.json({
        likes: post.likes,
      });

    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: err.message,
      });
    }
  }
);

/* ================= SHARE ================= */

router.post(
  "/:id/share",
  verifyToken,
  async (req, res) => {
    try {
      const post = await Post.findById(
        req.params.id
      );

      if (!post) {
        return res.status(404).json({
          error: "Post not found",
        });
      }

      post.shares =
        (post.shares || 0) + 1;

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
  }
);

/* ================= SAVE POST ================= */

router.put(
  "/:id/save",
  verifyToken,
  async (req, res) => {
    try {
      const post = await Post.findById(
        req.params.id
      );

      if (!post) {
        return res.status(404).json({
          error: "Post not found",
        });
      }

      if (!post.savedBy) {
        post.savedBy = [];
      }

      const alreadySaved =
        post.savedBy.some(
          (id) =>
            id.toString() ===
            req.user.id
        );

      if (alreadySaved) {
        post.savedBy =
          post.savedBy.filter(
            (id) =>
              id.toString() !==
              req.user.id
          );
      } else {
        post.savedBy.push(
          req.user.id
        );
      }

      await post.save();

      res.json({
        success: true,
        saved: !alreadySaved,
        savedBy: post.savedBy,
      });

    } catch (err) {
      console.error(
        "SAVE POST ERROR:",
        err
      );

      res.status(500).json({
        error: err.message,
      });
    }
  }
);

/* ================= DELETE POST ================= */

router.delete(
  "/:id",
  verifyToken,
  async (req, res) => {
    try {
      const post = await Post.findById(
        req.params.id
      );

      if (!post) {
        return res.status(404).json({
          error: "Post not found",
        });
      }

      if (
        post.user.toString() !==
        req.user.id
      ) {
        return res.status(403).json({
          error: "Not authorized",
        });
      }

      await Post.findByIdAndDelete(
        req.params.id
      );

      io.emit("post-deleted", {
        postId: req.params.id,
      });

      res.json({
        success: true,
      });

    } catch (err) {
      console.error(
        "DELETE POST ERROR:",
        err
      );

      res.status(500).json({
        error: err.message,
      });
    }
  }
);

/* ================= GET SINGLE POST ================= */

router.get("/:id", async (req, res) => {
  try {
    const post = await Post.findById(
      req.params.id
    )
      .populate("user", "name profilePic")
      .populate(
        "taggedFriends",
        "name profilePic"
      )
      .populate(
        "comments.user",
        "name profilePic"
      );

    if (!post) {
      return res.status(404).json({
        error: "Post not found",
      });
    }

    res.json(post);

  } catch (err) {
    console.error(
      "GET SINGLE POST ERROR:",
      err
    );

    res.status(500).json({
      error: "Server error",
    });
  }
});

router.post(
  "/:id/share-to-feed",
  verifyToken,
  sharePostToFeed
);


export const sharePostToFeed = async (req, res) => {
  try {
    const originalPost = await Post.findById(req.params.id);

    if (!originalPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    const newPost = await Post.create({
      user: req.user._id,
      content: `🔁 Shared: ${originalPost.content || ""}`,
      media: originalPost.media,
      sharedFrom: originalPost._id,
    });

    return res.json({ post: newPost });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Share failed" });
  }
};

export default router;