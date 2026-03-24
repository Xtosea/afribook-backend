import express from "express";
import User from "../models/User.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { IKClient } from "imagekit";

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

    // ====== UPLOAD PROFILE PICTURE ======
    if (req.files?.profilePic) {
      const file = req.files.profilePic;
      const upload = await imagekit.upload({
        file: file.data, // express-fileupload buffer
        fileName: file.name,
        folder: "/profile_uploads",
      });
      updates.profilePic = upload.url;
    }

    // ====== UPLOAD COVER PHOTO ======
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

export default router;