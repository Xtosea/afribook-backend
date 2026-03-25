// routes/leaderboardRoutes.js
import express from "express";
import User from "../models/User.js";

const router = express.Router();

/* ================= TOP USERS LEADERBOARD ================= */
router.get("/top", async (req, res) => {
  try {
    const topUsers = await User.find()
      .sort({ points: -1 })
      .limit(20)
      .select("name profilePic points");

    res.json(topUsers);
  } catch (err) {
    console.error("LEADERBOARD ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;