import express from "express";

import Story from "../models/Story.js";

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

router.post(
  "/view/:id",
  verifyToken,
  async (req, res) => {
    try {

      const story =
        await Story.findById(
          req.params.id
        );

      if (!story) {
        return res.status(404).json({
          error: "Story not found",
        });
      }

      const alreadyViewed =
        story.views.some(
          (id) =>
            id.toString() ===
            req.user._id.toString()
        );

      // only count unique views
      if (!alreadyViewed) {

        story.views.push(
          req.user._id
        );

        story.viewsCount += 1;

        // reward creator
        story.engagementPoints += 1;

        await story.save();

        io.emit("story-view", {
          storyId: story._id,
          viewsCount:
            story.viewsCount,
        });
      }

      res.json({
        success: true,
        viewsCount:
          story.viewsCount,
      });

    } catch (err) {

      console.error(
        "Story view error:",
        err
      );

      res.status(500).json({
        error:
          "Failed to record story view",
      });
    }
  }
);
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

      story.reactions.push({
        user: req.user._id,
        type: reaction,
      });

      // reward creator
      story.engagementPoints += 2;

      await story.save();

      io.emit("story-reacted", {
        storyId: story._id,
        reactions:
          story.reactions,
      });

      res.json({
        success: true,
      });
    } catch (err) {
      console.error(err);

      res.status(500).json({
        error: "Reaction failed",
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
        user: req.user._id,

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




export default router;