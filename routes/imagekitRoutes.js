import express from "express";
import multer from "multer";
import { uploadImageKit } from "../controllers/imagekitController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", upload.single("file"), uploadImageKit);

export default router;