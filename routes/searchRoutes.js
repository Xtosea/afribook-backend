import express from "express";
import User from "../models/User.js";
import Post from "../models/Post.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const search = req.query.q;

const users = await User.find({
name: { $regex: search, $options: "i" }
}).select("name profilePic");

res.json(users);

} catch (err) {

res.status(500).json({ error: "Server error" });

}
});

export default router;