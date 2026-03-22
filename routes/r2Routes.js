import express from "express";
import multer from "multer";
import { uploadVideo } from "../controllers/r2Controller.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/upload", upload.single("video"), uploadVideo);

export default router;