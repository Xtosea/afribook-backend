import express from "express";
import Message from "../models/Message.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ================= SEND MESSAGE ================= */

router.post(
  "/",
  verifyToken,
  async (req, res) => {
    try {
      const {
        receiver,
        text,
        media,
        mediaType,
      } = req.body;

      const message =
        await Message.create({
          sender: req.user.id,
          receiver,
          text: text || "",
          media: media || "",
          mediaType:
            mediaType || "",
        });

      // populate sender
      const populatedMessage =
        await Message.findById(
          message._id
        ).populate(
          "sender",
          "name profilePic"
        );

      res.json(populatedMessage);
    } catch (err) {
      console.log(err);

      res.status(500).json({
        error:
          "Failed to send message",
      });
    }
  }
);

/* ================= GET MESSAGES ================= */

router.get(
  "/:userId",
  verifyToken,
  async (req, res) => {
    try {
      const messages =
        await Message.find({
          $or: [
            {
              sender: req.user.id,
              receiver:
                req.params.userId,
            },
            {
              sender:
                req.params.userId,
              receiver:
                req.user.id,
            },
          ],
        })
          .sort({ createdAt: 1 })
          .populate(
            "sender",
            "name profilePic"
          );

      res.json(messages);
    } catch (err) {
      console.log(err);

      res.status(500).json({
        error:
          "Failed to load messages",
      });
    }
  }
);

export default router;