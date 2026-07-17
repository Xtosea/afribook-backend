import express from "express";
import Notification from "../models/Notification.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// ================= GET NOTIFICATIONS =================

router.get("/", verifyToken, async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipient: req.user.id,
    })
      .populate(
        "sender",
        "name profilePic verified"
      )
      .populate(
        "senders",
        "name profilePic verified"
      )
      .populate({
        path: "post",
        select:
          "content media images video thumbnail thumbnailUrl user createdAt",
        populate: {
          path: "user",
          select: "name profilePic verified",
        },
      })
      .sort({ createdAt: -1 });

    res.json(notifications);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Server error",
    });

  }
});

// ================= MARK READ =================

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

      console.error(err);

      res.status(500).json({
        error: "Server error",
      });

    }

  }
);

// ================= UNREAD COUNT =================

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

      res.json({
        count,
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error: "Server error",
      });

    }

  }
);

export default router;