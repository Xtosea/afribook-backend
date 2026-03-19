import express from "express";
import User from "../models/User.js";
import Post from "../models/Post.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const q = req.query.q;

  const users = await User.find({
    name: { $regex: q, $options: "i" }
  }).select("name profilePic");

  const posts = await Post.find({
    content: { $regex: q, $options: "i" }
  }).populate("user", "name profilePic");

  res.json({ users, posts });
});

export default router;