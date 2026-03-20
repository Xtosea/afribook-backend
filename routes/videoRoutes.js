// /routes/videoRoutes.js
import express from "express";
import multer from "multer";
import { uploadVideo } from "../controllers/videoController.js";

const router = express.Router();
const upload = multer();

router.post("/upload", upload.single("video"), uploadVideo);

export default router;