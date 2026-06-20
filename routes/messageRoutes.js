import express from "express";
import Message from "../models/Message.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { sendNotification } from "../utils/sendNotification.js";
import User from "../models/User.js";


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

    const senderId =
      req.user._id || req.user.id;

    const messageData = {
      sender: senderId,
      receiver,
      text: text || "",
    };

    // Only add media fields when media exists
    if (media) {
      messageData.media = media;
      messageData.mediaType = mediaType;
    }

    const message =
      await Message.create(messageData);

    const populatedMessage =
      await Message.findById(message._id)
        .populate(
          "sender",
          "name profilePic"
        );

    try {
      const senderUser =
        await User.findById(senderId)
          .select("name");

      await sendNotification({
        recipient: receiver,
        sender: senderId,
        type: "MESSAGE",
        text: `${
          senderUser?.name || "Someone"
        } sent you a message`,
      });
    } catch (notificationError) {
      console.log(
        "NOTIFICATION ERROR:",
        notificationError
      );
    }

    return res.json(
      populatedMessage
    );
  } catch (err) {
  console.log("========== MESSAGE ERROR ==========");
  console.log(err);
  console.log("MESSAGE:", err.message);
  console.log("STACK:", err.stack);

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