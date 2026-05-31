import express from "express";
import Message from "../models/Message.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { sendNotification } from "../utils/sendNotification.js";

const router = express.Router();

/* ================= SEND MESSAGE ================= */
router.post("/", verifyToken, async (req, res) => {
  try {
    console.log("BODY:", req.body);
    console.log("USER:", req.user);

    const { receiver, text, media, mediaType } = req.body;

    if (!receiver) {
      return res.status(400).json({
        error: "Receiver is required",
      });
    }

    const message = await Message.create({
      sender: req.user._id || req.user.id,
      receiver,
      text: text || "",
      media: media || "",
      mediaType: mediaType || "",
    });

    const populatedMessage = await Message.findById(message._id).populate(
      "sender",
      "name profilePic"
    );

    // 🔔 FIXED NOTIFICATION
    await sendNotification({
      recipient: receiver,
      sender: req.user._id || req.user.id,
      type: "MESSAGE",
      text: "sent you a message",
    });

    return res.json(populatedMessage);
  } catch (err) {
    console.log("SEND MESSAGE ERROR:", err);

    return res.status(500).json({
      error: "Failed to send message",
      details: err.message,
    });
  }
});

/* ================= GET MESSAGES ================= */
router.get("/:userId", verifyToken, async (req, res) => {
  try {
    const currentUserId = req.user._id || req.user.id;

    const messages = await Message.find({
      $or: [
        {
          sender: currentUserId,
          receiver: req.params.userId,
        },
        {
          sender: req.params.userId,
          receiver: currentUserId,
        },
      ],
    })
      .sort({ createdAt: 1 })
      .populate("sender", "name profilePic");

    return res.json(messages);
  } catch (err) {
    console.log("LOAD MESSAGE ERROR:", err);

    return res.status(500).json({
      error: "Failed to load messages",
    });
  }
});

export default router;