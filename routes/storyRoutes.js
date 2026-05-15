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
        return res
          .status(400)
          .json({
            error:
              "Media required",
          });
      }

      const story =
        await Story.create({
          user: req.user.id,

          media,

          caption:
            caption || "",

          expiresAt:
            new Date(
              Date.now() +
                24 *
                  60 *
                  60 *
                  1000
            ),
        });

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
        "CREATE STORY ERROR:",
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

export default router;