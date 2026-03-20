// /routes/cloudinaryRoutes.js
import express from "express";
import multer from "multer";
import { uploadPostImage } from "../controllers/cloudinaryController.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/upload", upload.single("image"), uploadPostImage);

export default router;