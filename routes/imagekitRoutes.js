import express from "express";
import multer from "multer";
import ImageKit from "imagekit";
import { uploadImageKit } from "../controllers/imagekitController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/* ================= IMAGEKIT CONFIG ================= */
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

/* ================= AUTH ROUTE (FOR FRONTEND UPLOAD) ================= */
router.get("/auth", (req, res) => {
  try {
    const result = imagekit.getAuthenticationParameters();
    res.json(result);
  } catch (error) {
    console.error("ImageKit auth error:", error);
    res.status(500).json({ error: "ImageKit auth failed" });
  }
});

/* ================= UPLOAD ROUTE (OPTIONAL BACKEND UPLOAD) ================= */
router.post("/upload", upload.single("file"), uploadImageKit);

export default router;