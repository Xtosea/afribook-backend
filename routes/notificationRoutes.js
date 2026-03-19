import express from "express";
import Notification from "../models/Notification.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET notifications
router.get("/", verifyToken, async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipient: req.user.id
    })
      .populate("sender", "name profilePic")
      .sort({ createdAt: -1 });

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// MARK AS READ
router.put("/read", verifyToken, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id },
      { read: true }
    );
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;