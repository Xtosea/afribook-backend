import express from "express";
import Notification from "../models/Notification.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET notifications (with pagination)
router.get("/", verifyToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;

    const notifications = await Notification.find({
      recipient: req.user.id
    })
      .populate("sender", "name profilePic")
      .populate("post", "content media")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json(notifications);
  } catch (err) {
    console.error("GET NOTIFICATIONS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// MARK AS READ
router.put("/read", verifyToken, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, read: false },
      { read: true }
    );
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;