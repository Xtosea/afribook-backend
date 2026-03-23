import express from "express";
import User from "../models/User.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { redisClient } from "../server.js";
import { io } from "../server.js";
import Notification from "../models/Notification.js";

const router = express.Router();

/* ================= PATH SETUP ================= */
const uploadDir = path.join(process.cwd(), "public/uploads/profiles");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

/* ================= MULTER ================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const field = file.fieldname;
    cb(null, `${req.user.id}-${field}-${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) return cb(new Error("Only images allowed"), false);
  cb(null, true);
};

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter });

/* ================= UPDATE PROFILE ================= */
router.put(
  "/:userId",
  verifyToken,
  upload.fields([{ name: "profilePic", maxCount: 1 }, { name: "coverPhoto", maxCount: 1 }]),
  async (req, res) => {
    try {
      if (req.user.id !== req.params.userId) return res.status(403).json({ error: "Unauthorized" });

      const user = await User.findById(req.params.userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      // ====== TEXT FIELDS ======
      const fields = [
        "name",
        "bio",
        "intro",
        "dob",
        "phone",
        "education",
        "origin",
        "maritalStatus",
        "email",
      ];

      fields.forEach((f) => {
        if (req.body[f] !== undefined) user[f] = req.body[f];
      });

      // ====== IMAGE PROCESSING ======
      const processImage = async (file, width, height) => {
        const ext = path.extname(file.originalname);
        const filename = `${req.user.id}-${file.fieldname}-${Date.now()}${ext}`;
        const outputPath = path.join(uploadDir, filename);

        await sharp(file.path).resize(width, height, { fit: "cover" }).toFile(outputPath);
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return `/uploads/profiles/${filename}`;
      };

      if (req.files?.profilePic) {
        if (user.profilePic) {
          const oldFile = path.join(uploadDir, path.basename(user.profilePic));
          if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
        }
        user.profilePic = await processImage(req.files.profilePic[0], 400, 400);
      }

      if (req.files?.coverPhoto) {
        if (user.coverPhoto) {
          const oldFile = path.join(uploadDir, path.basename(user.coverPhoto));
          if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
        }
        user.coverPhoto = await processImage(req.files.coverPhoto[0], 1200, 400);
      }

      await user.save();
      const updatedUser = await User.findById(user._id).select("-password");

      res.json({ message: "Profile updated successfully", user: updatedUser });
    } catch (err) {
      console.error("UPDATE PROFILE ERROR:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

/* ================= FOLLOW / UNFOLLOW ================= */
router.put("/:id/follow", verifyToken, async (req, res) => {
  try {
    const userToFollow = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user.id);

    if (!userToFollow) return res.status(404).json({ error: "User not found" });

    let action = "";
    if (currentUser.following.includes(userToFollow._id)) {
      // UNFOLLOW
      currentUser.following = currentUser.following.filter(id => !id.equals(userToFollow._id));
      userToFollow.followers = userToFollow.followers.filter(id => !id.equals(currentUser._id));
      currentUser.points -= 5;
      action = "UNFOLLOW";
    } else {
      // FOLLOW
      currentUser.following.push(userToFollow._id);
      userToFollow.followers.push(currentUser._id);
      currentUser.points += 10;
      action = "FOLLOW";

      // Live notification
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

    // Invalidate leaderboard cache
    await redisClient.del("leaderboard:top");

    res.json({ message: "Action successful", points: currentUser.points, action });
  } catch (err) {
    console.error("FOLLOW ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= GET USER ================= */
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

/* ================= FOLLOWERS ================= */
router.get("/:id/followers", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("followers", "name profilePic");
    res.json({ followers: user?.followers || [] });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= FOLLOWING ================= */
router.get("/:id/following", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("following", "name profilePic");
    res.json({ following: user?.following || [] });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;