import express from "express";
import User from "../models/User.js";

const router = express.Router();

// GET /api/leaderboard - top users by points
router.get("/", async (req, res) => {
  try {
    // Find all users, sort by points descending, limit top 10
    const topUsers = await User.find()
      .select("name profilePic points")
      .sort({ points: -1 })
      .limit(10);

    res.json(topUsers);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;