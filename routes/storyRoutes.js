import express from "express";

import Story from "../models/Story.js";
import Post from "../models/Post.js";
import Wallet from "../models/Wallet.js";

import {
  verifyToken,
} from "../middleware/authMiddleware.js";

import { io } from "../server.js";

const router = express.Router();

/* ================= CREATE STORY ================= */

router.post(
  "/",
  verifyToken,
  async (req, res) => {

    try {

      const {
        media,
        caption,
      } = req.body;

      if (
        !media ||
        !media.length
      ) {
        return res.status(400).json({
          error: "Media required",
        });
      }

      const story =
        await Story.create({

          user: req.user.id,

          media,

          caption,

          expiresAt:
            new Date(
              Date.now() +
              24 * 60 * 60 * 1000
            ),
        });

      // IMPORTANT
      await story.populate(
        "user",
        "name profilePic"
      );

      io.emit(
        "new-story",
        story
      );

      res.status(201).json(
        story
      );

    } catch (err) {

      console.error(
        "Create story error:",
        err
      );

      res.status(500).json({
        error:
          "Failed to create story",
      });
    }
  }
);

/* ================= GET STORIES ================= */

router.get(
  "/",
  verifyToken,
  async (req, res) => {
    try {

      const stories =
        await Story.find({
          expiresAt: {
            $gt: new Date(),
          },
        })
          .populate(
            "user",
            "name profilePic"
          )
          .sort({
            createdAt: -1,
          });

      res.json(stories);

    } catch (err) {

      console.error(
        "GET STORIES ERROR:",
        err
      );

      res.status(500).json({
        error:
          "Failed to fetch stories",
      });
    }
  }
);


// ================= VIEW STORY =================

router.post("/view/:id", verifyToken, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({ error: "Story not found" });
    }

    const userId = req.user._id;

    const alreadyViewed = story.views.some(
      (id) => id.toString() === userId.toString()
    );

    if (!alreadyViewed) {
      story.views.push(userId);
      story.viewsCount += 1;
      story.engagementPoints += 1;

      await story.save();

      // ✅ wallet update (ONLY after successful save)
      await Wallet.findOneAndUpdate(
        { user: story.user },
        { $inc: { points: 1 } },
        { new: true }
      );

      io.emit("story-view", {
        storyId: story._id,
        viewsCount: story.viewsCount,
      });
    }

    return res.json({
      success: true,
      viewsCount: story.viewsCount,
    });

  } catch (err) {
    console.error("Story view error:", err);
    res.status(500).json({ error: "Failed to record story view" });
  }
});


// ================= REACT STORY =================

router.post(
  "/react/:id",
  verifyToken,
  async (req, res) => {

    try {

      const { reaction } = req.body;

      const story = await Story.findById(
        req.params.id
      );

      if (!story) {
        return res.status(404).json({
          error: "Story not found",
        });
      }

      // ensure reactions array exists
      if (!Array.isArray(story.reactions)) {
        story.reactions = [];
      }

      // remove previous reaction from same user
      story.reactions =
        story.reactions.filter(
          (r) =>
            r.user.toString() !==
            req.user._id.toString()
        );

      // add new reaction
      story.reactions.push({
        user: req.user._id,
        type: reaction,
      });

      // reward creator
      story.engagementPoints += 2;

      await story.save();

      // ✅ UPDATE WALLET
      await Wallet.findOneAndUpdate(
        { user: story.user },
        { $inc: { points: 2 } },
        { new: true }
      );

      // socket update
      io.emit(
        "story-reacted",
        {
          storyId: story._id,
          reactions: story.reactions,
        }
      );

      res.json({
        success: true,
        reactions: story.reactions,
      });

    } catch (err) {

      console.error(
        "Story reaction error:",
        err
      );

      res.status(500).json({
        error:
          "Failed to react to story",
      });
    }
  }
);

router.post(
  "/share/:id",
  verifyToken,
  async (req, res) => {
    try {
      const story = await Story.findById(
        req.params.id
      );

      if (!story) {
        return res.status(404).json({
          error: "Story not found",
        });
      }

      const newPost = await Post.create({
        user: req.user.id,

        content:
          story.caption ||
          "Shared a story",

        media: story.media,
      });

      story.shares += 1;

      story.engagementPoints += 3;

      await story.save();

      res.json({
        success: true,
        post: newPost,
      });
    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: "Share failed",
      });
    }
  }
);


// ================= REPLY STORY =================

router.post(
  "/reply/:id",
  verifyToken,
  async (req, res) => {
    try {
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({
          error: "Reply text required",
        });
      }

      const story =
        await Story.findById(
          req.params.id
        ).populate("user");

      if (!story) {
        return res.status(404).json({
          error: "Story not found",
        });
      }

      const reply = {
        user: req.user._id,
        text,
        createdAt: new Date(),
      };

      story.replies.push(reply);

      // reward creator
      story.engagementPoints += 3;

      await story.save();

      // send notification to story owner
      io.to(
        story.user._id.toString()
      ).emit("story-reply", {
        storyId: story._id,
        from: req.user._id,
        text,
      });

      res.json({
        success: true,
        reply,
      });

    } catch (err) {
      console.error(
        "Story reply error:",
        err
      );

      res.status(500).json({
        error:
          "Failed to reply to story",
      });
    }
  }
);


/* =========================
   STORY ANALYTICS
========================= */
router.get("/analytics/:id", verifyToken, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
      .populate("user", "name profilePic")
      .populate("views", "name profilePic")
      .populate("reactions.user", "name profilePic")
      .populate("replies.user", "name profilePic");

    if (!story) {
      return res.status(404).json({ error: "Story not found" });
    }

    /* ================= OWNER CHECK ================= */
    const ownerId = story.user?._id?.toString();
    const currentUserId = req.user._id.toString();

    if (ownerId !== currentUserId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    /* ================= REACTION BREAKDOWN ================= */
    const reactionSummary = {
      "❤️": 0,
      "😂": 0,
      "😮": 0,
      "😢": 0,
      "👍": 0,
      "🔥": 0,
    };

    story.reactions.forEach((r) => {
      if (reactionSummary[r.type] !== undefined) {
        reactionSummary[r.type]++;
      }
    });

    /* ================= METRICS ================= */
    const totalReactions = story.reactions?.length || 0;
    const totalReplies = story.replies?.length || 0;
    const totalShares = story.shares || 0;
    const views = story.viewsCount || 0;

    const engagementScore =
      totalReactions * 1 +
      totalReplies * 2 +
      totalShares * 3;

    const engagementRate =
      views > 0
        ? Number((engagementScore / views).toFixed(2))
        : 0;

    const viralScore =
      engagementScore + views * 0.1;

    /* ================= RESPONSE ================= */
    const analytics = {
      views,
      totalViewers: story.views?.length || 0,

      reactions: reactionSummary,
      totalReactions,

      replies: totalReplies,
      shares: totalShares,

      engagementScore,
      engagementRate,
      viralScore,

      engagementPoints: story.engagementPoints || 0,

      viewers: story.views || [],
      repliesList: story.replies || [],

      createdAt: story.createdAt,
    };

    res.json(analytics);
  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});
export default router;