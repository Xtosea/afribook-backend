import express from "express";
import User from "../models/User.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const topUsers = await User.find()
      .select("name profilePic points")
      .sort({ points: -1 })
      .limit(10);

    res.json(topUsers);
  } catch (err) {
    console.error("LEADERBOARD ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;