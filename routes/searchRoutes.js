import express from "express";
import User from "../models/User.js";
import Post from "../models/Post.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const q = req.query.q || "";

    const users = await User.find({
      name: { $regex: q, $options: "i" }
    }).select("name profilePic");

    const posts = await Post.find({
      content: { $regex: q, $options: "i" }
    }).populate("user", "name profilePic");

    res.json({ users, posts });
  } catch (err) {
    console.error("SEARCH ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;