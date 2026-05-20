import express from "express";
import Notification from "../models/Notification.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET NOTIFICATIONS
router.get("/", verifyToken, async (req, res) => {
  try {
    const notifications =
      await Notification.find({
        recipient: req.user.id,
      })
        .populate(
          "sender",
          "name profilePic"
        )
        .populate(
          "post",
          "content media"
        )
        .sort({ createdAt: -1 });

    res.json(notifications);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Server error",
    });
  }
});

// MARK ALL READ
router.put(
  "/read",
  verifyToken,
  async (req, res) => {
    try {
      await Notification.updateMany(
        {
          recipient: req.user.id,
          read: false,
        },
        {
          read: true,
        }
      );

      res.json({
        message:
          "Notifications marked as read",
      });
    } catch (err) {
      res.status(500).json({
        error: "Server error",
      });
    }
  }
);


router.get(
  "/unread-count",
  verifyToken,
  async (req, res) => {
    try {
      const count =
        await Notification.countDocuments({
          recipient: req.user.id,
          read: false,
        });

      res.json({ count });
    } catch (err) {
      res.status(500).json({
        error: "Server error",
      });
    }
  }
);

export default router;