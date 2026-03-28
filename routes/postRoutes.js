// routes/postRoutes.js
import express from "express";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import Notification from "../models/Notification.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { io } from "../server.js";

const router = express.Router();

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

/* ================= GET ALL POSTS ================= */
router.get("/", verifyToken, async (req, res) => {
  try {
    let posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate("user", "name profilePic")
      .populate("taggedFriends", "name profilePic")
      .populate("comments.user", "name profilePic");

    /* Smart Feed Ranking */
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

/* ================= GET USER POSTS ================= */
router.get("/user/:userId", verifyToken, async (req, res) => {
  try {
    const posts = await Post.find({
      user: req.params.userId,
    })
      .sort({ createdAt: -1 })
      .populate("user", "name profilePic")
      .populate("taggedFriends", "name profilePic");

    res.json(posts);
  } catch (err) {
    console.error("GET USER POSTS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= GET SINGLE POST ================= */
router.get("/:postId", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId)
      .populate("user", "name profilePic")
      .populate("taggedFriends", "name profilePic")
      .populate("comments.user", "name profilePic");

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json(post);
  } catch (err) {
    console.error("GET SINGLE POST ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= REACTION ================= */
router.put("/:postId/reaction", verifyToken, async (req, res) => {
  try {
    const { type } = req.body;

    const post = await Post.findById(req.params.postId);

    const existing = post.reactions.find(
      (r) => r.user.toString() === req.user.id
    );

    if (existing) {
      existing.type = type;
    } else {
      post.reactions.push({
        user: req.user.id,
        type,
      });
    }

    await post.save();

    res.json(post.reactions);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= LIKE ================= */
router.put("/:postId/like", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    const liked = post.likes.includes(req.user.id);

    post.likes = liked
      ? post.likes.filter(
          (id) => id.toString() !== req.user.id
        )
      : [...post.likes, req.user.id];

    await post.save();

    /* Notification */
    if (!liked) {
      const notification = new Notification({
        recipient: post.user,
        sender: req.user.id,
        type: "LIKE",
        post: post._id,
        text: `${req.user.name} liked your post`,
      });

      await notification.save();

      await notification.populate(
        "sender",
        "name profilePic"
      );

      io.to(post.user.toString()).emit(
        "new-notification",
        notification
      );
    }

    res.json({
      likesCount: post.likes.length,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= COMMENT ================= */
router.post("/:postId/comment", verifyToken, async (req, res) => {
  try {
    const { text } = req.body;

    const post = await Post.findById(
      req.params.postId
    );

    const comment = new Comment({
      post: post._id,
      user: req.user.id,
      text,
    });

    await comment.save();

    await comment.populate(
      "user",
      "name profilePic"
    );

    /* Notification */
    const notification = new Notification({
      recipient: post.user,
      sender: req.user.id,
      type: "COMMENT",
      post: post._id,
      text: `${req.user.name} commented on your post`,
    });

    await notification.save();

    await notification.populate(
      "sender",
      "name profilePic"
    );

    io.to(post.user.toString()).emit(
      "new-notification",
      notification
    );

    res.status(201).json({
      comment,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= SHARE ================= */
router.post("/:postId/share", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(
      req.params.postId
    );

    post.shares = (post.shares || 0) + 1;

    await post.save();

    res.json({
      shares: post.shares,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= VIEW TRACKING ================= */
router.put("/:postId/view", async (req, res) => {
  try {
    const post = await Post.findById(
      req.params.postId
    );

    post.views = (post.views || 0) + 1;

    await post.save();

    res.json({
      views: post.views,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= DELETE POST ================= */
router.delete("/:postId", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(
      req.params.postId
    );

    if (
      post.user.toString() !== req.user.id
    ) {
      return res
        .status(403)
        .json({ error: "Unauthorized" });
    }

    await post.deleteOne();

    res.json({
      message: "Post deleted",
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= EDIT POST ================= */
router.put("/:postId", verifyToken, async (req, res) => {
  try {
    const { content } = req.body;

    const post = await Post.findById(
      req.params.postId
    );

    if (
      post.user.toString() !== req.user.id
    ) {
      return res
        .status(403)
        .json({ error: "Unauthorized" });
    }

    post.content = content;

    await post.save();

    res.json(post);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= SAVE POST ================= */
router.put("/:postId/save", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(
      req.params.postId
    );

    const saved = post.savedBy?.includes(
      req.user.id
    );

    post.savedBy = saved
      ? post.savedBy.filter(
          (id) =>
            id.toString() !== req.user.id
        )
      : [...(post.savedBy || []), req.user.id];

    await post.save();

    res.json({
      saved: !saved,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= REPORT POST ================= */
router.post("/:postId/report", verifyToken, async (req, res) => {
  try {
    const { reason } = req.body;

    const post = await Post.findById(
      req.params.postId
    );

    post.reports = post.reports || [];

    post.reports.push({
      user: req.user.id,
      reason,
    });

    await post.save();

    res.json({
      message: "Reported",
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;