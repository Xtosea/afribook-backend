import express from "express";
import User from "../models/User.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";

const router = express.Router();

const uploadDir = "public/uploads/profiles";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

/* ================= MULTER SETUP ================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const field = file.fieldname; // profilePic or coverPhoto
    cb(null, `${req.user.id}-${field}-${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) return cb(new Error("Only image files allowed"), false);
  cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

/* ================= UPDATE PROFILE (TEXT + PROFILE + COVER) ================= */
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

      // Helper to resize image with sharp
      const processImage = async (file, width, height) => {
        const ext = path.extname(file.originalname);
        const filename = `${req.user.id}-${file.fieldname}-${Date.now()}${ext}`;
        const outputPath = path.join(uploadDir, filename);

        await sharp(file.path)
          .resize(width, height, { fit: "cover" })
          .toFile(outputPath);

        fs.unlinkSync(file.path); // delete original
        return `/uploads/profiles/${filename}`;
      };

      // Update profilePic
      if (req.files?.profilePic) {
        if (user.profilePic) {
          const oldPath = path.join(uploadDir, path.basename(user.profilePic));
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        user.profilePic = await processImage(req.files.profilePic[0], 400, 400); // square
      }

      // Update coverPhoto
      if (req.files?.coverPhoto) {
        if (user.coverPhoto) {
          const oldPath = path.join(uploadDir, path.basename(user.coverPhoto));
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        user.coverPhoto = await processImage(req.files.coverPhoto[0], 1200, 400); // landscape
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

export default router;