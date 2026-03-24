import express from "express";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { IKClient } from "imagekit";
import { io, redisClient } from "../server.js";

const router = express.Router();

/* ================= IMAGEKIT CONFIG ================= */
const imagekit = new IKClient({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

/* ================= UPDATE PROFILE ================= */
router.put("/:userId", verifyToken, async (req, res) => {
  try {
    if (req.user.id !== req.params.userId)
      return res.status(403).json({ error: "Unauthorized" });

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const updates = { ...req.body };

    // Upload Profile Picture
    if (req.files?.profilePic) {
      const file = req.files.profilePic;
      const upload = await imagekit.upload({
        file: file.data,
        fileName: file.name,
        folder: "/profile_uploads",
      });
      updates.profilePic = upload.url;
    }

    // Upload Cover Photo
    if (req.files?.coverPhoto) {
      const file = req.files.coverPhoto;
      const upload = await imagekit.upload({
        file: file.data,
        fileName: file.name,
        folder: "/cover_uploads",
      });
      updates.coverPhoto = upload.url;
    }

    const updatedUser = await User.findByIdAndUpdate(user._id, updates, { new: true });

    res.json({ message: "Profile updated successfully", user: updatedUser });
  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= FOLLOW / UNFOLLOW ================= */
router.put("/:id/follow", verifyToken, async (req, res) => {
  try {
    const userToFollow = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user.id);
    if (!userToFollow) return res.status(404).json({ error: "User not found" });

    let action = "";
    if (currentUser.following.includes(userToFollow._id)) {
      currentUser.following = currentUser.following.filter((id) => !id.equals(userToFollow._id));
      userToFollow.followers = userToFollow.followers.filter((id) => !id.equals(currentUser._id));
      currentUser.points -= 5;
      action = "UNFOLLOW";
    } else {
      currentUser.following.push(userToFollow._id);
      userToFollow.followers.push(currentUser._id);
      currentUser.points += 10;
      action = "FOLLOW";

      const notification = new Notification({
        recipient: userToFollow._id,
        sender: currentUser._id,
        type: "FOLLOW",
        text: `${currentUser.name} started following you`,
      });
      await notification.save();
      await notification.populate("sender", "name profilePic");
      io.to(userToFollow._id.toString()).emit("new-notification", notification);
    }

    await currentUser.save();
    await userToFollow.save();
    await redisClient.del("leaderboard:top");

    res.json({ message: "Action successful", points: currentUser.points, action });
  } catch (err) {
    console.error("FOLLOW ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= GET USER PROFILE ================= */
router.get("/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select("-password")
      .populate("followers", "name profilePic")
      .populate("following", "name profilePic");

    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("GET USER ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= GET FOLLOWERS ================= */
router.get("/:id/followers", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("followers", "name profilePic");
    res.json({ followers: user?.followers || [] });
  } catch (err) {
    console.error("GET FOLLOWERS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= GET FOLLOWING ================= */
router.get("/:id/following", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("following", "name profilePic");
    res.json({ following: user?.following || [] });
  } catch (err) {
    console.error("GET FOLLOWING ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;