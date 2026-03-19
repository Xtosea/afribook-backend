import express from "express";
import User from "../models/User.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

/* ================= MULTER SETUP ================= */
const uploadDir = "public/uploads/profiles";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const field = file.fieldname; // profilePic or coverPhoto
    cb(null, `${req.user.id}-${field}-${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Only image files allowed"), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter,
});

/* ================= GET USER INFO ================= */
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

/* ================= GET FRIENDS ================= */
router.get("/friends/:userId", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate(
      "following",
      "name profilePic"
    );
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user.following);
  } catch (err) {
    console.error("GET FRIENDS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= FOLLOW / UNFOLLOW ================= */
router.put("/:id/follow", verifyToken, async (req, res) => {
  try {
    const userToFollow = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user.id);

    if (!userToFollow) return res.status(404).json({ error: "User not found" });

    if (currentUser.following.includes(userToFollow._id)) {
      // UNFOLLOW
      currentUser.following = currentUser.following.filter(
        (id) => !id.equals(userToFollow._id)
      );
      userToFollow.followers = userToFollow.followers.filter(
        (id) => !id.equals(currentUser._id)
      );
      currentUser.points -= 5;
    } else {
      // FOLLOW
      currentUser.following.push(userToFollow._id);
      userToFollow.followers.push(currentUser._id);
      currentUser.points += 10;
    }

    await currentUser.save();
    await userToFollow.save();

    res.json({
      message: "Action successful",
      points: currentUser.points,
    });
  } catch (err) {
    console.error("FOLLOW ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= UPDATE PROFILE (PROFILE + COVER) ================= */
router.put(
  "/:userId",
  verifyToken,
  upload.fields([
    { name: "profilePic", maxCount: 1 },
    { name: "coverPhoto", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      if (req.user.id !== req.params.userId)
        return res.status(403).json({ error: "Unauthorized" });

      const user = await User.findById(req.params.userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      // Update text fields
      if (req.body.bio !== undefined) user.bio = req.body.bio;
      if (req.body.intro !== undefined) user.intro = req.body.intro;

      // Update profile picture
      if (req.files?.profilePic) {
        if (user.profilePic) {
          const oldPath = path.join(uploadDir, path.basename(user.profilePic));
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        user.profilePic = `/uploads/profiles/${req.files.profilePic[0].filename}`;
      }

      // Update cover photo
      if (req.files?.coverPhoto) {
        if (user.coverPhoto) {
          const oldPath = path.join(uploadDir, path.basename(user.coverPhoto));
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        user.coverPhoto = `/uploads/profiles/${req.files.coverPhoto[0].filename}`;
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

/* ================= GET FOLLOWERS ================= */
router.get("/:id/followers", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate(
      "followers",
      "name profilePic"
    );
    res.json({ followers: user?.followers || [] });
  } catch (err) {
    console.error("GET FOLLOWERS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================= GET FOLLOWING ================= */
router.get("/:id/following", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate(
      "following",
      "name profilePic"
    );
    res.json({ following: user?.following || [] });
  } catch (err) {
    console.error("GET FOLLOWING ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;